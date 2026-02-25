// test/unit/ha22-input-sanitization.test.js
// HA-22: Input sanitization sweep — echo.js, note.js, customcmd.js

import { describe, it } from "mocha";
import { strict as assert } from "assert";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
function src(f) {
  return readFileSync(resolve(__dirname, `../../${f}`), "utf8");
}

// ── echo.js ────────────────────────────────────────────────────────────────

describe("HA-22 — echo.js input sanitization", () => {
  it("imports sanitizeString", () => {
    const code = src("src/commands/echo.js");
    assert.ok(code.includes("sanitizeString"), "must import sanitizeString");
  });

  it("applies sanitizeString to text input", () => {
    const code = src("src/commands/echo.js");
    assert.ok(code.includes("sanitizeString(interaction.options.getString"), "must sanitize getString output");
  });

  it("applies length limit (2000 chars)", () => {
    const code = src("src/commands/echo.js");
    assert.ok(code.includes(".slice(0, 2000)"), "must enforce 2000 char limit");
  });
});

// ── note.js ────────────────────────────────────────────────────────────────

describe("HA-22 — note.js input sanitization", () => {
  it("imports sanitizeString", () => {
    const code = src("src/commands/note.js");
    assert.ok(code.includes("sanitizeString"), "must import sanitizeString");
  });

  it("applies sanitizeString to note text", () => {
    const code = src("src/commands/note.js");
    assert.ok(code.includes("sanitizeString(interaction.options.getString"), "must sanitize note text");
  });

  it("applies length limit (1000 chars)", () => {
    const code = src("src/commands/note.js");
    assert.ok(code.includes(".slice(0, 1000)"), "must enforce 1000 char limit");
  });
});

// ── customcmd.js ───────────────────────────────────────────────────────────

describe("HA-22 — customcmd.js input sanitization", () => {
  it("imports sanitizeString", () => {
    const code = src("src/commands/customcmd.js");
    assert.ok(code.includes("sanitizeString"), "must import sanitizeString");
  });

  it("applies sanitizeString to response on create", () => {
    const code = src("src/commands/customcmd.js");
    const createIdx = code.indexOf("sub === \"create\"");
    const editIdx = code.indexOf("sub === \"edit\"");
    // Should appear between create and edit section
    const createSection = code.slice(createIdx, editIdx);
    assert.ok(createSection.includes("sanitizeString"), "create must sanitize response");
  });

  it("applies sanitizeString to response on edit", () => {
    const code = src("src/commands/customcmd.js");
    const editIdx = code.indexOf("sub === \"edit\"");
    const editSection = code.slice(editIdx, editIdx + 500);
    assert.ok(editSection.includes("sanitizeString"), "edit must sanitize response");
  });

  it("applies length limit (2000 chars) in create", () => {
    const code = src("src/commands/customcmd.js");
    const createIdx = code.indexOf("sub === \"create\"");
    const editIdx = code.indexOf("sub === \"edit\"");
    const createSection = code.slice(createIdx, editIdx);
    assert.ok(createSection.includes(".slice(0, 2000)"), "create must enforce 2000 char limit");
  });

  it("applies length limit (2000 chars) in edit", () => {
    const code = src("src/commands/customcmd.js");
    const editIdx = code.indexOf("sub === \"edit\"");
    const editSection = code.slice(editIdx, editIdx + 500);
    assert.ok(editSection.includes(".slice(0, 2000)"), "edit must enforce 2000 char limit");
  });
});
