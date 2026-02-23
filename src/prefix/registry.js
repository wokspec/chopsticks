import {
  isValidAliasName,
  normalizeAliasName,
  normalizePrefixValue,
  resolveAliasedCommand
} from "./hardening.js";

import metaCommands from "./commands/meta.js";
import utilityCommands from "./commands/utility.js";
import funCommands from "./commands/fun.js";
import infoCommands from "./commands/info.js";
import modCommands from "./commands/mod.js";
import serverCommands from "./commands/server.js";

export async function getPrefixCommands() {
  const map = new Map();
  const allCommands = [
    ...metaCommands,
    ...utilityCommands,
    ...funCommands,
    ...infoCommands,
    ...modCommands,
    ...serverCommands,
  ];
  for (const cmdDef of allCommands) {
    map.set(cmdDef.name, cmdDef);
  }
  return map;
}
