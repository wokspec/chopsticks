import { EmbedBuilder, MessageFlags } from "discord.js";

export function withEphemeralFlags(payload, ephemeral = true) {
  return {
    ...payload,
    flags: ephemeral ? MessageFlags.Ephemeral : payload?.flags
  };
}

export function buildErrorEmbed(description, title = "Error") {
  return new EmbedBuilder()
    .setTitle(String(title || "Error"))
    .setDescription(String(description || "An error occurred."));
}

export async function replyInteraction(interaction, payload, { ephemeral = true } = {}) {
  const body = withEphemeralFlags(payload, ephemeral);
  if (interaction?.replied || interaction?.deferred) {
    return interaction.followUp(body);
  }
  return interaction.reply(body);
}

export async function replyInteractionIfFresh(interaction, payload, { ephemeral = true } = {}) {
  if (interaction?.replied || interaction?.deferred) return false;
  await interaction.reply(withEphemeralFlags(payload, ephemeral));
  return true;
}
