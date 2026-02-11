import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import { clearWarnings } from "../utils/moderation.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.ModerateMembers]
};

export const data = new SlashCommandBuilder()
  .setName("clearwarns")
  .setDescription("Clear warnings for a user")
  .addUserOption(o => o.setName("user").setDescription("User").setRequired(true));

export async function execute(interaction) {
  const user = interaction.options.getUser("user", true);
  await clearWarnings(interaction.guildId, user.id);
  await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Cleared warnings for ${user.tag}` });
}
