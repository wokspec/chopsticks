// test/unit/ha23-dashboard-api-validation.test.js
// HA-23: Dashboard API validation — Joi schemas added for 5 POST routes

import { describe, it } from "mocha";
import { strict as assert } from "assert";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
function src(f) {
  return readFileSync(resolve(__dirname, `../../${f}`), "utf8");
}

const code = src("src/dashboard/server.js");

describe("HA-23 — Joi schemas defined", () => {
  it("voiceLobbyPatchSchema is defined", () => {
    assert.ok(code.includes("voiceLobbyPatchSchema"), "must define voiceLobbyPatchSchema");
  });

  it("voiceLobbyAddSchema is defined", () => {
    assert.ok(code.includes("voiceLobbyAddSchema"), "must define voiceLobbyAddSchema");
  });

  it("xpConfigSchema is defined", () => {
    assert.ok(code.includes("xpConfigSchema"), "must define xpConfigSchema");
  });

  it("musicConfigSchema is defined (pre-existing)", () => {
    assert.ok(code.includes("musicConfigSchema"), "must define musicConfigSchema");
  });
});

describe("HA-23 — music/default route validation", () => {
  it("uses validateInput with musicConfigSchema", () => {
    const routeIdx = code.indexOf('"/api/guild/:id/music/default"');
    const controlIdx = code.indexOf('"/api/guild/:id/music/control"');
    const section = code.slice(routeIdx, controlIdx);
    assert.ok(section.includes("validateInput(musicConfigSchema"), "music/default must use validateInput(musicConfigSchema)");
  });

  it("returns 400 on validation failure", () => {
    const routeIdx = code.indexOf('"/api/guild/:id/music/default"');
    const controlIdx = code.indexOf('"/api/guild/:id/music/control"');
    const section = code.slice(routeIdx, controlIdx);
    assert.ok(section.includes('status(400)') && section.includes('"validation"'), "must return 400 with validation error");
  });
});

describe("HA-23 — voice/lobby/:channelId route validation", () => {
  it("uses validateInput with voiceLobbyPatchSchema", () => {
    const routeIdx = code.indexOf('"/api/guild/:id/voice/lobby/:channelId"');
    const addIdx = code.indexOf('"/api/guild/:id/voice/lobby/add"');
    const section = code.slice(routeIdx, addIdx);
    assert.ok(section.includes("validateInput(voiceLobbyPatchSchema"), "lobby patch must use validateInput(voiceLobbyPatchSchema)");
  });

  it("returns 400 on validation failure", () => {
    const routeIdx = code.indexOf('"/api/guild/:id/voice/lobby/:channelId"');
    const addIdx = code.indexOf('"/api/guild/:id/voice/lobby/add"');
    const section = code.slice(routeIdx, addIdx);
    assert.ok(section.includes('status(400)') && section.includes('"validation"'), "must return 400");
  });
});

describe("HA-23 — voice/lobby/add route validation", () => {
  it("uses validateInput with voiceLobbyAddSchema", () => {
    const addIdx = code.indexOf('"/api/guild/:id/voice/lobby/add"');
    const removeIdx = code.indexOf('"/api/guild/:id/voice/lobby/remove"');
    const section = code.slice(addIdx, removeIdx);
    assert.ok(section.includes("validateInput(voiceLobbyAddSchema"), "lobby add must use validateInput(voiceLobbyAddSchema)");
  });

  it("returns 400 on validation failure", () => {
    const addIdx = code.indexOf('"/api/guild/:id/voice/lobby/add"');
    const removeIdx = code.indexOf('"/api/guild/:id/voice/lobby/remove"');
    const section = code.slice(addIdx, removeIdx);
    assert.ok(section.includes('status(400)') && section.includes('"validation"'), "must return 400");
  });
});

describe("HA-23 — xp/config POST route validation", () => {
  it("uses validateInput with xpConfigSchema", () => {
    const postIdx = code.indexOf('app.post("/api/guild/:id/xp/config"');
    const actionsIdx = code.indexOf('"/api/guild/:id/actions"', postIdx);
    const section = code.slice(postIdx, actionsIdx);
    assert.ok(section.includes("validateInput(xpConfigSchema"), "xp/config must use validateInput(xpConfigSchema)");
  });

  it("returns 400 on validation failure", () => {
    const postIdx = code.indexOf('app.post("/api/guild/:id/xp/config"');
    const actionsIdx = code.indexOf('"/api/guild/:id/actions"', postIdx);
    const section = code.slice(postIdx, actionsIdx);
    assert.ok(section.includes('status(400)') && section.includes('"validation"'), "must return 400");
  });
});

describe("HA-23 — actions/:type/cost route validation", () => {
  it("validates cost is non-negative integer", () => {
    const costIdx = code.indexOf('"/api/guild/:id/actions/:type/cost"');
    const section = code.slice(costIdx, costIdx + 600);
    assert.ok(section.includes("Number.isInteger(cost)") || section.includes("isInteger"), "cost must be validated as integer");
    assert.ok(section.includes("cost < 0") || section.includes("min(0)"), "cost must reject negative values");
  });
});
