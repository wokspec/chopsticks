import { SlashCommandBuilder, PermissionsBitField, MessageFlags } from "discord.js";

export const meta = {
  category: "util",
  guildOnly: true,
};

export const data = new SlashCommandBuilder()
  .setName("invite")
  .setDescription("Get bot invite link");

export async function execute(interaction) {
  const perms = new PermissionsBitField([
    PermissionsBitField.Flags.ViewChannel,
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.EmbedLinks,
    PermissionsBitField.Flags.ReadMessageHistory,
    PermissionsBitField.Flags.Connect,
    PermissionsBitField.Flags.Speak,
    PermissionsBitField.Flags.ManageChannels,
    PermissionsBitField.Flags.ManageGuild,
    PermissionsBitField.Flags.ModerateMembers
  ]);
  const url = `https://discord.com/api/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=${perms.bitfield}&scope=bot%20applications.commands`;
  await interaction.reply({ flags: MessageFlags.Ephemeral, content: url });
}
