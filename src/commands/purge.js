import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.ManageMessages]
};

export const data = new SlashCommandBuilder()
  .setName("purge")
  .setDescription("Delete recent messages")
  .addIntegerOption(o =>
    o.setName("count").setDescription("1-100").setRequired(true).setMinValue(1).setMaxValue(100)
  );

export async function execute(interaction) {
  const count = interaction.options.getInteger("count", true);
  const channel = interaction.channel;
  if (!channel || !channel.bulkDelete) {
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Cannot delete here." });
    return;
  }
  const deleted = await channel.bulkDelete(count, true).catch(() => null);
  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    content: `Deleted ${deleted?.size ?? 0} messages.`
  });
}
