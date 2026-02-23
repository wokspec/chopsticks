import { reply } from "../helpers.js";

export default [
  {
    name: "serverinfo",
    guildOnly: true,
    async execute(message) {
      const g = message.guild;
      await reply(message, `**${g.name}** | Members: ${g.memberCount} | ID: ${g.id}`);
    }
  },
  {
    name: "userinfo",
    async execute(message, args) {
      const id = args[0]?.replace(/[<@!>]/g, "") || message.author.id;
      const user = await message.client.users.fetch(id).catch(() => null);
      if (!user) return reply(message, "User not found.");
      await reply(message, `${user.tag} | ID: ${user.id}`);
    }
  },
  {
    name: "avatar",
    async execute(message, args) {
      const id = args[0]?.replace(/[<@!>]/g, "") || message.author.id;
      const user = await message.client.users.fetch(id).catch(() => null);
      if (!user) return reply(message, "User not found.");
      await reply(message, user.displayAvatarURL({ size: 512 }));
    }
  },
  {
    name: "roleinfo",
    guildOnly: true,
    async execute(message, args) {
      const id = args[0]?.replace(/[<@&>]/g, "");
      if (!id) return reply(message, "Role ID required.");
      const role = message.guild.roles.cache.get(id);
      if (!role) return reply(message, "Role not found.");
      await reply(message, `${role.name} | Members: ${role.members.size} | ID: ${role.id}`);
    }
  },
  {
    name: "botinfo",
    async execute(message) {
      await reply(message, `Guilds: ${message.client.guilds.cache.size} | Users: ${message.client.users.cache.size}`);
    }
  }
];
