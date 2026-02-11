import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.ManageChannels]
};

export const data = new SlashCommandBuilder()
  .setName("lock")
  .setDescription("Lock the current channel");

export async function execute(interaction) {
  if (!interaction.inGuild()) return;
  const channel = interaction.channel;
  if (!channel?.permissionOverwrites) {
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Cannot lock here." });
    return;
  }
  await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
    SendMessages: false
  });
  await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Channel locked." });
}
