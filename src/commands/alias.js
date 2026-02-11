import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import { setAlias, clearAlias, getAliases } from "../utils/aliases.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.ManageGuild],
  category: "admin"
};

export const data = new SlashCommandBuilder()
  .setName("alias")
  .setDescription("Prefix alias management")
  .addSubcommand(s =>
    s
      .setName("set")
      .setDescription("Set an alias")
      .addStringOption(o => o.setName("alias").setDescription("Alias").setRequired(true))
      .addStringOption(o => o.setName("command").setDescription("Command").setRequired(true))
  )
  .addSubcommand(s =>
    s
      .setName("clear")
      .setDescription("Clear an alias")
      .addStringOption(o => o.setName("alias").setDescription("Alias").setRequired(true))
  )
  .addSubcommand(s =>
    s.setName("list").setDescription("List aliases")
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;
  if (sub === "list") {
    const aliases = await getAliases(guildId);
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "```json\n" + JSON.stringify(aliases, null, 2) + "\n```"
    });
    return;
  }
  if (sub === "set") {
    const alias = interaction.options.getString("alias", true);
    const commandName = interaction.options.getString("command", true);
    await setAlias(guildId, alias, commandName);
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Alias set: ${alias} -> ${commandName}` });
    return;
  }
  if (sub === "clear") {
    const alias = interaction.options.getString("alias", true);
    await clearAlias(guildId, alias);
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Alias cleared: ${alias}` });
  }
}
