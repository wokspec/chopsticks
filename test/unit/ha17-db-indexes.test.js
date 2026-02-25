// test/unit/ha17-db-indexes.test.js
// HA-17: Economy DB index migration file verification

import { describe, it } from "mocha";
import { strict as assert } from "assert";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION = resolve(__dirname, "../../migrations/20260226_000000_economy_indexes.js");
const STORAGE_PG = resolve(__dirname, "../../src/utils/storage_pg.js");

describe("HA-17: Economy indexes — migration file", function () {
  it("migration file 20260226_000000_economy_indexes.js exists", function () {
    assert.ok(existsSync(MIGRATION), "economy indexes migration file not found");
  });

  it("migration has correct version string", function () {
    const src = readFileSync(MIGRATION, "utf8");
    assert.ok(src.includes("20260226_000000"), "migration missing version '20260226_000000'");
  });

  it("migration exports default with up() and version", function () {
    const src = readFileSync(MIGRATION, "utf8");
    assert.ok(src.includes("export default"), "migration missing default export");
    assert.ok(src.includes("async up("), "migration missing async up() method");
  });

  it("migration creates idx_daily_quests_user (user_id, day DESC)", function () {
    const src = readFileSync(MIGRATION, "utf8");
    assert.ok(
      src.includes("idx_daily_quests_user"),
      "idx_daily_quests_user index not in migration"
    );
    assert.ok(
      src.includes("user_daily_quests"),
      "migration missing user_daily_quests table reference"
    );
  });

  it("migration creates idx_transactions_from_time (from_user, timestamp DESC)", function () {
    const src = readFileSync(MIGRATION, "utf8");
    assert.ok(
      src.includes("idx_transactions_from_time"),
      "idx_transactions_from_time not in migration"
    );
  });

  it("migration creates idx_transactions_to_time (to_user, timestamp DESC)", function () {
    const src = readFileSync(MIGRATION, "utf8");
    assert.ok(
      src.includes("idx_transactions_to_time"),
      "idx_transactions_to_time not in migration"
    );
  });

  it("migration creates idx_inventory_user_item (user_id, item_id)", function () {
    const src = readFileSync(MIGRATION, "utf8");
    assert.ok(
      src.includes("idx_inventory_user_item"),
      "idx_inventory_user_item not in migration"
    );
  });

  it("migration creates idx_wallets_earned (total_earned DESC)", function () {
    const src = readFileSync(MIGRATION, "utf8");
    assert.ok(
      src.includes("idx_wallets_earned"),
      "idx_wallets_earned not in migration"
    );
  });

  it("all CREATE INDEX statements use IF NOT EXISTS (idempotent)", function () {
    const src = readFileSync(MIGRATION, "utf8");
    const creates = src.match(/CREATE INDEX(?!\s+IF NOT EXISTS)/g) || [];
    assert.equal(
      creates.length, 0,
      `${creates.length} CREATE INDEX without IF NOT EXISTS — not idempotent`
    );
  });
});

describe("HA-17: Economy indexes — existing core indexes in storage_pg.js", function () {
  it("idx_wallets_balance index exists (balance DESC for leaderboard)", function () {
    const src = readFileSync(STORAGE_PG, "utf8");
    assert.ok(src.includes("idx_wallets_balance"), "idx_wallets_balance missing from storage_pg.js");
  });

  it("idx_game_profiles_level index exists (level DESC, xp DESC)", function () {
    const src = readFileSync(STORAGE_PG, "utf8");
    assert.ok(src.includes("idx_game_profiles_level"), "idx_game_profiles_level missing from storage_pg.js");
  });

  it("idx_guild_xp_board compound index exists (guild_id, xp DESC)", function () {
    const src = readFileSync(STORAGE_PG, "utf8");
    assert.ok(src.includes("idx_guild_xp_board"), "idx_guild_xp_board missing from storage_pg.js");
  });

  it("idx_guild_stats_msgs index exists for messages leaderboard", function () {
    const src = readFileSync(STORAGE_PG, "utf8");
    assert.ok(src.includes("idx_guild_stats_msgs"), "idx_guild_stats_msgs missing from storage_pg.js");
  });

  it("idx_transactions_time index exists (timestamp DESC)", function () {
    const src = readFileSync(STORAGE_PG, "utf8");
    assert.ok(src.includes("idx_transactions_time"), "idx_transactions_time missing from storage_pg.js");
  });
});
