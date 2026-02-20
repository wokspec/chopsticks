import { SlashCommandBuilder, MessageFlags } from "discord.js";

export const meta = {
  category: "util",
  guildOnly: true,
};

export const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Check bot latency");

export async function execute(interaction) {
  await interaction.reply({ content: "Pinging...", flags: MessageFlags.Ephemeral });
  const api = Math.round(interaction.client.ws.ping);
  await interaction.editReply(`Pong! API ${api}ms`);
}
