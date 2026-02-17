import { describe, it } from "mocha";
import { strict as assert } from "assert";
import { data as triviaCommand, handleSelect, handleButton } from "../../src/commands/trivia.js";

describe("Trivia command definition", function () {
  it("exposes /trivia start + solo + versus + fleet + stop", function () {
    const json = triviaCommand.toJSON();
    assert.equal(json.name, "trivia");
    const subs = (json.options || []).filter(o => o.type === 1).map(o => o.name);
    assert.ok(subs.includes("start"));
    assert.ok(subs.includes("solo"));
    assert.ok(subs.includes("versus"));
    assert.ok(subs.includes("fleet"));
    assert.ok(subs.includes("stop"));
  });

  it("supports opponents option on start and fleet", function () {
    const json = triviaCommand.toJSON();
    const byName = new Map((json.options || []).filter(o => o.type === 1).map(o => [o.name, o]));
    const start = byName.get("start");
    const fleet = byName.get("fleet");
    assert.ok(start);
    assert.ok(fleet);
    const startOpp = (start.options || []).find(o => o.name === "opponents");
    const fleetOpp = (fleet.options || []).find(o => o.name === "opponents");
    assert.ok(startOpp);
    assert.ok(fleetOpp);
  });

  it("requires a user option for versus", function () {
    const json = triviaCommand.toJSON();
    const versus = (json.options || []).find(o => o.type === 1 && o.name === "versus");
    assert.ok(versus);
    const userOpt = (versus.options || []).find(o => o.name === "user");
    assert.ok(userOpt);
    assert.equal(userOpt.type, 6); // USER
    assert.equal(Boolean(userOpt.required), true);
  });

  it("exports component handlers", function () {
    assert.equal(typeof handleSelect, "function");
    assert.equal(typeof handleButton, "function");
  });
});
