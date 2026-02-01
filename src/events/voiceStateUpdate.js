// src/events/voiceStateUpdate.js
import { ChannelType, PermissionsBitField } from "discord.js";
import { loadGuildData, saveGuildData } from "../utils/storage.js";

export default {
  name: "voiceStateUpdate",

  async execute(oldState, newState) {
    const guild = newState.guild ?? oldState.guild;
    if (!guild) return;

    const guildId = guild.id;
    const member = newState.member ?? oldState.member;
    if (!member) return;

    const data = loadGuildData(guildId);

    // --- NORMALIZE STORAGE (one-time safety) ---
    const voice = data.voice ?? { lobbies: {}, tempChannels: {} };
    data.voice = voice;

    const oldChannelId = oldState.channelId;
    const newChannelId = newState.channelId;

    // ======================================================
    // JOIN LOBBY → CREATE (ENFORCE ONE TEMP PER USER)
    // ======================================================
    if (newChannelId && newChannelId !== oldChannelId) {
      const lobby = voice.lobbies[newChannelId];
      if (!lobby) return;

      // If user already owns a temp channel, move them there instead
      const existingTempId = Object.entries(voice.tempChannels)
        .find(([, v]) => v.ownerId === member.id)?.[0];

      if (existingTempId) {
        const existing = guild.channels.cache.get(existingTempId);
        if (existing) {
          await member.voice.setChannel(existing).catch(() => {});
          return;
        }
      }

      const channel = await guild.channels.create({
        name: lobby.nameTemplate
          ? lobby.nameTemplate.replace("{user}", member.user.username)
          : `${member.user.username}'s room`,
        type: ChannelType.GuildVoice,
        parent: lobby.categoryId,
        permissionOverwrites: [
          {
            id: member.id,
            allow: [
              PermissionsBitField.Flags.ManageChannels,
              PermissionsBitField.Flags.MoveMembers
            ]
          }
        ]
      });

      voice.tempChannels[channel.id] = {
        ownerId: member.id,
        lobbyId: newChannelId
      };

      saveGuildData(guildId, data);
      await member.voice.setChannel(channel).catch(() => {});
      return;
    }

    // ======================================================
    // LEAVE TEMP → DELETE IF EMPTY
    // ======================================================
    if (oldChannelId && oldChannelId !== newChannelId) {
      const temp = voice.tempChannels[oldChannelId];
      if (!temp) return;

      const channel = guild.channels.cache.get(oldChannelId);
      if (!channel) {
        delete voice.tempChannels[oldChannelId];
        saveGuildData(guildId, data);
        return;
      }

      if (channel.members.size === 0) {
        delete voice.tempChannels[oldChannelId];
        saveGuildData(guildId, data);
        await channel.delete().catch(() => {});
      }
    }
  }
};
