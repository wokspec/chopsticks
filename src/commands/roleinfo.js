import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("roleinfo")
  .setDescription("Show role info")
  .addRoleOption(o => o.setName("role").setDescription("Role").setRequired(true));

export async function execute(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Guild only." });
    return;
  }
  const role = interaction.options.getRole("role", true);
  const e = new EmbedBuilder()
    .setTitle(role.name)
    .addFields(
      { name: "ID", value: role.id, inline: true },
      { name: "Members", value: String(role.members.size), inline: true },
      { name: "Color", value: role.hexColor, inline: true },
      { name: "Created", value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, inline: true }
    );
  await interaction.reply({ embeds: [e], flags: MessageFlags.Ephemeral });
}
