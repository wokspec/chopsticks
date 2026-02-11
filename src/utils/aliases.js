import { loadGuildData, saveGuildData } from "./storage.js";

export async function getAliases(guildId) {
  const data = await loadGuildData(guildId);
  data.prefix ??= {};
  data.prefix.aliases ??= {};
  return data.prefix.aliases;
}

export async function setAlias(guildId, alias, commandName) {
  const data = await loadGuildData(guildId);
  data.prefix ??= {};
  data.prefix.aliases ??= {};
  data.prefix.aliases[String(alias)] = String(commandName);
  await saveGuildData(guildId, data);
  return { ok: true, alias, commandName };
}

export async function clearAlias(guildId, alias) {
  const data = await loadGuildData(guildId);
  if (data.prefix?.aliases?.[alias]) {
    delete data.prefix.aliases[alias];
    await saveGuildData(guildId, data);
  }
  return { ok: true, alias };
}
