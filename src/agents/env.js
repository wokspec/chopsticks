// src/agents/env.js
import fs from "node:fs";
import path from "node:path";

/**
 * Token sources (highest priority first):
 * 1) AGENT_TOKENS (comma-separated)
 * 2) AGENT_TOKENS_FILE (one token per line; comments allowed with #)
 * 3) Explicit slots: AGENT_0001_TOKEN ... AGENT_0100_TOKEN (supports up to 100)
 */
export function readAgentTokensFromEnv(env = process.env) {
  const rawList = String(env.AGENT_TOKENS ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  if (rawList.length > 0) return rawList;

  const filePath = String(env.AGENT_TOKENS_FILE ?? "").trim();
  if (filePath) {
    const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    try {
      const lines = fs
        .readFileSync(abs, "utf8")
        .split(/\r?\n/g)
        .map(l => l.trim())
        .filter(Boolean)
        .filter(l => !l.startsWith("#"));
      if (lines.length > 0) return lines;
    } catch {
      // ignore
    }
  }

  // explicit slots so you can reason about which bots are deployed
  const out = [];
  for (let i = 1; i <= 100; i++) {
    const key = `AGENT_${String(i).padStart(4, "0")}_TOKEN`;
    const v = env[key];
    if (v) out.push(v);
  }
  return out;
}
