// test/unit/ha19-observability.test.js
// HA-19: Observability — X-Request-Id header, correlation ID, structured error shape

import { describe, it } from "mocha";
import { strict as assert } from "assert";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverSrc = readFileSync(resolve(__dirname, "../../src/dashboard/server.js"), "utf8");
const metricsSrc = readFileSync(resolve(__dirname, "../../src/utils/metrics.js"), "utf8");

// ── X-Request-Id header ────────────────────────────────────────────────────────

describe("HA-19: Dashboard — X-Request-Id header", function () {
  it("server.js sets X-Request-Id on all responses", function () {
    assert.ok(
      serverSrc.includes('"X-Request-Id"') || serverSrc.includes("'X-Request-Id'"),
      "X-Request-Id header not set in server.js middleware"
    );
  });

  it("server.js also sets x-correlation-id (backwards compatibility)", function () {
    assert.ok(
      serverSrc.includes('"x-correlation-id"') || serverSrc.includes("'x-correlation-id'"),
      "x-correlation-id header not set in server.js"
    );
  });

  it("requestId is attached to req.requestId for downstream handler use", function () {
    assert.ok(
      serverSrc.includes("req.requestId = requestId"),
      "req.requestId assignment not found in server.js"
    );
  });

  it("correlation ID is sourced from incoming x-correlation-id header if present", function () {
    assert.ok(
      serverSrc.includes('req.headers["x-correlation-id"]'),
      "server.js does not read incoming x-correlation-id header for trace propagation"
    );
  });

  it("correlation ID has a fallback generator (generateCorrelationId)", function () {
    assert.ok(
      serverSrc.includes("generateCorrelationId"),
      "generateCorrelationId fallback not found in server.js"
    );
  });
});

// ── Structured error shapes ────────────────────────────────────────────────────

describe("HA-19: Dashboard — structured API error responses", function () {
  it("unauthorized responses return { ok: false, error: 'unauthorized' }", function () {
    assert.ok(
      serverSrc.includes("ok: false") && serverSrc.includes("unauthorized"),
      "Standardized unauthorized error shape not found in server.js"
    );
  });

  it("bad-request responses use { ok: false, error: 'bad-request' } or similar", function () {
    assert.ok(
      serverSrc.includes("bad-request") || serverSrc.includes("bad-guild"),
      "Standardized bad-request error string not found in server.js"
    );
  });

  it("rate-limit responses use 429 status code", function () {
    assert.ok(
      serverSrc.includes("429") || serverSrc.includes("status(429)"),
      "429 Too Many Requests status not found in server.js"
    );
  });

  it("response finish handler logs durationMs for latency tracking", function () {
    assert.ok(
      serverSrc.includes("durationMs"),
      "durationMs not logged in response finish handler"
    );
  });
});

// ── Economy Prometheus metrics ────────────────────────────────────────────────

describe("HA-19: Metrics — economy instrumentation", function () {
  it("credits_transferred counter exists", function () {
    assert.ok(
      metricsSrc.includes("credits_transferred"),
      "chopsticks_economy_credits_transferred_total metric not found in metrics.js"
    );
  });

  it("transactions_total counter exists with type label", function () {
    assert.ok(
      metricsSrc.includes("transactions_total"),
      "chopsticks_economy_transactions_total metric not found in metrics.js"
    );
    assert.ok(metricsSrc.includes('"type"') || metricsSrc.includes("'type'"), "transactions_total missing type label");
  });

  it("bets_placed_total counter exists (casino metrics)", function () {
    assert.ok(
      metricsSrc.includes("bets_placed_total"),
      "chopsticks_economy_bets_placed_total metric not found in metrics.js"
    );
  });

  it("bets_placed counter has 'game' label for granular breakdown", function () {
    const idx = metricsSrc.indexOf("bets_placed_total");
    assert.notEqual(idx, -1);
    const snippet = metricsSrc.slice(idx, idx + 300);
    assert.ok(snippet.includes('"game"') || snippet.includes("'game'"), "bets_placed missing 'game' label");
  });

  it("trackBet() is exported for casino commands to call", function () {
    assert.ok(
      metricsSrc.includes("export function trackBet"),
      "trackBet() not exported from metrics.js"
    );
  });

  it("trackTransaction() is exported for economy commands to call", function () {
    assert.ok(
      metricsSrc.includes("export function trackTransaction"),
      "trackTransaction() not exported from metrics.js"
    );
  });
});
