const STORAGE_DRIVER = String(process.env.STORAGE_DRIVER || "file").toLowerCase();

let pgModule = null;

async function getPg() {
  if (!pgModule) {
    pgModule = await import("./storage_pg.js");
  }
  return pgModule;
}

export async function auditLog(entry) {
  if (STORAGE_DRIVER !== "postgres") return;
  if (!entry?.guildId || !entry?.userId || !entry?.action) return;

  try {
    const pg = await getPg();
    await pg.insertAuditLog(entry);
  } catch {}
}

export async function getAuditLog(guildId, limit, beforeId, action, userId) {
  if (STORAGE_DRIVER !== "postgres") return [];
  if (!guildId) return [];
  try {
    const pg = await getPg();
    return await pg.fetchAuditLog(guildId, limit, beforeId, action, userId);
  } catch {
    return [];
  }
}

export async function flushCommandStats(rows) {
  if (STORAGE_DRIVER !== "postgres") return;
  if (!rows?.length) return;
  try {
    const pg = await getPg();
    await pg.upsertCommandStats(rows);
  } catch {}
}

export async function getPersistedCommandStats(guildId, limit) {
  if (STORAGE_DRIVER !== "postgres") return [];
  try {
    const pg = await getPg();
    return await pg.fetchCommandStats(guildId, limit);
  } catch {
    return [];
  }
}

export async function flushCommandStatsDaily(rows, day) {
  if (STORAGE_DRIVER !== "postgres") return;
  if (!rows?.length) return;
  try {
    const pg = await getPg();
    await pg.upsertCommandStatsDaily(rows, day);
  } catch {}
}

export async function getPersistedCommandStatsDaily(guildId, days, limit) {
  if (STORAGE_DRIVER !== "postgres") return [];
  try {
    const pg = await getPg();
    return await pg.fetchCommandStatsDaily(guildId, days, limit);
  } catch {
    return [];
  }
}
