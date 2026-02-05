// src/workers/workers.js
import WebSocket from "ws";
import { MSG } from "../shared/protocol.js";
import { validateMessage } from "../shared/validateMessage.js";

if (!process.env.CONTROL_URL) {
  throw new Error("CONTROL_URL missing");
}

const ws = new WebSocket(process.env.CONTROL_URL);
let workerId = null;

ws.on("open", () => {
  ws.send(JSON.stringify({ type: MSG.REGISTER }));
});

ws.on("message", raw => {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }

  if (!validateMessage(msg)) return;

  if (msg.type === MSG.ASSIGN_ID) {
    workerId = msg.workerId;
    console.log(`[worker] registered ${workerId}`);
    return;
  }

  if (msg.type !== MSG.COMMAND) return;

  const { action, guildId, channelId, query } = msg.payload;

  if (action === "PLAY") {
    console.log(`[worker:${workerId}] PLAY ${query} (${guildId}:${channelId})`);
  }

  if (action === "SKIP") {
    console.log(`[worker:${workerId}] SKIP (${guildId}:${channelId})`);
  }

  if (action === "STOP") {
    console.log(`[worker:${workerId}] STOP (${guildId}:${channelId})`);
  }

  ws.send(JSON.stringify({
    type: MSG.ACK,
    id: msg.id,
    workerId
  }));
});
