import { SlashCommandBuilder, MessageFlags } from "discord.js";

const answers = [
  "Yes.",
  "No.",
  "Maybe.",
  "Ask again later.",
  "Definitely.",
  "Unlikely.",
  "Absolutely.",
  "I doubt it.",
  "Signs point to yes.",
  "Very doubtful."
];

export const data = new SlashCommandBuilder()
  .setName("8ball")
  .setDescription("Ask the magic 8-ball")
  .addStringOption(o => o.setName("question").setDescription("Question").setRequired(true));

export async function execute(interaction) {
  const pick = answers[Math.floor(Math.random() * answers.length)];
  await interaction.reply({ flags: MessageFlags.Ephemeral, content: `🎱 ${pick}` });
}
