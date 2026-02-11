import { cacheIncr } from "./cache.js";

const memory = new Map();

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function memKey(key, windowSec) {
  return `${key}:${windowSec}`;
}

function memGet(key, windowSec) {
  const k = memKey(key, windowSec);
  const v = memory.get(k);
  if (!v) return null;
  if (v.resetAt <= nowSec()) {
    memory.delete(k);
    return null;
  }
  return v;
}

function memSet(key, windowSec, count) {
  const k = memKey(key, windowSec);
  const resetAt = nowSec() + windowSec;
  memory.set(k, { count, resetAt });
  return { count, resetAt };
}

export async function checkRateLimit(key, limit, windowSec) {
  const lim = Math.max(1, Math.trunc(Number(limit) || 1));
  const win = Math.max(1, Math.trunc(Number(windowSec) || 1));

  const redisCount = await cacheIncr(`rl:${key}:${win}`, win);
  if (typeof redisCount === "number") {
    const remaining = Math.max(0, lim - redisCount);
    return { ok: redisCount <= lim, remaining, resetIn: win };
  }

  const existing = memGet(key, win);
  if (!existing) {
    memSet(key, win, 1);
    return { ok: true, remaining: lim - 1, resetIn: win };
  }

  if (existing.count + 1 > lim) {
    return { ok: false, remaining: 0, resetIn: Math.max(1, existing.resetAt - nowSec()) };
  }

  existing.count += 1;
  return { ok: true, remaining: lim - existing.count, resetIn: Math.max(1, existing.resetAt - nowSec()) };
}

