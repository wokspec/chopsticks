import { ShardingManager } from "discord.js";
import "dotenv/config";

const manager = new ShardingManager("./src/index.js", {
  token: process.env.DISCORD_TOKEN,
  totalShards: 5   // change to 10 later if needed
});

manager.on("shardCreate", shard => {
  console.log(`[shard] started ${shard.id}`);
});

await manager.spawn();
