import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";

export const meta = {
  category: "util",
  guildOnly: true,
};

export const data = new SlashCommandBuilder()
  .setName("userinfo")
  .setDescription("Show user info")
  .addUserOption(o => o.setName("user").setDescription("User").setRequired(false));

export async function execute(interaction) {
  const user = interaction.options.getUser("user") || interaction.user;
  const member = interaction.inGuild() ? await interaction.guild.members.fetch(user.id).catch(() => null) : null;

  const e = new EmbedBuilder()
    .setTitle(`${user.username}`)
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: "ID", value: user.id, inline: true },
      { name: "Bot", value: user.bot ? "Yes" : "No", inline: true },
      { name: "Created", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
    );

  if (member) {
    e.addFields(
      { name: "Joined", value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
      { name: "Roles", value: String(member.roles.cache.size - 1), inline: true }
    );
  }

  await interaction.reply({ embeds: [e], flags: MessageFlags.Ephemeral });
}
