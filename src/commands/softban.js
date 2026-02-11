import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.BanMembers]
};

export const data = new SlashCommandBuilder()
  .setName("softban")
  .setDescription("Softban a user (ban then unban)")
  .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
  .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(false))
  .addIntegerOption(o =>
    o.setName("delete_days").setDescription("Delete message days (0-7)").setMinValue(0).setMaxValue(7)
  );

export async function execute(interaction) {
  const user = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason") || "No reason";
  const deleteDays = interaction.options.getInteger("delete_days") || 0;
  await interaction.guild.members.ban(user.id, {
    reason,
    deleteMessageSeconds: deleteDays * 86400
  }).catch(() => null);
  await interaction.guild.members.unban(user.id, "Softban cleanup").catch(() => null);
  await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Softbanned ${user.tag}` });
}
