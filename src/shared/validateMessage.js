import { MSG } from "./protocol.js";

const VALID_TYPES = new Set(Object.values(MSG));

export function validateMessage(msg) {
  if (typeof msg !== "object" || msg === null) return false;

  if (typeof msg.type !== "string") return false;
  if (!VALID_TYPES.has(msg.type)) return false;

  if ("id" in msg && typeof msg.id !== "string") return false;
  if ("workerId" in msg && typeof msg.workerId !== "string") return false;
  if ("payload" in msg && typeof msg.payload !== "object") return false;

  return true;
}
