import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";

export const meta = {
  category: "util",
  guildOnly: true,
};

export const data = new SlashCommandBuilder()
  .setName("botinfo")
  .setDescription("Show bot info");

export async function execute(interaction) {
  const e = new EmbedBuilder()
    .setTitle("Chopsticks")
    .addFields(
      { name: "Guilds", value: String(interaction.client.guilds.cache.size), inline: true },
      { name: "Users", value: String(interaction.client.users.cache.size), inline: true },
      { name: "Uptime", value: `${Math.floor(process.uptime())}s`, inline: true }
    );
  await interaction.reply({ embeds: [e], flags: MessageFlags.Ephemeral });
}
