import { loadGuildData, saveGuildData } from "./storage.js";

const MAX_LOGS = 200;

export async function addCommandLog(guildId, entry) {
  if (!guildId) return;
  const data = await loadGuildData(guildId);
  data.commandLogs ??= [];
  data.commandLogs.push(entry);
  if (data.commandLogs.length > MAX_LOGS) {
    data.commandLogs = data.commandLogs.slice(-MAX_LOGS);
  }
  await saveGuildData(guildId, data);
}

export async function listCommandLogs(guildId, limit = 50) {
  const data = await loadGuildData(guildId);
  const list = data.commandLogs ?? [];
  return list.slice(-limit);
}
