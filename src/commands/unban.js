import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.BanMembers]
};

export const data = new SlashCommandBuilder()
  .setName("unban")
  .setDescription("Unban a user by ID")
  .addStringOption(o => o.setName("user_id").setDescription("User ID").setRequired(true))
  .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(false));

export async function execute(interaction) {
  const userId = interaction.options.getString("user_id", true);
  const reason = interaction.options.getString("reason") || "No reason";
  await interaction.guild.members.unban(userId, reason).catch(() => null);
  await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Unbanned ${userId}` });
}
