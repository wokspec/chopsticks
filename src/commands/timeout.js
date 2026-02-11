import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.ModerateMembers]
};

export const data = new SlashCommandBuilder()
  .setName("timeout")
  .setDescription("Timeout a member")
  .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
  .addIntegerOption(o =>
    o.setName("minutes").setDescription("Minutes (0 to clear)").setRequired(true).setMinValue(0).setMaxValue(10080)
  )
  .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(false));

export async function execute(interaction) {
  const user = interaction.options.getUser("user", true);
  const minutes = interaction.options.getInteger("minutes", true);
  const reason = interaction.options.getString("reason") || "No reason";
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  if (!member) {
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: "User not found." });
    return;
  }
  const ms = minutes === 0 ? null : minutes * 60 * 1000;
  await member.timeout(ms, reason).catch(() => null);
  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    content: minutes === 0 ? `Timeout cleared for ${user.tag}` : `Timed out ${user.tag} for ${minutes}m`
  });
}
