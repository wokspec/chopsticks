import { SlashCommandBuilder, MessageFlags } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("echo")
  .setDescription("Echo text")
  .addStringOption(o => o.setName("text").setDescription("Text").setRequired(true));

export async function execute(interaction) {
  const text = interaction.options.getString("text", true);
  await interaction.reply({ content: text, flags: MessageFlags.Ephemeral });
}
