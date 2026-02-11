import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { loadGuildData } from "../utils/storage.js";

export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("List commands");

export async function execute(interaction) {
  const cmds = Array.from(interaction.client.commands.keys()).sort();
  const lines = cmds.map(c => `/${c}`);
  let prefix = "!";
  if (interaction.inGuild()) {
    try {
      const data = await loadGuildData(interaction.guildId);
      prefix = data?.prefix?.value || "!";
    } catch {}
  }
  const header = `Slash: use /command\nPrefix: use ${prefix}command\nUse /commands list for categories`;
  const text = [header, "", ...lines].join("\n").slice(0, 1900);
  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    content: "```" + text + "```"
  });
}
