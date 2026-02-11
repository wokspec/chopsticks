import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.ManageNicknames]
};

export const data = new SlashCommandBuilder()
  .setName("nick")
  .setDescription("Set or clear a nickname")
  .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
  .addStringOption(o => o.setName("nickname").setDescription("New nickname").setRequired(false));

export async function execute(interaction) {
  const user = interaction.options.getUser("user", true);
  const nickname = interaction.options.getString("nickname");
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  if (!member) {
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: "User not found." });
    return;
  }
  await member.setNickname(nickname || null).catch(() => null);
  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    content: nickname ? `Nickname set for ${user.tag}` : `Nickname cleared for ${user.tag}`
  });
}
