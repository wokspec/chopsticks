// src/commands/music.js
import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits
} from "discord.js";
import {
  ensureSessionAgent,
  getSessionAgent,
  releaseSession,
  sendAgentCommand,
  formatMusicError
} from "../music/service.js";
import { getMusicConfig, setDefaultMusicMode } from "../music/config.js";
import { auditLog } from "../utils/audit.js";

export const data = new SlashCommandBuilder()
  .setName("music")
  .setDescription("Voice-channel music (agent-backed, one session per voice channel)")
  .addSubcommand(s =>
    s
      .setName("play")
      .setDescription("Play or queue a track in your current voice channel")
      .addStringOption(o => o.setName("query").setDescription("Search or URL").setRequired(true))
  )
  .addSubcommand(s => s.setName("skip").setDescription("Skip current track"))
  .addSubcommand(s => s.setName("pause").setDescription("Pause playback"))
  .addSubcommand(s => s.setName("resume").setDescription("Resume playback"))
  .addSubcommand(s => s.setName("stop").setDescription("Stop playback"))
  .addSubcommand(s => s.setName("now").setDescription("Show current track"))
  .addSubcommand(s => s.setName("queue").setDescription("Show the queue for this voice channel"))
  .addSubcommand(s =>
    s
      .setName("mode")
      .setDescription("Set session mode (open or DJ)")
      .addStringOption(o =>
        o
          .setName("mode")
          .setDescription("open = anyone can control, dj = owner-only")
          .setRequired(true)
          .addChoices(
            { name: "open", value: "open" },
            { name: "dj", value: "dj" }
          )
      )
  )
  .addSubcommand(s =>
    s
      .setName("default")
      .setDescription("Set default mode for this server (requires Manage Server)")
      .addStringOption(o =>
        o
          .setName("mode")
          .setDescription("Default mode for new sessions")
          .setRequired(true)
          .addChoices(
            { name: "open", value: "open" },
            { name: "dj", value: "dj" }
          )
      )
  )
  .addSubcommand(s =>
    s
      .setName("volume")
      .setDescription("Set volume (0-150)")
      .addIntegerOption(o =>
        o.setName("level").setDescription("0-150").setRequired(true).setMinValue(0).setMaxValue(150)
      )
  )
  .addSubcommand(s => s.setName("status").setDescription("Show session status"));

function requireVoice(interaction) {
  const member = interaction.member;
  const vc = member?.voice?.channel ?? null;
  if (!vc) return { ok: false, vc: null };
  return { ok: true, vc };
}

function buildRequester(user) {
  return {
    id: user.id,
    username: user.username,
    discriminator: user.discriminator,
    avatar: user.avatar
  };
}

async function safeDeferEphemeral(interaction) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    return { ok: true };
  } catch (err) {
    const code = err?.code;
    if (code === 10062) return { ok: false, reason: "unknown-interaction" };
    throw err;
  }
}

function makeEmbed(title, description, fields = [], url = null, thumbnail_url = null, color = null, footer = null) {
  const e = new EmbedBuilder().setTitle(title).setDescription(description ?? "");
  if (Array.isArray(fields) && fields.length) e.addFields(fields);
  if (url) e.setURL(url);
  if (thumbnail_url) e.setThumbnail(thumbnail_url);
  if (color) e.setColor(color);
  if (footer) e.setFooter(footer);
  return e;
}

function formatDisconnectField(result) {
  const at = Number(result?.disconnectAt);
  const ms = Number(result?.disconnectInMs);

  if (Number.isFinite(at) && at > 0) {
    return {
      name: "Disconnect",
      value: `<t:${Math.trunc(at)}:R>`,
      inline: true
    };
  }

  if (Number.isFinite(ms) && ms > 0) {
    const at2 = Math.floor((Date.now() + ms) / 1000);
    return {
      name: "Disconnect",
      value: `<t:${at2}:R>`,
      inline: true
    };
  }

  return null;
}

function actionLabel(sub, action) {
  const a = String(action ?? "");

  if (sub === "pause") {
    if (a === "paused") return "Paused";
    if (a === "already-paused") return "Already paused";
    if (a === "nothing-playing") return "Nothing playing";
    if (a === "stopping") return "Stopping";
    return `Pause: ${a || "unknown"}`;
  }

  if (sub === "resume") {
    if (a === "resumed") return "Resumed";
    if (a === "already-playing") return "Already playing";
    if (a === "nothing-playing") return "Nothing playing";
    if (a === "stopping") return "Stopping";
    return `Resume: ${a || "unknown"}`;
  }

  if (sub === "skip") {
    if (a === "skipped") return "Skipped";
    if (a === "stopped") return "Stopped";
    if (a === "nothing-to-skip") return "Nothing to skip";
    if (a === "stopping") return "Stopping";
    return `Skip: ${a || "unknown"}`;
  }

  if (sub === "stop") {
    if (a === "stopped") return "Stopped";
    if (a === "stopping") return "Stopping";
    return `Stop: ${a || "unknown"}`;
  }

  return a || "Done";
}

