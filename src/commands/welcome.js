import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import { loadGuildData, saveGuildData } from "../utils/storage.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.ManageGuild]
};

export const data = new SlashCommandBuilder()
  .setName("welcome")
  .setDescription("Welcome message settings")
  .addSubcommand(s =>
    s
      .setName("set")
      .setDescription("Set welcome channel")
      .addChannelOption(o => o.setName("channel").setDescription("Channel").setRequired(true))
  )
  .addSubcommand(s =>
    s
      .setName("message")
      .setDescription("Set welcome message")
      .addStringOption(o => o.setName("text").setDescription("Message with {user}").setRequired(true))
  )
  .addSubcommand(s => s.setName("disable").setDescription("Disable welcome"));

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const data = await loadGuildData(interaction.guildId);
  data.welcome ??= { enabled: false, channelId: null, message: "Welcome {user}!" };

  if (sub === "set") {
    const channel = interaction.options.getChannel("channel", true);
    data.welcome.channelId = channel.id;
    data.welcome.enabled = true;
    await saveGuildData(interaction.guildId, data);
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Welcome channel set to ${channel}` });
    return;
  }

  if (sub === "message") {
    const text = interaction.options.getString("text", true);
    data.welcome.message = text;
    data.welcome.enabled = true;
    await saveGuildData(interaction.guildId, data);
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Welcome message updated." });
    return;
  }

  if (sub === "disable") {
    data.welcome.enabled = false;
    await saveGuildData(interaction.guildId, data);
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Welcome disabled." });
  }
}
