import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} from "discord.js";
import {
  setCommandRoles,
  clearCommandRoles,
  listCommandRoles,
  setCommandEnabled,
  setCategoryEnabled,
  listCommandSettings
} from "../utils/permissions.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.ManageGuild]
};

export const data = new SlashCommandBuilder()
  .setName("config")
  .setDescription("Configuration commands")
  .addSubcommand(sub =>
    sub
      .setName("command-roles")
      .setDescription("Set roles required to use a command")
      .addStringOption(o =>
        o.setName("command").setDescription("Command name").setRequired(true)
      )
      .addStringOption(o =>
        o
          .setName("action")
          .setDescription("add/remove/clear")
          .setRequired(true)
          .addChoices(
            { name: "add", value: "add" },
            { name: "remove", value: "remove" },
            { name: "clear", value: "clear" }
          )
      )
      .addRoleOption(o =>
        o.setName("role").setDescription("Role to add/remove").setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub.setName("command-roles-list").setDescription("List command role rules")
  )
  .addSubcommand(sub =>
    sub
      .setName("command-enable")
      .setDescription("Enable or disable a command")
      .addStringOption(o =>
        o.setName("command").setDescription("Command name").setRequired(true)
      )
      .addBooleanOption(o =>
        o.setName("enabled").setDescription("true/false").setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName("category-enable")
      .setDescription("Enable or disable a category")
      .addStringOption(o =>
        o.setName("category").setDescription("Category name").setRequired(true)
      )
      .addBooleanOption(o =>
        o.setName("enabled").setDescription("true/false").setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub.setName("settings").setDescription("Show command settings")
  );

export async function execute(interaction) {
  if (!interaction.inGuild()) return;
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;

  if (sub === "command-roles-list") {
    const res = await listCommandRoles(guildId);
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "```json\n" + JSON.stringify(res.commandPerms, null, 2) + "\n```"
    });
    return;
  }

  if (sub === "command-enable") {
    const commandName = interaction.options.getString("command", true);
    const enabled = interaction.options.getBoolean("enabled", true);
    await setCommandEnabled(guildId, commandName, enabled);
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: `${commandName} ${enabled ? "enabled" : "disabled"}`
    });
    return;
  }

  if (sub === "category-enable") {
    const category = interaction.options.getString("category", true);
    const enabled = interaction.options.getBoolean("enabled", true);
    await setCategoryEnabled(guildId, category, enabled);
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: `Category ${category} ${enabled ? "enabled" : "disabled"}`
    });
    return;
  }

  if (sub === "settings") {
    const settings = await listCommandSettings(guildId);
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "```json\n" + JSON.stringify(settings, null, 2) + "\n```"
    });
    return;
  }

  const commandName = interaction.options.getString("command", true);
  const action = interaction.options.getString("action", true);
  const role = interaction.options.getRole("role");

  if (action === "clear") {
    const res = await clearCommandRoles(guildId, commandName);
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: `Cleared role rules for ${res.commandName}.`
    });
    return;
  }

  if (!role) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "Role is required for add/remove."
    });
    return;
  }

  const res = await listCommandRoles(guildId);
  const existing = res.commandPerms?.[commandName]?.roleIds ?? [];
  let next = existing.slice();

  if (action === "add") {
    if (!next.includes(role.id)) next.push(role.id);
  } else if (action === "remove") {
    next = next.filter(r => r !== role.id);
  }

  const saved = await setCommandRoles(guildId, commandName, next);
  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    content: `Roles for ${commandName}: ${saved.roleIds.join(", ") || "(none)"}`
  });
}
