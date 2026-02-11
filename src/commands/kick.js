import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.KickMembers]
};

export const data = new SlashCommandBuilder()
  .setName("kick")
  .setDescription("Kick a member")
  .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
  .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(false));

export async function execute(interaction) {
  const user = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason") || "No reason";
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  if (!member) {
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: "User not found." });
    return;
  }
  await member.kick(reason).catch(() => null);
  await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Kicked ${user.tag}` });
}
