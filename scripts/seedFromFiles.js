import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { ensureSchema, saveGuildDataPg } from "../src/utils/storage_pg.js";
import { normalizeGuildData, mergeGuildData } from "../src/utils/storage.js";

const dataDir = path.join(process.cwd(), "data");

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isFile() && d.name.endsWith(".json"))
    .map(d => d.name);
}

function parseGuildId(filename) {
  return filename.replace(/\.json$/, "");
}

async function run() {
  await ensureSchema();

  const files = listJsonFiles(dataDir);
  if (files.length === 0) {
    console.log("No JSON files found in ./data");
    return;
  }

  let ok = 0;
  let fail = 0;

  for (const file of files) {
    const guildId = parseGuildId(file);
    if (!guildId) continue;

    try {
      const raw = fs.readFileSync(path.join(dataDir, file), "utf8");
      const json = JSON.parse(raw);
      const normalized = normalizeGuildData(json);
      await saveGuildDataPg(guildId, normalized, normalizeGuildData, mergeGuildData);
      ok += 1;
    } catch (err) {
      fail += 1;
      console.error(`[seed] failed for ${file}:`, err?.message ?? err);
    }
  }

  console.log(`Seed complete: ok=${ok} fail=${fail}`);
}

run().catch(err => {
  console.error("Seed failed:", err?.message ?? err);
  process.exitCode = 1;
});
