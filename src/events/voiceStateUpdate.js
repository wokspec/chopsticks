// events/voiceStateUpdate.js
// EXECUTION-ONLY EVENT HANDLER
// No direct domain mutation. No persistence.

import { ChannelType, PermissionsBitField } from "discord.js";
import { getVoiceState } from "../tools/voice/schema.js";
import {
  registerTempChannel,
  removeTempChannel,
  findUserTempChannel,
  acquireCreationLock,
  releaseCreationLock,
  canCreateTempChannel,
  markTempChannelCreated
} from "../tools/voice/state.js";

export default {
  name: "voiceStateUpdate",

  async execute(oldState, newState) {
    const guild = newState.guild ?? oldState.guild;
    if (!guild) return;

    const member = newState.member ?? oldState.member;
    if (!member) return;
    if (member.user?.bot) return;

    const oldChannel = oldState.channel ?? null;
    const newChannel = newState.channel ?? null;

    if (oldChannel?.id === newChannel?.id) return;

    const voice = await getVoiceState(guild.id);
    if (!voice) return;

    voice.tempChannels ??= {};
    voice.lobbies ??= {};

    /* ---------- LEAVE TEMP ---------- */

    if (oldChannel && voice.tempChannels[oldChannel.id]) {
      const channel = guild.channels.cache.get(oldChannel.id) ?? null;
      const empty = channel ? channel.members.size === 0 : true;

      if (!channel || empty) {
        await removeTempChannel(guild.id, oldChannel.id, voice);
        if (channel) {
          await channel.delete().catch(() => {});
        }
      }
    }

    /* ---------- JOIN LOBBY ---------- */

    if (!newChannel) return;

    const lobby = voice.lobbies[newChannel.id];
    if (!lobby || lobby.enabled !== true) return;

    const category = guild.channels.cache.get(lobby.categoryId) ?? null;
    if (!category || category.type !== ChannelType.GuildCategory) return;
    const me = guild.members.me;
    if (me) {
      const perms = category.permissionsFor(me);
      if (!perms?.has(PermissionsBitField.Flags.ManageChannels)) return;
      if (!perms?.has(PermissionsBitField.Flags.MoveMembers)) return;
    }

    const lockId = `${newChannel.id}:${member.id}`;
    const acquired = acquireCreationLock(guild.id, lockId);
    if (!acquired) return;

    try {
      const existing = await findUserTempChannel(
        guild.id,
        member.id,
        newChannel.id,
        voice
      );

      if (existing) {
        const ch = guild.channels.cache.get(existing) ?? null;
        if (ch) {
          await member.voice.setChannel(ch).catch(() => {});
          return;
        }
        // stale record
        await removeTempChannel(guild.id, existing, voice);
      }

      const cooldownMs = Number(process.env.VOICE_CREATE_COOLDOWN_MS ?? 0);
      if (!canCreateTempChannel(guild.id, member.id, cooldownMs)) return;

      const nameRaw =
        typeof lobby.nameTemplate === "string"
          ? lobby.nameTemplate.replace("{user}", member.displayName)
          : member.displayName;
      const name = nameRaw.slice(0, 90);

      const desiredBitrate =
        Number.isFinite(lobby.bitrateKbps) && lobby.bitrateKbps
          ? Math.trunc(lobby.bitrateKbps) * 1000
          : null;
      const maxBitrate = Number.isFinite(guild.maximumBitrate) ? guild.maximumBitrate : null;
      const bitrate = desiredBitrate && maxBitrate ? Math.min(desiredBitrate, maxBitrate) : desiredBitrate;

      // Enforce optional maxChannels per lobby if present
      if (Number.isInteger(lobby.maxChannels) && lobby.maxChannels > 0) {
        let count = 0;
        for (const temp of Object.values(voice.tempChannels)) {
          if (temp.lobbyId === newChannel.id) count++;
        }
        if (count >= lobby.maxChannels) return;
      }

      const channel = await guild.channels
        .create({
          name,
          type: ChannelType.GuildVoice,
          parent: category.id,
          bitrate: bitrate ?? undefined,
          userLimit: Number.isFinite(lobby.userLimit) ? Math.max(0, Math.trunc(lobby.userLimit)) : 0,
          permissionOverwrites: [
            {
              id: member.id,
              allow: [
                PermissionsBitField.Flags.ManageChannels,
                PermissionsBitField.Flags.MoveMembers
              ]
            }
          ]
        })
        .catch(() => null);

      if (!channel) return;

      await registerTempChannel(
        guild.id,
        channel.id,
        member.id,
        newChannel.id,
        voice
      );
      markTempChannelCreated(guild.id, member.id);

      await member.voice.setChannel(channel).catch(() => {});
    } finally {
      releaseCreationLock(guild.id, lockId);
    }
  }
};
