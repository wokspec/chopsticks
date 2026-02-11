import { Pool } from "pg";
import crypto from "node:crypto"; // Added for encryption

let pool = null;

function getPool() {
  console.log("--> getPool() called in storage_pg.js");
  if (pool) return pool;
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) {
    const error = new Error("POSTGRES_URL missing");
    console.error("Error in getPool():", error.message);
    throw error;
  }
  try {
    pool = new Pool({ connectionString: url });
    pool.on("error", (err) => {
      console.error("PostgreSQL pool error (from event listener):", err.message);
    });
    console.log("PostgreSQL connection pool initialized.");
  } catch (err) {
    console.error("Error initializing PostgreSQL connection pool:", err.message);
    throw err;
  }
  return pool;
}

// --- Encryption Configuration ---
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16; // Authentication tag length
const ENCRYPTION_KEY = process.env.AGENT_TOKEN_KEY; // Must be 32 bytes (256 bits)

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  console.warn("AGENT_TOKEN_KEY environment variable is missing or not 32 bytes. Agent tokens will NOT be encrypted at rest.");
}

function encrypt(text) {
  if (!ENCRYPTION_KEY) return text; // If no key, return original text
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + encrypted + ':' + tag.toString('hex');
  } catch (err) {
    console.error("Encryption failed:", err);
    return text; // Fallback to unencrypted if error
  }
}

