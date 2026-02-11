import { loadGuildData, saveGuildData } from "../utils/storage.js";

export async function getDashboardPerms(guildId) {
  const data = await loadGuildData(guildId);
  const dash = data.dashboard ?? {};
  const allowUserIds = Array.isArray(dash.allowUserIds) ? dash.allowUserIds : [];
  const allowRoleIds = Array.isArray(dash.allowRoleIds) ? dash.allowRoleIds : [];
  return { allowUserIds, allowRoleIds };
}

export async function setDashboardPerms(guildId, { allowUserIds, allowRoleIds }) {
  const data = await loadGuildData(guildId);
  data.dashboard ??= {};
  data.dashboard.allowUserIds = Array.isArray(allowUserIds)
    ? allowUserIds.map(String).filter(Boolean)
    : [];
  data.dashboard.allowRoleIds = Array.isArray(allowRoleIds)
    ? allowRoleIds.map(String).filter(Boolean)
    : [];
  await saveGuildData(guildId, data);
  return { ok: true };
}
