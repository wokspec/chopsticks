// test/unit/ha24-command-permissions.test.js
// HA-24: Command permission hardening — guild-mutating commands must have setDefaultMemberPermissions

import { describe, it } from "mocha";
import { strict as assert } from "assert";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
function src(f) {
  return readFileSync(resolve(__dirname, `../../${f}`), "utf8");
}

describe("HA-24 — autoresponder.js permission guard", () => {
  it("has setDefaultMemberPermissions", () => {
    const code = src("src/commands/autoresponder.js");
    assert.ok(code.includes("setDefaultMemberPermissions"), "must call setDefaultMemberPermissions");
  });
  it("requires ManageGuild or higher", () => {
    const code = src("src/commands/autoresponder.js");
    assert.ok(
      code.includes("ManageGuild") || code.includes("Administrator"),
      "must require ManageGuild or Administrator"
    );
  });
});

describe("HA-24 — autorole.js permission guard", () => {
  it("has setDefaultMemberPermissions", () => {
    const code = src("src/commands/autorole.js");
    assert.ok(code.includes("setDefaultMemberPermissions"), "must call setDefaultMemberPermissions");
  });
  it("requires ManageGuild or higher", () => {
    const code = src("src/commands/autorole.js");
    assert.ok(
      code.includes("ManageGuild") || code.includes("Administrator"),
      "must require ManageGuild or Administrator"
    );
  });
});

describe("HA-24 — antinuke.js permission guard", () => {
  it("has setDefaultMemberPermissions", () => {
    const code = src("src/commands/antinuke.js");
    assert.ok(code.includes("setDefaultMemberPermissions"), "must call setDefaultMemberPermissions");
  });
  it("requires Administrator", () => {
    const code = src("src/commands/antinuke.js");
    assert.ok(code.includes("Administrator"), "antinuke must require Administrator");
  });
});

describe("HA-24 — tickets.js permission guard", () => {
  it("has setDefaultMemberPermissions on the builder", () => {
    const code = src("src/commands/tickets.js");
    assert.ok(code.includes("setDefaultMemberPermissions"), "must call setDefaultMemberPermissions");
  });
  it("requires ManageGuild", () => {
    const code = src("src/commands/tickets.js");
    assert.ok(
      code.includes("ManageGuild") || code.includes("Administrator"),
      "must require ManageGuild or Administrator"
    );
  });
});

describe("HA-24 — welcome.js permission guard", () => {
  it("has setDefaultMemberPermissions", () => {
    const code = src("src/commands/welcome.js");
    assert.ok(code.includes("setDefaultMemberPermissions"), "must call setDefaultMemberPermissions");
  });
  it("requires ManageGuild", () => {
    const code = src("src/commands/welcome.js");
    assert.ok(
      code.includes("ManageGuild") || code.includes("Administrator"),
      "must require ManageGuild or Administrator"
    );
  });
});
