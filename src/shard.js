import { ShardingManager } from "discord.js";
import "dotenv/config";

function parseShards(input) {
  const v = String(input ?? "").trim().toLowerCase();
  if (!v || v === "auto") return "auto";
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "auto";
  return Math.trunc(n);
}

const totalShards = parseShards(process.env.DISCORD_SHARDS ?? process.env.TOTAL_SHARDS);

const manager = new ShardingManager("./src/index.js", {
  token: process.env.DISCORD_TOKEN,
  totalShards,
  respawn: true,
  shardArgs: [],
  execArgv: []
});

manager.on("shardCreate", shard => {
  console.log(`[shard] started ${shard.id}`);
});

await manager.spawn();
