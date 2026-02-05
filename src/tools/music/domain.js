import WebSocket from "ws";
import crypto from "node:crypto";
import { MSG } from "../../shared/protocol.js";

let ws = null;

function requireControlUrl() {
  const url = process.env.CONTROL_URL;
  if (!url) throw new Error("CONTROL_URL missing");
  return url;
}

function getSocket() {
  if (ws && ws.readyState === WebSocket.OPEN) return ws;

  ws = new WebSocket(requireControlUrl());
  return ws;
}

export function sendControl(action, payload) {
  const socket = getSocket();

  const msg = {
    type: MSG.COMMAND,
    id: crypto.randomUUID(),
    payload: {
      action,
      ...payload
    }
  };

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
    return;
  }

  socket.once("open", () => {
    socket.send(JSON.stringify(msg));
  });
}
