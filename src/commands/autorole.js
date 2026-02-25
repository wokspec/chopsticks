import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import { loadGuildData, saveGuildData } from "../utils/storage.js";

export const meta = {
  deployGlobal: false,
  category: "admin",
  guildOnly: true,
  userPerms: [PermissionFlagsBits.ManageGuild]
};

export const data = new SlashCommandBuilder()
  .setName("autorole")
  .setDescription("Auto-role settings")
  .addSubcommand(s =>
    s
      .setName("set")
      .setDescription("Set auto-role")
      .addRoleOption(o => o.setName("role").setDescription("Role").setRequired(true))
  )
  .addSubcommand(s => s.setName("disable").setDescription("Disable auto-role"))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const data = await loadGuildData(interaction.guildId);
  data.autorole ??= { enabled: false, roleId: null };

  if (sub === "set") {
    const role = interaction.options.getRole("role", true);
    data.autorole.roleId = role.id;
    data.autorole.enabled = true;
    await saveGuildData(interaction.guildId, data);
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Auto-role set to ${role.name}` });
    return;
  }

  if (sub === "disable") {
    data.autorole.enabled = false;
    await saveGuildData(interaction.guildId, data);
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Auto-role disabled." });
  }
}
