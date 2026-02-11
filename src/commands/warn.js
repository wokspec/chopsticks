import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import { addWarning } from "../utils/moderation.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.ModerateMembers]
};

export const data = new SlashCommandBuilder()
  .setName("warn")
  .setDescription("Warn a user")
  .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
  .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(false));

export async function execute(interaction) {
  const user = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason") || "No reason";
  const list = await addWarning(interaction.guildId, user.id, interaction.user.id, reason);
  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    content: `Warned ${user.tag}. Total warnings: ${list.length}`
  });
}
