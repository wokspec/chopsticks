import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import crypto from "node:crypto";
import { loadGuildData, saveGuildData } from "../utils/storage.js";
import { Colors, replyEmbed, replySuccess, replyError } from "../utils/discordOutput.js";

export const meta = {
  deployGlobal: false,
  category: "community",
  guildOnly: true
};

const MAX_EVENTS = 10;

/**
 * Parse and validate an event time string.
 * @param {string|null} str - date/time string (e.g. "YYYY-MM-DD HH:MM")
 * @returns {Date|null} - valid future Date, or null if invalid/past
 */
export function parseEventTime(str) {
  if (!str || typeof str !== "string") return null;
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  if (d.getTime() <= Date.now()) return null;
  return d;
}

export const data = new SlashCommandBuilder()
  .setName("events")
  .setDescription("Manage scheduled server events")
  .addSubcommand(sub =>
    sub.setName("create")
      .setDescription("Create a new scheduled event")
      .addStringOption(o =>
        o.setName("title").setDescription("Event title").setRequired(true).setMaxLength(100)
      )
      .addStringOption(o =>
        o.setName("description").setDescription("Event description").setRequired(true).setMaxLength(1000)
      )
      .addStringOption(o =>
        o.setName("time").setDescription("Event time in UTC (YYYY-MM-DD HH:MM)").setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub.setName("list").setDescription("List upcoming events")
  )
  .addSubcommand(sub =>
    sub.setName("cancel")
      .setDescription("Cancel an event by ID (Manage Events required)")
      .addStringOption(o =>
        o.setName("id").setDescription("Event ID to cancel").setRequired(true)
      )
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildData = await loadGuildData(interaction.guildId);
  if (!Array.isArray(guildData.events)) guildData.events = [];

  if (sub === "create") {
    const title = interaction.options.getString("title", true);
    const description = interaction.options.getString("description", true);
    const timeStr = interaction.options.getString("time", true);

    const eventTime = parseEventTime(timeStr);
    if (!eventTime) {
      return replyError(
        interaction,
        "Invalid or past date. Use `YYYY-MM-DD HH:MM` (UTC) and ensure the time is in the future."
      );
    }

    const active = guildData.events.filter(e => new Date(e.time_iso) > new Date());
    if (active.length >= MAX_EVENTS) {
      return replyError(
        interaction,
        `Maximum of ${MAX_EVENTS} active events reached. Cancel an existing event first.`
      );
    }

    const event = {
      id: crypto.randomUUID(),
      title,
      description,
      time_iso: eventTime.toISOString(),
      created_by: interaction.user.id,
      created_at: new Date().toISOString()
    };

    guildData.events.push(event);
    await saveGuildData(interaction.guildId, guildData);

    const ts = Math.floor(eventTime.getTime() / 1000);
    return replySuccess(
      interaction,
      "📅 Event Created",
      `**${title}**\n${description}\n\nTime: <t:${ts}:F>\nID: \`${event.id}\``
    );
  }

  if (sub === "list") {
    const now = new Date();
    const upcoming = guildData.events
      .filter(e => new Date(e.time_iso) > now)
      .sort((a, b) => new Date(a.time_iso) - new Date(b.time_iso));

    if (upcoming.length === 0) {
      return replyEmbed(interaction, "📅 Upcoming Events", "No upcoming events scheduled.", false, Colors.Neutral);
    }

    const lines = upcoming.map(e => {
      const ts = Math.floor(new Date(e.time_iso).getTime() / 1000);
      return `**${e.title}** — <t:${ts}:F>\n${e.description}\nID: \`${e.id}\``;
    });

    return replyEmbed(
      interaction,
      "📅 Upcoming Events",
      lines.join("\n\n").slice(0, 4000),
      false,
      Colors.Info
    );
  }

  if (sub === "cancel") {
    const hasPerms =
      interaction.member?.permissions?.has?.(PermissionFlagsBits.ManageEvents) ||
      interaction.member?.permissions?.has?.(PermissionFlagsBits.ManageGuild) ||
      interaction.member?.permissions?.has?.(PermissionFlagsBits.Administrator);

    if (!hasPerms) {
      return replyError(interaction, "You need the **Manage Events** or **Manage Server** permission to cancel events.");
    }

    const id = interaction.options.getString("id", true);
    const idx = guildData.events.findIndex(e => e.id === id);
    if (idx === -1) {
      return replyError(interaction, `No event found with ID \`${id}\`.`);
    }

    const [removed] = guildData.events.splice(idx, 1);
    await saveGuildData(interaction.guildId, guildData);
    return replySuccess(interaction, `✅ Event "**${removed.title}**" cancelled.`);
  }
}