export async function execute(interaction) {
  const guildId = interaction.guildId;
  const userId = interaction.user.id;
  const sub = interaction.options.getSubcommand();

  if (sub === "default") {
    const perms = interaction.memberPermissions;
    if (!perms?.has?.(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        embeds: [makeEmbed("Music", "Manage Server permission required.")]
      });
      return;
    }

    const mode = interaction.options.getString("mode", true);
    const res = await setDefaultMusicMode(guildId, mode);
    await auditLog({
      guildId,
      userId,
      action: "music.default.set",
      details: { mode: res.defaultMode }
    });
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      embeds: [makeEmbed("Music", `Default mode set to **${res.defaultMode}**.`)]
    });
    return;
  }

  const voiceCheck = requireVoice(interaction);
  if (!voiceCheck.ok) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      embeds: [makeEmbed("Music", "Join a voice channel.")]
    });
    return;
  }
  const vc = voiceCheck.vc;

  try {
    if (sub === "play") {
      const ack = await safeDeferEphemeral(interaction);
      if (!ack.ok) return;

      const query = interaction.options.getString("query", true);
      if (!String(query).trim()) {
        await interaction.editReply({
          embeds: [makeEmbed("Music", "Query is empty.")]
        });
        return;
      }
      if (String(query).length > 200) {
        await interaction.editReply({
          embeds: [makeEmbed("Music", "Query too long.")]
        });
        return;
      }

      await interaction.editReply({
        embeds: [makeEmbed("Music", `Searching for: **${query}**`)]
      });

      const alloc = ensureSessionAgent(guildId, vc.id, {
        textChannelId: interaction.channelId,
        ownerUserId: userId
      });

      if (!alloc.ok) {
        const errorMsg = formatMusicError(alloc.reason);
        const embedFields = [];
        if (alloc.reason === "no-agents-in-guild" || alloc.reason === "no-free-agents") {
          embedFields.push({ name: "Hint", value: "You might need to deploy more music agents. Use `/agents deploy` to get invite links.", inline: false });
        }
        await interaction.editReply({
          embeds: [makeEmbed("Music Error", errorMsg, embedFields, null, null, 0xFF0000)] // Red color for error
        });
        return;
      }

      const config = await getMusicConfig(guildId);

      let result;
      try {
        result = await sendAgentCommand(alloc.agent, "play", {
          guildId,
          voiceChannelId: vc.id,
          textChannelId: interaction.channelId,
          ownerUserId: userId,
          actorUserId: userId,
          query,
          defaultMode: config.defaultMode,
          defaultVolume: config.defaultVolume,
          limits: config.limits,
          requester: buildRequester(interaction.user)
        });
      } catch (err) {
        await interaction.editReply({
          embeds: [makeEmbed("Music Error", formatMusicError(err), [], null, null, 0xFF0000)] // Red color for error
        });
        return;
      }

      const track = result?.track ?? null;
      if (!track) {
        await interaction.editReply({
          embeds: [makeEmbed("Music", "No results found for that query.")]
        });
        return;
      }

      const action = String(result?.action ?? "queued");
      const title = action === "playing" ? "Now Playing" : "Queued";
      const fields = [];

      if (track.author) fields.push({ name: "Artist", value: track.author, inline: true });
      if (track.duration) fields.push({ name: "Duration", value: new Date(track.duration).toISOString().slice(11, 19), inline: true });
      if (track.requester?.username) fields.push({ name: "Requested by", value: track.requester.username, inline: true });

      await interaction.editReply({
        embeds: [makeEmbed(
          title,
          track.title ?? "Unknown title",
          fields,
          track.uri, // URL for the embed
          track.thumbnail // Thumbnail URL
        )]
      });
      return;
    }

    const sess = getSessionAgent(guildId, vc.id);
    if (!sess.ok) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        embeds: [makeEmbed("Music", "Nothing playing in this channel.")]
      });
      return;
    }

    const opMap = {
      skip: "skip",
      pause: "pause",
      resume: "resume",
      stop: "stop",
      now: "status",
      queue: "queue",
      status: "status",
      mode: "setMode",
      volume: "volume"
    };

    const op = opMap[sub];
    if (!op) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        embeds: [makeEmbed("Music", "Unknown action.")]
      });
      return;
    }

    const ack = await safeDeferEphemeral(interaction);
    if (!ack.ok) return;

    let result;
    try {
      result = await sendAgentCommand(sess.agent, op, {
        guildId,
        voiceChannelId: vc.id,
        textChannelId: interaction.channelId,
        ownerUserId: userId,
        actorUserId: userId,
        mode: sub === "mode" ? interaction.options.getString("mode", true) : undefined,
        volume: sub === "volume" ? interaction.options.getInteger("level", true) : undefined
      });
    } catch (err) {
      if (String(err?.message ?? err) === "no-session") releaseSession(guildId, vc.id);
      await interaction.editReply({
        embeds: [makeEmbed("Music", formatMusicError(err))]
      });
      return;
    }

    if (sub === "now") {
      const current = result?.current ?? null;
      if (!current) {
        await interaction.editReply({
          embeds: [makeEmbed("Now Playing", "Nothing playing in this channel.")]
        });
        return;
      }

      const fields = [];
      if (current.author) fields.push({ name: "Artist", value: current.author, inline: true });
      if (current.duration) fields.push({ name: "Duration", value: new Date(current.duration).toISOString().slice(11, 19), inline: true });
      if (current.requester?.username) fields.push({ name: "Requested by", value: current.requester.username, inline: true });

      await interaction.editReply({
        embeds: [makeEmbed(
          "Now Playing",
          current.title ?? "Unknown title",
          fields,
          current.uri, // URL for the embed
          current.thumbnail // Thumbnail URL
        )]
      });
      return;
    }

    if (sub === "status") {
      const fields = [];
      fields.push({
        name: "Playing",
        value: result?.playing ? "Yes" : "No",
        inline: true
      });
      fields.push({
        name: "Paused",
        value: result?.paused ? "Yes" : "No",
        inline: true
      });
      fields.push({
        name: "Mode",
        value: String(result?.mode ?? "open"),
        inline: true
      });
      if (result?.ownerId) {
        fields.push({
          name: "Owner",
          value: `<@${result.ownerId}>`,
          inline: true
        });
      }
      if (Number.isFinite(result?.queueLength)) {
        fields.push({
          name: "Queue",
          value: String(result.queueLength),
          inline: true
        });
      }
      if (Number.isFinite(result?.volume)) {
        fields.push({
          name: "Volume",
          value: String(result.volume),
          inline: true
        });
      }

      await interaction.editReply({
        embeds: [makeEmbed("Status", "Session status.", fields)]
      });
      return;
    }

    if (sub === "mode") {
      await interaction.editReply({
        embeds: [makeEmbed("Music", `Mode set to **${result?.mode ?? "open"}**.`)]
      });
      return;
    }

    if (sub === "volume") {
      await interaction.editReply({
        embeds: [makeEmbed("Music", `Volume set to **${result?.volume ?? "?"}**.`)]
      });
      return;
    }

    if (sub === "queue") {
      const current = result?.current ?? null;
      const tracks = Array.isArray(result?.tracks) ? result.tracks : [];

      const fields = [];

      if (current?.title) {
        let currentTrackInfo = `[${current.title}](${current.uri})`;
        if (current.author) currentTrackInfo += ` by ${current.author}`;
        if (current.requester?.username) currentTrackInfo += ` (Requested by ${current.requester.username})`;
        fields.push({ name: "Now Playing", value: currentTrackInfo, inline: false });
      } else {
        fields.push({ name: "Now Playing", value: "Nothing currently playing.", inline: false });
      }

      if (tracks.length === 0) {
        fields.push({ name: "Queue", value: "(empty)", inline: false });
      } else {
        const lines = [];
        for (let i = 0; i < Math.min(tracks.length, 10); i++) {
          const t = tracks[i];
          lines.push(`${i + 1}. [${t?.title ?? "Unknown title"}](${t.uri})`);
        }
        if (tracks.length > 10) lines.push(`…and ${tracks.length - 10} more`);
        fields.push({ name: "Up Next", value: lines.join("\n"), inline: false });
      }

      await interaction.editReply({
        embeds: [makeEmbed("Music Queue", "Current voice-channel queue.", fields)]
      });
      return;
    }

    // stop/skip can return grace timer info
    if (sub === "stop" || sub === "skip" || sub === "pause" || sub === "resume") {
      const label = actionLabel(sub, result?.action);
      const fields = [];
      const disconnectField = formatDisconnectField(result);
      if (disconnectField) fields.push(disconnectField);

      // Explain skip-last-track behavior explicitly
      if (sub === "skip" && String(result?.action) === "stopped" && disconnectField) {
        fields.push({
          name: "Note",
          value: "End of queue. Playback stopped; disconnect countdown started.",
          inline: false
        });
      }

      if (sub === "stop") {
        // do NOT release session immediately; it is released on grace-expired event
        await interaction.editReply({
          embeds: [makeEmbed("Music", label, fields)]
        });
        return;
      }

      await interaction.editReply({
        embeds: [makeEmbed("Music", label, fields)]
      });
      return;
    }

    await interaction.editReply({
      embeds: [makeEmbed("Music", actionLabel(sub, result?.action))]
    });
  } catch (err) {
    const msg = formatMusicError(err);

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          embeds: [makeEmbed("Music Error", msg, [], null, null, 0xFF0000)] // Red color for error
        });
      } else {
        await interaction.reply({
          flags: MessageFlags.Ephemeral,
          embeds: [makeEmbed("Music Error", msg, [], null, null, 0xFF0000)] // Red color for error
        });
      }
    } catch {}

    throw err;
  }
}
