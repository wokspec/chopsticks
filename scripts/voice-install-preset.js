import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const presetName = process.argv[2];
if (!presetName) {
  console.error("Usage: node scripts/voice-install-preset.js <preset>");
  process.exit(1);
}

const presetsPath = path.join(process.cwd(), "scripts", "voice-presets.json");
const raw = await readFile(presetsPath, "utf8");
const presets = JSON.parse(raw);
const preset = presets[presetName];
if (!preset) {
  console.error("Unknown preset");
  process.exit(1);
}

const env = {
  ...process.env,
  VOICE_NAME: preset.voiceName || presetName,
  PIPER_BIN_URL: preset.binUrl,
  PIPER_MODEL_URL: preset.modelUrl,
  PIPER_CONFIG_URL: preset.configUrl
};

const child = spawn("bash", ["-lc", "./scripts/voice-setup.sh"], {
  stdio: "inherit",
  env
});

child.on("exit", code => process.exit(code ?? 1));
