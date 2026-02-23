import { PermissionsBitField } from "discord.js";
import { reply } from "../helpers.js";

export default [
  {
    name: "ping",
    description: "Ping",
    async execute(message) {
      await reply(message, `Pong! ${Math.round(message.client.ws.ping)}ms`);
    }
  },
  {
    name: "uptime",
    description: "Uptime",
    async execute(message) {
      await reply(message, `Uptime: ${Math.floor(process.uptime())}s`);
    }
  },
  {
    name: "help",
    description: "List prefix commands",
    async execute(message, _args, ctx) {
      const names = Array.from(ctx.commands.keys()).sort();
      await reply(message, names.map(n => ctx.prefix + n).join("\n").slice(0, 1900));
    }
  },
  {
    name: "echo",
    description: "Echo text",
    async execute(message, args) {
      await reply(message, args.join(" ") || "(empty)");
    }
  },
  {
    name: "choose",
    description: "Pick one",
    async execute(message, args) {
      const items = args.join(" ").split(",").map(s => s.trim()).filter(Boolean);
      if (!items.length) return reply(message, "No options.");
      const pick = items[Math.floor(Math.random() * items.length)];
      return reply(message, `I choose: **${pick}**`);
    }
  },
  {
    name: "invite",
    async execute(message) {
      const perms = new PermissionsBitField([
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.EmbedLinks,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.Connect,
        PermissionsBitField.Flags.Speak,
        PermissionsBitField.Flags.ManageChannels,
        PermissionsBitField.Flags.ManageGuild,
        PermissionsBitField.Flags.ModerateMembers
      ]);
      const url = `https://discord.com/api/oauth2/authorize?client_id=${message.client.user.id}&permissions=${perms.bitfield}&scope=bot%20applications.commands`;
      await reply(message, url);
    }
  }
];
