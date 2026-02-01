// src/deploy-commands.js
import { REST, Routes } from "discord.js";
import { config } from "dotenv";

import { voiceCommand } from "./tools/voice/commands.js";
import { levelCommand } from "./tools/leveling/commands.js";

config();

const commands = [
  voiceCommand.data.toJSON(),
  levelCommand.data.toJSON()
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("Deploying GLOBAL commands...");

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log("Global commands deployed.");
  } catch (error) {
    console.error(error);
  }
})();
