// test/unit/command-registry-audit.test.js
// CI gate: every command with userPerms MUST have setDefaultMemberPermissions.
// Every command file MUST export a meta.category string.
import { describe, it } from "mocha";
import assert from "assert";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const CMD_DIR = new URL("../../src/commands/", import.meta.url).pathname;
const files = readdirSync(CMD_DIR).filter(f => f.endsWith(".js"));

describe("Command Registry Audit", () => {
  for (const f of files) {
    const raw = readFileSync(join(CMD_DIR, f), "utf8");
    const slug = f.replace(".js", "");

    it(`${slug}: has explicit meta.category`, () => {
      assert.match(raw, /category:\s*["'][a-z_]+["']/, `${f} is missing meta.category`);
    });

    const hasUserPerms = /userPerms:\s*\[/.test(raw) && !/userPerms:\s*\[\]/.test(raw);
    if (hasUserPerms) {
      it(`${slug}: has setDefaultMemberPermissions when userPerms set`, () => {
        assert.ok(
          raw.includes("setDefaultMemberPermissions"),
          `${f} has userPerms but no setDefaultMemberPermissions — Discord-side gate missing`
        );
      });
    }
  }
});
