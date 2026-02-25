// test/unit/ha20-elite-patterns.test.js
// HA-20: Named constants for magic numbers, meta.category on all commands, GATHER_COOLDOWN exported

import { describe, it } from "mocha";
import { strict as assert } from "assert";
import { readFileSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
function src(f) { return readFileSync(resolve(__dirname, `../../${f}`), "utf8"); }

// ── No bare millisecond magic numbers in economy commands ─────────────────────

describe("HA-20: Named constants — no magic millisecond cooldowns in game.js", function () {
  it("game.js gather cooldown uses GATHER_COOLDOWN constant, not 5*60*1000", function () {
    const code = src("src/commands/game.js");
    // Raw 5 * 60 * 1000 (300000) should not appear as an inline cooldown arg
    const hasMagicGather = /setCooldown\([^,]+,\s*["']gather["'],\s*(?:5\s*\*\s*60\s*\*\s*1000|300000)/.test(code);
    assert.ok(!hasMagicGather, "game.js still uses raw 5*60*1000 for gather cooldown");
  });

  it("game.js imports GATHER_COOLDOWN from gather.js", function () {
    const code = src("src/commands/game.js");
    assert.ok(
      code.includes("GATHER_COOLDOWN") && code.includes("gather.js"),
      "game.js does not import GATHER_COOLDOWN from gather.js"
    );
  });

  it("gather.js exports GATHER_COOLDOWN as a named constant", function () {
    const code = src("src/commands/gather.js");
    assert.ok(
      code.includes("export const GATHER_COOLDOWN"),
      "gather.js does not export GATHER_COOLDOWN"
    );
  });
});

describe("HA-20: Named constants — BATTLE_COOLDOWN in fight.js", function () {
  it("fight.js exports BATTLE_COOLDOWN as a named constant", function () {
    const code = src("src/commands/fight.js");
    assert.ok(code.includes("BATTLE_COOLDOWN"), "fight.js missing BATTLE_COOLDOWN constant");
    assert.ok(
      code.includes("export") && code.includes("BATTLE_COOLDOWN"),
      "fight.js BATTLE_COOLDOWN not exported"
    );
  });

  it("fight.js BATTLE_COOLDOWN has a comment explaining the value", function () {
    const code = src("src/commands/fight.js");
    const idx = code.indexOf("BATTLE_COOLDOWN");
    const snippet = code.slice(idx, idx + 100);
    assert.ok(snippet.includes("//") || snippet.includes("minute"), "BATTLE_COOLDOWN missing explanatory comment");
  });
});

describe("HA-20: Named constants — WORK_COOLDOWN in jobs.js", function () {
  it("economy/jobs.js exports WORK_COOLDOWN", function () {
    const code = src("src/economy/jobs.js");
    assert.ok(
      code.includes("WORK_COOLDOWN"),
      "economy/jobs.js missing WORK_COOLDOWN export"
    );
  });
});

// ── All commands have meta.category ──────────────────────────────────────────

describe("HA-20: meta.category — all commands declare a category", function () {
  it("no command file is missing category: in its meta or export", function () {
    const dir = resolve(__dirname, "../../src/commands");
    const files = readdirSync(dir).filter(f => f.endsWith(".js"));
    const missing = [];
    for (const f of files) {
      const code = readFileSync(resolve(dir, f), "utf8");
      // Skip files that don't look like command files (no SlashCommandBuilder or execute)
      if (!code.includes("execute") && !code.includes("SlashCommandBuilder")) continue;
      if (!code.includes("category:") && !code.includes("category :")) {
        missing.push(f);
      }
    }
    assert.deepEqual(missing, [], `Commands missing meta.category: ${missing.join(", ")}`);
  });
});

// ── Metrics trackBet is available ─────────────────────────────────────────────

describe("HA-20: Metrics — casino bet tracking hook available", function () {
  it("metrics.js exports trackBet for casino instrumentation", function () {
    const code = src("src/utils/metrics.js");
    assert.ok(code.includes("export function trackBet"), "trackBet not exported from metrics.js");
  });

  it("bets_placed_total counter uses labelNames with 'game'", function () {
    const code = src("src/utils/metrics.js");
    const idx = code.indexOf("bets_placed");
    assert.notEqual(idx, -1, "bets_placed counter not found");
    const snippet = code.slice(idx, idx + 200);
    assert.ok(snippet.includes("game"), "bets_placed counter missing 'game' label");
  });
});

// ── Code pattern sanity: PANEL_TTL_SEC uses named constant ────────────────────

describe("HA-20: Named constants — PANEL_TTL_SEC in game.js", function () {
  it("game.js uses PANEL_TTL_SEC named constant for panel TTL", function () {
    const code = src("src/commands/game.js");
    assert.ok(code.includes("PANEL_TTL_SEC"), "game.js missing PANEL_TTL_SEC constant");
    // Should not be an inline magic number like 3600
    const idx = code.indexOf("PANEL_TTL_SEC");
    const snippet = code.slice(idx, idx + 100);
    assert.ok(snippet.includes("60") || snippet.includes("hour") || snippet.includes("="), "PANEL_TTL_SEC not defined properly");
  });
});
