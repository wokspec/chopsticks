import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.ManageChannels]
};

export const data = new SlashCommandBuilder()
  .setName("slowmode")
  .setDescription("Set slowmode for current channel")
  .addIntegerOption(o =>
    o.setName("seconds").setDescription("0-21600").setRequired(true).setMinValue(0).setMaxValue(21600)
  );

export async function execute(interaction) {
  const seconds = interaction.options.getInteger("seconds", true);
  const channel = interaction.channel;
  if (!channel?.setRateLimitPerUser) {
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Cannot set slowmode here." });
    return;
  }
  await channel.setRateLimitPerUser(seconds);
  await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Slowmode set to ${seconds}s.` });
}
