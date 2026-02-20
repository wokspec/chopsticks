import { SlashCommandBuilder, MessageFlags } from "discord.js";

export const meta = {
  category: "fun",
  guildOnly: true,
};

export const data = new SlashCommandBuilder()
  .setName("choose")
  .setDescription("Pick one from a list")
  .addStringOption(o =>
    o.setName("options").setDescription("Comma-separated options").setRequired(true)
  );

export async function execute(interaction) {
  const raw = interaction.options.getString("options", true);
  const items = raw.split(",").map(s => s.trim()).filter(Boolean);
  if (items.length === 0) {
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: "No options." });
    return;
  }
  const pick = items[Math.floor(Math.random() * items.length)];
  await interaction.reply({ flags: MessageFlags.Ephemeral, content: `I choose: **${pick}**` });
}
