import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("serverinfo")
  .setDescription("Show server info");

export async function execute(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Guild only." });
    return;
  }
  const g = interaction.guild;
  const e = new EmbedBuilder()
    .setTitle(g.name)
    .setThumbnail(g.iconURL({ size: 256 }))
    .addFields(
      { name: "ID", value: g.id, inline: true },
      { name: "Members", value: String(g.memberCount), inline: true },
      { name: "Owner", value: `<@${g.ownerId}>`, inline: true },
      { name: "Created", value: `<t:${Math.floor(g.createdTimestamp / 1000)}:R>`, inline: true }
    );
  await interaction.reply({ embeds: [e], flags: MessageFlags.Ephemeral });
}
