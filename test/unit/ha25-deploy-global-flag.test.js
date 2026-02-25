// test/unit/ha25-deploy-global-flag.test.js
// HA-25: All command modules must have meta.deployGlobal explicitly set

import { describe, it } from "mocha";
import { strict as assert } from "assert";
import { readFileSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const commandsDir = resolve(__dirname, "../../src/commands");

function getCommandFiles() {
  return readdirSync(commandsDir).filter(f => f.endsWith(".js"));
}

describe("HA-25 — deployGlobal flag coverage", () => {
  it("all command files have deployGlobal in meta", () => {
    const files = getCommandFiles();
    const missing = [];
    for (const file of files) {
      const code = readFileSync(resolve(commandsDir, file), "utf8");
      if (!code.includes("deployGlobal")) {
        missing.push(file);
      }
    }
    assert.deepStrictEqual(
      missing,
      [],
      `Commands missing deployGlobal: ${missing.join(", ")}`
    );
  });

  it("no command has deployGlobal set without a meta export", () => {
    const files = getCommandFiles();
    const badFiles = [];
    for (const file of files) {
      const code = readFileSync(resolve(commandsDir, file), "utf8");
      if (code.includes("deployGlobal") && !code.includes("export const meta")) {
        badFiles.push(file);
      }
    }
    assert.deepStrictEqual(
      badFiles,
      [],
      `Commands with deployGlobal but no meta export: ${badFiles.join(", ")}`
    );
  });

  it("deployGlobal is a boolean (true or false), not a string", () => {
    const files = getCommandFiles();
    const badFiles = [];
    for (const file of files) {
      const code = readFileSync(resolve(commandsDir, file), "utf8");
      // Check for string values like deployGlobal: "true" or deployGlobal: "false"
      if (/deployGlobal\s*:\s*["']/.test(code)) {
        badFiles.push(file);
      }
    }
    assert.deepStrictEqual(
      badFiles,
      [],
      `Commands with deployGlobal as string: ${badFiles.join(", ")}`
    );
  });
});
