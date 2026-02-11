// src/music/config.js
import { loadGuildData, saveGuildData } from "../utils/storage.js";

export async function getMusicConfig(guildId) {
  const data = await loadGuildData(guildId);
  const mode = String(data?.music?.defaultMode ?? "open").toLowerCase() === "dj" ? "dj" : "open";
  const v = Number(data?.music?.defaultVolume ?? 100);
  const defaultVolume = Number.isFinite(v) ? Math.min(150, Math.max(0, Math.trunc(v))) : 100;
  const limits = data?.music?.limits ?? {};
  const maxQueue = Number(process.env.MUSIC_MAX_QUEUE ?? limits.maxQueue ?? 100);
  const maxTrackMinutes = Number(process.env.MUSIC_MAX_TRACK_MINUTES ?? limits.maxTrackMinutes ?? 20);
  const maxQueueMinutes = Number(process.env.MUSIC_MAX_QUEUE_MINUTES ?? limits.maxQueueMinutes ?? 120);
  return {
    defaultMode: mode,
    defaultVolume,
    limits: {
      maxQueue: Number.isFinite(maxQueue) ? Math.max(1, Math.trunc(maxQueue)) : 100,
      maxTrackMinutes: Number.isFinite(maxTrackMinutes) ? Math.max(1, Math.trunc(maxTrackMinutes)) : 20,
      maxQueueMinutes: Number.isFinite(maxQueueMinutes) ? Math.max(1, Math.trunc(maxQueueMinutes)) : 120
    }
  };
}

export async function setDefaultMusicMode(guildId, mode) {
  const m = String(mode ?? "").toLowerCase() === "dj" ? "dj" : "open";
  const data = await loadGuildData(guildId);
  data.music ??= {};
  data.music.defaultMode = m;
  await saveGuildData(guildId, data);
  return { ok: true, defaultMode: m };
}

export async function setDefaultMusicVolume(guildId, volume) {
  const v = Number(volume);
  if (!Number.isFinite(v)) return { ok: false, error: "bad-volume" };
  const clamped = Math.min(150, Math.max(0, Math.trunc(v)));
  const data = await loadGuildData(guildId);
  data.music ??= {};
  data.music.defaultVolume = clamped;
  await saveGuildData(guildId, data);
  return { ok: true, defaultVolume: clamped };
}
