import { loadGuildData, saveGuildData } from "./storage.js";

export async function addWarning(guildId, userId, byUserId, reason) {
  const data = await loadGuildData(guildId);
  data.moderation ??= {};
  data.moderation.warnings ??= {};
  const list = data.moderation.warnings[userId] ?? [];
  list.push({
    by: String(byUserId),
    reason: String(reason || "No reason"),
    at: Date.now()
  });
  data.moderation.warnings[userId] = list;
  await saveGuildData(guildId, data);
  return list;
}

export async function listWarnings(guildId, userId) {
  const data = await loadGuildData(guildId);
  return data.moderation?.warnings?.[userId] ?? [];
}

export async function clearWarnings(guildId, userId) {
  const data = await loadGuildData(guildId);
  if (data.moderation?.warnings?.[userId]) {
    delete data.moderation.warnings[userId];
    await saveGuildData(guildId, data);
  }
  return { ok: true };
}
