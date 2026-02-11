// src/tools/voice/schema.js

import {
  loadGuildData,
  saveGuildData
} from "../../utils/storage.js";

const VOICE_META = Symbol("voiceMeta");

function attachMeta(voice, guildId, rev) {
  if (!voice || typeof voice !== "object") return voice;
  const meta = voice[VOICE_META];
  if (!meta || meta.guildId !== guildId || meta.rev !== rev) {
    Object.defineProperty(voice, VOICE_META, {
      value: { guildId, rev },
      enumerable: false,
      writable: true
    });
  }
  return voice;
}

function readMeta(voice) {
  if (!voice || typeof voice !== "object") return null;
  return voice[VOICE_META] ?? null;
}

export function initGuildVoiceState(guildId) {
  return (async () => {
    const data = await loadGuildData(guildId);
    const saved = await saveGuildData(guildId, data);
    return attachMeta(saved.voice, guildId, saved.rev);
  })();
}

export async function getVoiceState(guildId) {
  const data = await loadGuildData(guildId);
  return attachMeta(data.voice, guildId, data.rev);
}

export async function saveVoiceState(guildId, voice) {
  const meta = readMeta(voice);
  const data = await loadGuildData(guildId);

  data.voice = voice;

  if (meta && meta.guildId === guildId && Number.isInteger(meta.rev)) {
    data.rev = meta.rev;
  }

  const saved = await saveGuildData(guildId, data);
  attachMeta(voice, guildId, saved.rev);
  return voice;
}