function decrypt(text) {
  if (!ENCRYPTION_KEY) return text; // If no key, return original text
  if (!text || typeof text !== 'string') return text;

  const parts = text.split(':');
  if (parts.length !== 3) {
    // Not encrypted or invalid format, return as is (could log a warning)
    return text;
  }

  try {
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const tag = Buffer.from(parts[2], 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    decipher.setAuthTag(tag); // Set the authentication tag

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error("Decryption failed:", err);
    return text; // Fallback to original text if error
  }
}
// --- End Encryption Configuration ---

export async function ensureSchema() {
  console.log("--> ensureSchema() called in storage_pg.js");
  console.log("--> Calling getPool() from ensureSchema()"); // New diagnostic log
  const p = getPool();

  try {
    console.log("Attempting to create guild_settings table...");
    await p.query(`
      CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        rev INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("guild_settings table created or already exists.");
  } catch (err) {
    console.error("Error creating guild_settings table:", err.message);
    throw err;
  }

  try {
    console.log("Attempting to create audit_log table...");
    await p.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id BIGSERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        details JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("audit_log table created or already exists.");
  } catch (err) {
    console.error("Error creating audit_log table:", err.message);
    throw err;
  }

  try {
    console.log("Attempting to create command_stats table...");
    await p.query(`
      CREATE TABLE IF NOT EXISTS command_stats (
        guild_id TEXT NOT NULL,
        command TEXT NOT NULL,
        ok BIGINT NOT NULL DEFAULT 0,
        err BIGINT NOT NULL DEFAULT 0,
        total_ms BIGINT NOT NULL DEFAULT 0,
        count BIGINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (guild_id, command)
      );
    `);
    console.log("command_stats table created or already exists.");
  } catch (err) {
    console.error("Error creating command_stats table:", err.message);
    throw err;
  }

  try {
    console.log("Attempting to create command_stats_daily table...");
    await p.query(`
      CREATE TABLE IF NOT EXISTS command_stats_daily (
        day DATE NOT NULL,
        guild_id TEXT NOT NULL,
        command TEXT NOT NULL,
        ok BIGINT NOT NULL DEFAULT 0,
        err BIGINT NOT NULL DEFAULT 0,
        total_ms BIGINT NOT NULL DEFAULT 0,
        count BIGINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (day, guild_id, command)
      );
    `);
    console.log("command_stats_daily table created or already exists.");
  } catch (err) {
    console.error("Error creating command_stats_daily table:", err.message);
    throw err;
  }

  // New agent_bots table (renamed from agent_tokens, timestamps as BIGINT)
  try {
    console.log("Attempting to create agent_bots table...");
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS agent_bots (
        id SERIAL PRIMARY KEY,
        agent_id TEXT UNIQUE NOT NULL,
        token TEXT UNIQUE NOT NULL, -- Encrypted at rest
        client_id TEXT UNIQUE NOT NULL,
        tag TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );
    `;
    console.log("ensureSchema: Executing SQL:", createTableSql);
    await p.query(createTableSql);
    console.log("agent_bots table created or already exists.");
  } catch (err) {
    console.error("Error creating agent_bots table:", err.message);
    throw err;
  }

  // New agent_runners table
  try {
    console.log("Attempting to create agent_runners table...");
    const createRunnerTableSql = `
      CREATE TABLE IF NOT EXISTS agent_runners (
        runner_id TEXT PRIMARY KEY,
        last_seen BIGINT NOT NULL,
        meta JSONB
      );
    `;
    console.log("ensureSchema: Executing SQL:", createRunnerTableSql);
    await p.query(createRunnerTableSql);
    console.log("agent_runners table created or already exists.");
  } catch (err) {
    console.error("Error creating agent_runners table:", err.message);
    throw err;
  }
}

export async function insertAuditLog(entry) {
  const p = getPool();
  const insertAuditSql = "INSERT INTO audit_log (guild_id, user_id, action, details) VALUES ($1, $2, $3, $4)";
  console.log("insertAuditLog: Executing SQL:", insertAuditSql);
  await p.query(
    insertAuditSql,
    [entry.guildId, entry.userId, entry.action, entry.details ?? null]
  );
}

export async function fetchAuditLog(guildId, limit = 50, beforeId = null, action = null, userId = null) {
  const p = getPool();
  const lim = Math.max(1, Math.min(200, Math.trunc(Number(limit) || 50)));
  const params = [guildId];
  let idx = params.length + 1;
  let where = "guild_id = $1";

  if (beforeId) {
    where += ` AND id < $${idx}`;
    params.push(Number(beforeId));
    idx += 1;
  }

  if (action) {
    where += ` AND action ILIKE $${idx}`;
    params.push(`%${action}%`);
    idx += 1;
  }

  if (userId) {
    where += ` AND user_id = $${idx}`;
    params.push(String(userId));
    idx += 1;
  }

  params.push(lim);
  const fetchAuditSql = `SELECT id, guild_id, user_id, action, details, created_at FROM audit_log WHERE ${where} ORDER BY id DESC LIMIT $${idx}`;
  console.log("fetchAuditLog: Executing SQL:", fetchAuditSql);
  const res = await p.query(
    fetchAuditSql,
    params
  );
  return res.rows;
}

export async function upsertCommandStats(rows) {
  if (!rows?.length) return;
  const p = getPool();
  const values = [];
  const params = [];
  let i = 1;
  for (const r of rows) {
    values.push(`($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++})`);
    const gid = r.guildId ? String(r.guildId) : "__global__";
    params.push(gid, r.command, r.ok || 0, r.err || 0, r.totalMs || 0, r.count || 0);
  }
  const sql = `
    INSERT INTO command_stats (guild_id, command, ok, err, total_ms, count)
    VALUES ${values.join(",")}
    ON CONFLICT (guild_id, command)
    DO UPDATE SET
      ok = command_stats.ok + EXCLUDED.ok,
      err = command_stats.err + EXCLUDED.err,
      total_ms = command_stats.total_ms + EXCLUDED.total_ms,
      count = command_stats.count + EXCLUDED.count,
      updated_at = NOW()
  `;
  console.log("upsertCommandStats: Executing SQL:", sql);
  await p.query(sql, params);
}

export async function upsertCommandStatsDaily(rows, day) {
  if (!rows?.length) return;
  const p = getPool();
  const d = day || new Date().toISOString().slice(0, 10);
  const values = [];
  const params = [];
  let i = 1;
  for (const r of rows) {
    values.push(`($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++})`);
    const gid = r.guildId ? String(r.guildId) : "__global__";
    params.push(d, gid, r.command, r.ok || 0, r.err || 0, r.totalMs || 0, r.count || 0);
  }
  const sql = `
    INSERT INTO command_stats_daily (day, guild_id, command, ok, err, total_ms, count)
    VALUES ${values.join(",")}
    ON CONFLICT (day, guild_id, command)
    DO UPDATE SET
      ok = command_stats_daily.ok + EXCLUDED.ok,
      err = command_stats_daily.err + EXCLUDED.err,
      total_ms = command_stats_daily.total_ms + EXCLUDED.total_ms,
      count = command_stats_daily.count + EXCLUDED.count,
      updated_at = NOW()
  `;
  console.log("upsertCommandStatsDaily: Executing SQL:", sql);
  await p.query(sql, params);
}

export async function fetchCommandStats(guildId = null, limit = 50) {
  const p = getPool();
  const lim = Math.max(1, Math.min(200, Math.trunc(Number(limit) || 50)));
  let sql;
  let params;
  if (guildId) {
    sql = `SELECT command, ok, err, total_ms, count FROM command_stats
       WHERE guild_id = $1
       ORDER BY (ok + err) DESC
       LIMIT $2`;
    params = [String(guildId), lim];
  } else {
    sql = `SELECT command, ok, err, total_ms, count FROM command_stats
     WHERE guild_id = '__global__'
     ORDER BY (ok + err) DESC
     LIMIT $1`;
    params = [lim];
  }
  console.log("fetchCommandStats: Executing SQL:", sql, "with params:", params);
  const res = await p.query(
    sql,
    params
  );
  return res.rows.map(r => ({
    command: r.command,
    ok: Number(r.ok || 0),
    err: Number(r.err || 0),
    avgMs: r.count ? Math.round(Number(r.total_ms) / Number(r.count)) : 0
  }));
}

export async function fetchCommandStatsDaily(guildId, days = 7, limit = 50) {
  const p = getPool();
  const lim = Math.max(1, Math.min(200, Math.trunc(Number(limit) || 50)));
  const d = Math.max(1, Math.min(90, Math.trunc(Number(days) || 7)));
  const gid = guildId ? String(guildId) : "__global__";
  const sql = `SELECT command, SUM(ok) AS ok, SUM(err) AS err, SUM(total_ms) AS total_ms, SUM(count) AS count
     FROM command_stats_daily
     WHERE guild_id = $1 AND day >= (CURRENT_DATE - $2::int)
     GROUP BY command
     ORDER BY (SUM(ok) + SUM(err)) DESC
     LIMIT $3`;
  console.log("fetchCommandStatsDaily: Executing SQL:", sql, "with params:", [gid, d, lim]);
  const res = await p.query(
    sql,
    [gid, d, lim]
  );
  return res.rows.map(r => ({
    command: r.command,
    ok: Number(r.ok || 0),
    err: Number(r.err || 0),
    avgMs: r.count ? Math.round(Number(r.total_ms) / Number(r.count)) : 0
  }));
}

export async function insertAgentBot(agentId, token, clientId, tag) {
  const p = getPool();
  const encryptedToken = encrypt(token);
  const now = Date.now();
  const upsertSql = `
    INSERT INTO agent_bots (agent_id, token, client_id, tag, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (agent_id) DO UPDATE SET
      token = EXCLUDED.token,
      client_id = EXCLUDED.client_id,
      tag = EXCLUDED.tag,
      updated_at = EXCLUDED.updated_at
    RETURNING agent_id, token, client_id, tag, status, created_at, updated_at;
  `;
  console.log("insertAgentBot: Executing UPSERT SQL:", upsertSql, "with values:", agentId, "****", clientId, tag);
  const res = await p.query(
    upsertSql,
    [agentId, encryptedToken, clientId, tag, now, now]
  );
  const row = res.rows[0];
  return {
    agentId: row.agent_id,
    token: decrypt(row.token),
    clientId: row.client_id,
    tag: row.tag,
    status: row.status,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    operation: (row.created_at === now) ? 'inserted' : 'updated'
  };
}

export async function fetchAgentBots() {
  const p = getPool();
  const fetchSql = "SELECT agent_id, token, client_id, tag, status, created_at, updated_at FROM agent_bots";
  console.log("fetchAgentBots: Executing SQL:", fetchSql);
  const res = await p.query(fetchSql);
  return res.rows.map(row => ({
    ...row,
    token: decrypt(row.token),
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at)
  }));
}

export async function updateAgentBotStatus(agentId, status) {
  const p = getPool();
  const updateSql = "UPDATE agent_bots SET status = $1, updated_at = $2 WHERE agent_id = $3 RETURNING agent_id"; // RETURNING agent_id to check for affected rows
  console.log("updateAgentBotStatus: Executing SQL:", updateSql, "with values:", status, agentId);
  const res = await p.query(updateSql, [status, Date.now(), agentId]);
  return res.rowCount > 0; // Return true if updated, false if not found
}

export async function deleteAgentBot(agentId) {
  const p = getPool();
  const deleteSql = "DELETE FROM agent_bots WHERE agent_id = $1 RETURNING agent_id";
  console.log("deleteAgentBot: Executing SQL:", deleteSql, "with values:", agentId);
  const res = await p.query(deleteSql, [agentId]);
  console.log("deleteAgentBot: Query result - rowCount:", res.rowCount); // Add this log
  return res.rowCount > 0; // Return true if an agent was deleted, false otherwise
}

export async function upsertAgentRunner(runnerId, lastSeen, meta) {
  const p = getPool();
  const upsertSql = `INSERT INTO agent_runners (runner_id, last_seen, meta)
     VALUES ($1, $2, $3)
     ON CONFLICT (runner_id) DO UPDATE SET
       last_seen = EXCLUDED.last_seen,
       meta = EXCLUDED.meta`;
  console.log("upsertAgentRunner: Executing SQL:", upsertSql, "with values:", runnerId, lastSeen, meta);
  await p.query(
    upsertSql,
    [runnerId, lastSeen, meta]
  );
}

export async function fetchAgentRunners() {
  const p = getPool();
  const fetchSql = "SELECT runner_id, last_seen, meta FROM agent_runners";
  console.log("fetchAgentRunners: Executing SQL:", fetchSql);
  const res = await p.query(fetchSql);
  return res.rows.map(row => ({
    ...row,
    last_seen: Number(row.last_seen)
  }));
}

export async function deleteAgentRunner(runnerId) {
  const p = getPool();
  const deleteSql = "DELETE FROM agent_runners WHERE runner_id = $1 RETURNING runner_id"; // RETURNING runner_id to check for affected rows
  console.log("deleteAgentRunner: Executing SQL:", deleteSql, "with values:", runnerId);
  const res = await p.query(deleteSql, [runnerId]);
  return res.rowCount > 0; // Return true if a runner was deleted, false otherwise
}

export async function loadGuildDataPg(guildId, fallbackFactory) {
  const p = getPool();
  const selectSql = "SELECT data, rev FROM guild_settings WHERE guild_id = $1";
  console.log("loadGuildDataPg: Executing SQL:", selectSql, "with values:", guildId);
  const res = await p.query(selectSql, [guildId]);
  if (!res.rowCount) {
    const base = fallbackFactory();
    const insertSql = "INSERT INTO guild_settings (guild_id, data, rev) VALUES ($1, $2, $3) ON CONFLICT (guild_id) DO NOTHING";
    console.log("loadGuildDataPg (insert fallback): Executing SQL:", insertSql, "with values:", guildId, base, base.rev ?? 0);
    await p.query(
      insertSql,
      [guildId, base, base.rev ?? 0]
    );
    return base;
  }
  const row = res.rows[0];
  const data = row.data || fallbackFactory();
  data.rev = Number.isInteger(row.rev) ? row.rev : data.rev ?? 0;
  return data;
}

export async function saveGuildDataPg(guildId, data, normalizeFn, mergeOnConflict) {
  const p = getPool();
  const normalized = normalizeFn(data);
  const selectSql = "SELECT data, rev FROM guild_settings WHERE guild_id = $1";
  console.log("saveGuildDataPg (select current): Executing SQL:", selectSql, "with values:", guildId);
  const currentRes = await p.query(selectSql, [guildId]);

  if (!currentRes.rowCount) {
    const toWrite = { ...normalized, rev: (normalized.rev ?? 0) + 1 };
    const insertSql = "INSERT INTO guild_settings (guild_id, data, rev) VALUES ($1, $2, $3)";
    console.log("saveGuildDataPg (insert new): Executing SQL:", insertSql, "with values:", guildId, toWrite, toWrite.rev);
    await p.query(
      insertSql,
      [guildId, toWrite, toWrite.rev]
    );
    return toWrite;
  }

  const current = currentRes.rows[0].data || normalized;
  const currentRev = Number.isInteger(currentRes.rows[0].rev) ? currentRes.rows[0].rev : 0;
  const expectedRev = Number.isInteger(normalized.rev) ? normalized.rev : currentRev;

  let next = normalized;
  if (currentRev !== expectedRev) {
    next = mergeOnConflict(current, normalized);
    next.rev = currentRev;
  }

  const toWrite = { ...next, rev: currentRev + 1 };
  const updateSql = "UPDATE guild_settings SET data = $2, rev = $3, updated_at = NOW() WHERE guild_id = $1 AND rev = $4";
  console.log("saveGuildDataPg (update): Executing SQL:", updateSql, "with values:", guildId, toWrite, toWrite.rev, currentRev);
  const update = await p.query(
    updateSql,
    [guildId, toWrite, toWrite.rev, currentRev]
  );

  if (update.rowCount === 0) {
    // Retry once by reloading and merging
    const retrySelectSql = "SELECT data, rev FROM guild_settings WHERE guild_id = $1";
    console.log("saveGuildDataPg (retry select): Executing SQL:", retrySelectSql, "with values:", guildId);
    const retryCurrent = await p.query(retrySelectSql, [guildId]);
    const cur = retryCurrent.rows[0]?.data || current;
    const curRev = Number.isInteger(retryCurrent.rows[0]?.rev) ? retryCurrent.rows[0].rev : currentRev;
    const merged = mergeOnConflict(cur, toWrite);
    merged.rev = curRev;
    const final = { ...merged, rev: curRev + 1 };
    const finalUpdateSql = "UPDATE guild_settings SET data = $2, rev = $3, updated_at = NOW() WHERE guild_id = $1";
    console.log("saveGuildDataPg (final update): Executing SQL:", finalUpdateSql, "with values:", guildId, final, final.rev);
    await p.query(
      finalUpdateSql,
      [guildId, final, final.rev]
    );
    return final;
  }

  return toWrite;
}
