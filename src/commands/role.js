import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.ManageRoles]
};

export const data = new SlashCommandBuilder()
  .setName("role")
  .setDescription("Role management")
  .addSubcommand(s =>
    s
      .setName("add")
      .setDescription("Add a role to a user")
      .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
      .addRoleOption(o => o.setName("role").setDescription("Role").setRequired(true))
  )
  .addSubcommand(s =>
    s
      .setName("remove")
      .setDescription("Remove a role from a user")
      .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
      .addRoleOption(o => o.setName("role").setDescription("Role").setRequired(true))
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const user = interaction.options.getUser("user", true);
  const role = interaction.options.getRole("role", true);
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  if (!member) {
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: "User not found." });
    return;
  }
  if (sub === "add") {
    await member.roles.add(role).catch(() => null);
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Added ${role.name} to ${user.tag}` });
    return;
  }
  if (sub === "remove") {
    await member.roles.remove(role).catch(() => null);
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Removed ${role.name} from ${user.tag}` });
    return;
  }
}
