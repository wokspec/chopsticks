// test/unit/ha21-silent-catches.test.js
// HA-21: Silent catch{} sweep — event handlers and server.js must log errors

import { describe, it } from "mocha";
import { strict as assert } from "assert";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
function src(f) {
  return readFileSync(resolve(__dirname, `../../${f}`), "utf8");
}

// ── guildMemberAdd ─────────────────────────────────────────────────────────

describe("HA-21 — guildMemberAdd.js silent catch sweep", () => {
  it("imports logger", () => {
    const code = src("src/events/guildMemberAdd.js");
    assert.ok(code.includes('from "../utils/logger.js"'), "must import from logger.js");
  });

  it("autorole catch logs error", () => {
    const code = src("src/events/guildMemberAdd.js");
    assert.ok(code.includes("guildMemberAdd: autorole error"), "autorole catch must log");
  });

  it("welcome catch logs error", () => {
    const code = src("src/events/guildMemberAdd.js");
    assert.ok(code.includes("guildMemberAdd: welcome error"), "welcome catch must log");
  });

  it("level reward catch logs warning", () => {
    const code = src("src/events/guildMemberAdd.js");
    assert.ok(code.includes("guildMemberAdd: level reward sync error"), "level reward catch must log");
  });

  it("automations catch logs error", () => {
    const code = src("src/events/guildMemberAdd.js");
    assert.ok(code.includes("guildMemberAdd: automations error"), "automations catch must log");
  });

  it("analytics catch logs warning", () => {
    const code = src("src/events/guildMemberAdd.js");
    assert.ok(code.includes("guildMemberAdd: analytics error"), "analytics catch must log");
  });
});

// ── roleDelete ─────────────────────────────────────────────────────────────

describe("HA-21 — roleDelete.js silent catch sweep", () => {
  it("imports logger", () => {
    const code = src("src/events/roleDelete.js");
    assert.ok(code.includes('from "../utils/logger.js"'), "must import from logger.js");
  });

  it("antinuke catch logs error", () => {
    const code = src("src/events/roleDelete.js");
    assert.ok(code.includes("roleDelete: antinuke error"), "antinuke catch must log");
  });

  it("no bare catch {} remains", () => {
    const code = src("src/events/roleDelete.js");
    assert.ok(!code.includes("} catch {}"), "no bare catch {} allowed");
  });
});

// ── channelDelete ──────────────────────────────────────────────────────────

describe("HA-21 — channelDelete.js silent catch sweep", () => {
  it("imports logger", () => {
    const code = src("src/events/channelDelete.js");
    assert.ok(code.includes('from "../utils/logger.js"'), "must import from logger.js");
  });

  it("antinuke catch logs error", () => {
    const code = src("src/events/channelDelete.js");
    assert.ok(code.includes("channelDelete: antinuke error"), "antinuke catch must log");
  });

  it("no bare catch {} remains", () => {
    const code = src("src/events/channelDelete.js");
    assert.ok(!code.includes("} catch {}"), "no bare catch {} allowed");
  });
});

// ── guildMemberRemove ──────────────────────────────────────────────────────

describe("HA-21 — guildMemberRemove.js silent catch sweep", () => {
  it("imports logger", () => {
    const code = src("src/events/guildMemberRemove.js");
    assert.ok(code.includes('from "../utils/logger.js"'), "must import from logger.js");
  });

  it("automations catch logs error", () => {
    const code = src("src/events/guildMemberRemove.js");
    assert.ok(code.includes("guildMemberRemove: automations error"), "automations catch must log");
  });

  it("goodbye/membercount catch logs error", () => {
    const code = src("src/events/guildMemberRemove.js");
    assert.ok(code.includes("guildMemberRemove: goodbye/membercount error"), "goodbye catch must log");
  });

  it("analytics catch logs warning", () => {
    const code = src("src/events/guildMemberRemove.js");
    assert.ok(code.includes("guildMemberRemove: analytics error"), "analytics catch must log");
  });
});

// ── voiceStateUpdate ───────────────────────────────────────────────────────

describe("HA-21 — voiceStateUpdate.js silent catch sweep", () => {
  it("vc_sessions catch logs warning", () => {
    const code = src("src/events/voiceStateUpdate.js");
    assert.ok(code.includes("voiceStateUpdate: vc_sessions stat error"), "vc_sessions catch must log");
  });

  it("xp/stat catch logs warning", () => {
    const code = src("src/events/voiceStateUpdate.js");
    assert.ok(code.includes("voiceStateUpdate: vc xp/stat error"), "vc xp catch must log");
  });
});

// ── server.js ──────────────────────────────────────────────────────────────

describe("HA-21 — server.js silent catch sweep", () => {
  it("imports logger from logger.js", () => {
    const code = src("src/dashboard/server.js");
    assert.ok(code.includes("logger") && code.includes('from "../utils/logger.js"'), "must import logger");
  });

  it("agent disconnect ws.terminate logs warning", () => {
    const code = src("src/dashboard/server.js");
    assert.ok(code.includes("agent disconnect: ws.terminate error"), "disconnect must log");
  });

  it("agent restart ws.terminate logs warning", () => {
    const code = src("src/dashboard/server.js");
    assert.ok(code.includes("agent restart: ws.terminate error"), "restart must log");
  });

  it("agent release stop request logs warning", () => {
    const code = src("src/dashboard/server.js");
    assert.ok(code.includes("agent release: stop request error"), "stop request must log");
  });

  it("agent releaseSession logs warning", () => {
    const code = src("src/dashboard/server.js");
    assert.ok(code.includes("agent release: releaseSession error"), "releaseSession must log");
  });
});
