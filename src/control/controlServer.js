import { WebSocketServer } from "ws";

const PORT = 3001;
const workers = new Map();

const wss = new WebSocketServer({ port: PORT });

console.log(`[control] listening on :${PORT}`);

wss.on("connection", ws => {
  let workerId = null;
  console.log("[control] socket connected");

  ws.on("message", raw => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      console.log("[control] invalid json");
      return;
    }

    if (msg.type === "REGISTER") {
      workerId = `w-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      workers.set(workerId, { ws, assigned: null });

      ws.send(JSON.stringify({
        type: "ASSIGN_ID",
        workerId
      }));

      console.log("[control] worker registered", workerId);
      return;
    }

    if (msg.type === "PLAY" || msg.type === "SKIP" || msg.type === "STOP") {
      const { guildId, channelId } = msg;
      if (!guildId || !channelId) return;

      const key = `${guildId}:${channelId}`;
      let assignedWs = null;

      for (const info of workers.values()) {
        if (info.assigned === key) {
          assignedWs = info.ws;
          break;
        }
      }

      if (!assignedWs) {
        for (const info of workers.values()) {
          if (!info.assigned) {
            info.assigned = key;
            assignedWs = info.ws;
            break;
          }
        }
      }

      if (assignedWs) {
        assignedWs.send(JSON.stringify(msg));
        console.log("[control] routed", msg.type, "to", key);
      }
    }
  });

  ws.on("close", () => {
    if (workerId) {
      workers.delete(workerId);
      console.log("[control] worker disconnected", workerId);
    }
  });
});
