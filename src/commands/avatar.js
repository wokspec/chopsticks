import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";

export const meta = {
  category: "util",
  guildOnly: false,
};

export const data = new SlashCommandBuilder()
  .setName("avatar")
  .setDescription("Show user avatar")
  .addUserOption(o => o.setName("user").setDescription("User").setRequired(false));

export async function execute(interaction) {
  const user = interaction.options.getUser("user") || interaction.user;
  const url = user.displayAvatarURL({ size: 512 });
  const e = new EmbedBuilder().setTitle(user.username).setImage(url);
  await interaction.reply({ embeds: [e], flags: MessageFlags.Ephemeral });
}
