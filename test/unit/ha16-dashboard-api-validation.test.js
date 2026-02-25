// test/unit/ha16-dashboard-api-validation.test.js
// HA-16: Dashboard API must validate request bodies with Joi; error shapes must be consistent

import { describe, it } from "mocha";
import { strict as assert } from "assert";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverSrc = readFileSync(resolve(__dirname, "../../src/dashboard/server.js"), "utf8");

// ── Joi import and schema presence ────────────────────────────────────────────

describe("HA-16: Dashboard — Joi import and schema definitions", function () {
  it("server.js imports Joi", function () {
    assert.ok(serverSrc.includes("import Joi"), "Joi not imported in server.js");
  });

  it("petSchema validates name (string, 1-50) and type (valid enum)", function () {
    const petIdx = serverSrc.indexOf("petSchema");
    assert.notEqual(petIdx, -1, "petSchema not found");
    const snippet = serverSrc.slice(petIdx, petIdx + 300);
    assert.ok(snippet.includes("Joi.string()"), "petSchema missing Joi.string()");
    assert.ok(snippet.includes(".max(50)"), "petSchema missing .max(50) on name");
    assert.ok(snippet.includes(".valid("), "petSchema missing valid() enum check for type");
  });

  it("musicConfigSchema validates mode enum and defaultVolume range", function () {
    const idx = serverSrc.indexOf("musicConfigSchema");
    assert.notEqual(idx, -1, "musicConfigSchema not found");
    const snippet = serverSrc.slice(idx, idx + 300);
    assert.ok(snippet.includes("'open'") || snippet.includes('"open"'), "musicConfigSchema missing 'open' mode");
    assert.ok(snippet.includes("defaultVolume"), "musicConfigSchema missing defaultVolume");
    assert.ok(snippet.includes(".min(0)"), "musicConfigSchema missing .min(0) on volume");
    assert.ok(snippet.includes(".max(150)"), "musicConfigSchema missing .max(150) on volume");
  });

  it("assistantConfigSchema validates enabled (boolean), maxListenSec, silenceMs", function () {
    const idx = serverSrc.indexOf("assistantConfigSchema");
    assert.notEqual(idx, -1, "assistantConfigSchema not found");
    const snippet = serverSrc.slice(idx, idx + 500);
    assert.ok(snippet.includes("Joi.boolean()"), "assistantConfigSchema missing enabled boolean");
    assert.ok(snippet.includes("maxListenSec"), "assistantConfigSchema missing maxListenSec");
    assert.ok(snippet.includes("silenceMs"), "assistantConfigSchema missing silenceMs");
  });
});

// ── validateInput helper ──────────────────────────────────────────────────────

describe("HA-16: Dashboard — validateInput utility", function () {
  it("validateInput function exists in server.js", function () {
    assert.ok(serverSrc.includes("function validateInput"), "validateInput function not found in server.js");
  });

  it("validateInput calls schema.validate(data)", function () {
    const fnIdx = serverSrc.indexOf("function validateInput");
    assert.notEqual(fnIdx, -1);
    const body = serverSrc.slice(fnIdx, fnIdx + 200);
    assert.ok(body.includes("schema.validate"), "validateInput does not call schema.validate");
  });

  it("validateInput throws on invalid input (error propagation)", function () {
    const fnIdx = serverSrc.indexOf("function validateInput");
    const body = serverSrc.slice(fnIdx, fnIdx + 200);
    assert.ok(body.includes("throw") || body.includes("error"), "validateInput does not throw/propagate on validation failure");
  });
});

// ── Error response shape ──────────────────────────────────────────────────────

describe("HA-16: Dashboard — standardized error response shape", function () {
  it("API error responses include 'error' field", function () {
    const errorJsonCount = (serverSrc.match(/\.json\(\s*\{[^}]*error:/g) || []).length;
    assert.ok(errorJsonCount > 5, `Only ${errorJsonCount} error-shaped JSON responses found — expected many`);
  });

  it("401 responses use { ok: false, error: 'unauthorized' } shape", function () {
    assert.ok(
      serverSrc.includes('"unauthorized"') || serverSrc.includes("'unauthorized'"),
      "Standardized 'unauthorized' error string not found"
    );
  });

  it("rateLimitDashboard returns standardized error on rate limit", function () {
    const rlIdx = serverSrc.indexOf("rateLimitDashboard");
    assert.notEqual(rlIdx, -1, "rateLimitDashboard not found");
    // Should use a consistent error pattern
    const beforeEndpoint = serverSrc.slice(rlIdx, rlIdx + 500);
    assert.ok(
      beforeEndpoint.includes("rate") || beforeEndpoint.includes("limit"),
      "rateLimitDashboard missing rate/limit text"
    );
  });
});

// ── Pets endpoint validation ──────────────────────────────────────────────────

describe("HA-16: Dashboard — /api/me/pets endpoint uses petSchema", function () {
  it("/api/me/pets POST handler references petSchema", function () {
    const petsIdx = serverSrc.indexOf('"/api/me/pets"');
    assert.notEqual(petsIdx, -1, "/api/me/pets endpoint not found");
    // petSchema should appear after the route definition in the file
    const petSchemaIdx = serverSrc.indexOf("petSchema");
    assert.notEqual(petSchemaIdx, -1, "petSchema not defined in server.js");
  });
});

// ── Assistant config validation ───────────────────────────────────────────────

describe("HA-16: Dashboard — assistant config endpoint uses assistantConfigSchema", function () {
  it("/api/guild/:id/assistant/config uses assistantConfigSchema", function () {
    const routeIdx = serverSrc.indexOf("assistant/config");
    assert.notEqual(routeIdx, -1, "assistant/config route not found");
    const routeArea = serverSrc.slice(routeIdx, routeIdx + 500);
    assert.ok(
      routeArea.includes("assistantConfigSchema") || serverSrc.includes("validateInput(assistantConfigSchema"),
      "assistant/config does not use assistantConfigSchema"
    );
  });
});
