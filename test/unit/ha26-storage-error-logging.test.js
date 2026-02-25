// test/unit/ha26-storage-error-logging.test.js
// HA-26: Storage error logging — key silent catches in storage.js must log

import { describe, it } from "mocha";
import { strict as assert } from "assert";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
function src(f) {
  return readFileSync(resolve(__dirname, `../../${f}`), "utf8");
}

describe("HA-26 — storage.js error logging", () => {
  it("imports logger", () => {
    const code = src("src/utils/storage.js");
    assert.ok(
      code.includes('from "./logger.js"') || code.includes("from '../utils/logger.js'"),
      "must import from logger.js"
    );
  });

  it("loadGuildData PG fallback logs a warning", () => {
    const code = src("src/utils/storage.js");
    assert.ok(
      code.includes("storage: loadGuildData PG/cache fallback"),
      "loadGuildData catch must log a warning"
    );
  });

  it("ensureGuildData PG fallback logs a warning", () => {
    const code = src("src/utils/storage.js");
    assert.ok(
      code.includes("storage: ensureGuildData PG/cache fallback"),
      "ensureGuildData catch must log a warning"
    );
  });

  it("ensureGuildData auto-save failure logs a warning", () => {
    const code = src("src/utils/storage.js");
    assert.ok(
      code.includes("storage: ensureGuildData auto-save failed"),
      "auto-save catch must log a warning"
    );
  });

  it("saveGuildData PG failure logs an error before rethrowing", () => {
    const code = src("src/utils/storage.js");
    assert.ok(
      code.includes("storage: saveGuildData PG save failed"),
      "saveGuildData catch must log an error"
    );
  });

  it("fsync and backup catches remain best-effort (no logger required)", () => {
    const code = src("src/utils/storage.js");
    // These specific catches should still exist as silent (best-effort FS ops)
    assert.ok(code.includes("fs.fsyncSync"), "fsync operation should still be present");
    assert.ok(code.includes("fs.copyFileSync"), "backup copy operation should still be present");
  });
});
