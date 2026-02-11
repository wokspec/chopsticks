import { loadGuildData } from "../utils/storage.js";

export default {
  name: "guildMemberAdd",

  async execute(member) {
    const guildId = member.guild?.id;
    if (!guildId) return;
    const data = await loadGuildData(guildId);

    // Auto-role
    try {
      const ar = data.autorole;
      if (ar?.enabled && ar.roleId) {
        const role = member.guild.roles.cache.get(ar.roleId) ?? null;
        if (role) await member.roles.add(role).catch(() => {});
      }
    } catch {}

    // Welcome
    try {
      const w = data.welcome;
      if (w?.enabled && w.channelId) {
        const ch = member.guild.channels.cache.get(w.channelId);
        if (ch && ch.send) {
          const text = String(w.message || "Welcome {user}!").replace("{user}", `<@${member.id}>`);
          await ch.send(text);
        }
      }
    } catch {}
  }
};
