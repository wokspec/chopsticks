import { loadGuildData, saveGuildData } from "../utils/storage.js";

export async function getAssistantConfig(guildId) {
  const data = await loadGuildData(guildId);
  const cfg = data.assistant ?? {};
  return {
    enabled: Boolean(cfg.enabled),
    maxListenSec: Number.isFinite(cfg.maxListenSec) ? cfg.maxListenSec : 10,
    silenceMs: Number.isFinite(cfg.silenceMs) ? cfg.silenceMs : 1200,
    cooldownSec: Number.isFinite(cfg.cooldownSec) ? cfg.cooldownSec : 8,
    allowRoleIds: Array.isArray(cfg.allowRoleIds) ? cfg.allowRoleIds.map(String) : [],
    allowChannelIds: Array.isArray(cfg.allowChannelIds) ? cfg.allowChannelIds.map(String) : [],
    maxSessions: Number.isFinite(cfg.maxSessions) ? cfg.maxSessions : 2,
    voice: typeof cfg.voice === "string" && cfg.voice.trim() ? cfg.voice.trim() : null,
    voicePresets: Array.isArray(cfg.voicePresets) ? cfg.voicePresets.map(String).filter(Boolean) : [],
    channelVoices: typeof cfg.channelVoices === "object" && cfg.channelVoices
      ? { ...cfg.channelVoices }
      : {},
    profiles: typeof cfg.profiles === "object" && cfg.profiles ? { ...cfg.profiles } : {},
    channelProfiles: typeof cfg.channelProfiles === "object" && cfg.channelProfiles ? { ...cfg.channelProfiles } : {},
    voicePersonalities: typeof cfg.voicePersonalities === "object" && cfg.voicePersonalities
      ? { ...cfg.voicePersonalities }
      : {},
    rotation: typeof cfg.rotation === "object" && cfg.rotation ? { ...cfg.rotation } : { enabled: false, intervalSec: 60, channelVoices: {} }
  };
}

export async function setAssistantConfig(guildId, patch = {}) {
  const data = await loadGuildData(guildId);
  data.assistant ??= {};
  if (typeof patch.enabled === "boolean") data.assistant.enabled = patch.enabled;
  if (Number.isFinite(patch.maxListenSec)) {
    data.assistant.maxListenSec = Math.min(30, Math.max(2, Math.trunc(patch.maxListenSec)));
  }
  if (Number.isFinite(patch.silenceMs)) {
    data.assistant.silenceMs = Math.min(5000, Math.max(500, Math.trunc(patch.silenceMs)));
  }
  if (Number.isFinite(patch.cooldownSec)) {
    data.assistant.cooldownSec = Math.min(120, Math.max(0, Math.trunc(patch.cooldownSec)));
  }
  if (Array.isArray(patch.allowRoleIds)) {
    data.assistant.allowRoleIds = patch.allowRoleIds.map(String).filter(Boolean);
  }
  if (Array.isArray(patch.allowChannelIds)) {
    data.assistant.allowChannelIds = patch.allowChannelIds.map(String).filter(Boolean);
  }
  if (Number.isFinite(patch.maxSessions)) {
    data.assistant.maxSessions = Math.min(10, Math.max(1, Math.trunc(patch.maxSessions)));
  }
  if (typeof patch.voice === "string") {
    const v = patch.voice.trim();
    data.assistant.voice = v ? v : null;
  }
  if (Array.isArray(patch.voicePresets)) {
    data.assistant.voicePresets = patch.voicePresets.map(String).filter(Boolean);
  }
  if (patch.channelVoices && typeof patch.channelVoices === "object") {
    data.assistant.channelVoices = { ...patch.channelVoices };
  }
  if (patch.profiles && typeof patch.profiles === "object") {
    data.assistant.profiles = { ...patch.profiles };
  }
  if (patch.channelProfiles && typeof patch.channelProfiles === "object") {
    data.assistant.channelProfiles = { ...patch.channelProfiles };
  }
  if (patch.voicePersonalities && typeof patch.voicePersonalities === "object") {
    data.assistant.voicePersonalities = { ...patch.voicePersonalities };
  }
  if (patch.rotation && typeof patch.rotation === "object") {
    data.assistant.rotation = { ...patch.rotation };
  }
  await saveGuildData(guildId, data);
  return { ok: true, assistant: data.assistant };
}

export async function addAssistantRole(guildId, roleId) {
  const data = await loadGuildData(guildId);
  data.assistant ??= {};
  data.assistant.allowRoleIds ??= [];
  if (!data.assistant.allowRoleIds.includes(String(roleId))) {
    data.assistant.allowRoleIds.push(String(roleId));
  }
  await saveGuildData(guildId, data);
  return { ok: true, allowRoleIds: data.assistant.allowRoleIds };
}

export async function removeAssistantRole(guildId, roleId) {
  const data = await loadGuildData(guildId);
  data.assistant ??= {};
  data.assistant.allowRoleIds ??= [];
  data.assistant.allowRoleIds = data.assistant.allowRoleIds.filter(r => r !== String(roleId));
  await saveGuildData(guildId, data);
  return { ok: true, allowRoleIds: data.assistant.allowRoleIds };
}

export async function clearAssistantRoles(guildId) {
  const data = await loadGuildData(guildId);
  data.assistant ??= {};
  data.assistant.allowRoleIds = [];
  await saveGuildData(guildId, data);
  return { ok: true, allowRoleIds: [] };
}

export async function addAssistantChannel(guildId, channelId) {
  const data = await loadGuildData(guildId);
  data.assistant ??= {};
  data.assistant.allowChannelIds ??= [];
  if (!data.assistant.allowChannelIds.includes(String(channelId))) {
    data.assistant.allowChannelIds.push(String(channelId));
  }
  await saveGuildData(guildId, data);
  return { ok: true, allowChannelIds: data.assistant.allowChannelIds };
}

export async function removeAssistantChannel(guildId, channelId) {
  const data = await loadGuildData(guildId);
  data.assistant ??= {};
  data.assistant.allowChannelIds ??= [];
  data.assistant.allowChannelIds = data.assistant.allowChannelIds.filter(
    c => c !== String(channelId)
  );
  await saveGuildData(guildId, data);
  return { ok: true, allowChannelIds: data.assistant.allowChannelIds };
}

export async function clearAssistantChannels(guildId) {
  const data = await loadGuildData(guildId);
  data.assistant ??= {};
  data.assistant.allowChannelIds = [];
  await saveGuildData(guildId, data);
  return { ok: true, allowChannelIds: [] };
}

export async function setAssistantVoicePresets(guildId, presets) {
  const data = await loadGuildData(guildId);
  data.assistant ??= {};
  data.assistant.voicePresets = Array.isArray(presets) ? presets.map(String).filter(Boolean) : [];
  await saveGuildData(guildId, data);
  return { ok: true, voicePresets: data.assistant.voicePresets };
}

export async function setAssistantChannelVoice(guildId, channelId, voice) {
  const data = await loadGuildData(guildId);
  data.assistant ??= {};
  data.assistant.channelVoices ??= {};
  const v = String(voice || "").trim();
  if (!v) delete data.assistant.channelVoices[channelId];
  else data.assistant.channelVoices[channelId] = v;
  await saveGuildData(guildId, data);
  return { ok: true, channelVoices: data.assistant.channelVoices };
}

export async function clearAssistantChannelVoices(guildId) {
  const data = await loadGuildData(guildId);
  data.assistant ??= {};
  data.assistant.channelVoices = {};
  await saveGuildData(guildId, data);
  return { ok: true, channelVoices: {} };
}

export async function setAssistantProfile(guildId, name, profile) {
  const data = await loadGuildData(guildId);
  data.assistant ??= {};
  data.assistant.profiles ??= {};
  data.assistant.profiles[name] = profile;
  await saveGuildData(guildId, data);
  return { ok: true, profiles: data.assistant.profiles };
}

export async function removeAssistantProfile(guildId, name) {
  const data = await loadGuildData(guildId);
  data.assistant ??= {};
  data.assistant.profiles ??= {};
  delete data.assistant.profiles[name];
  await saveGuildData(guildId, data);
  return { ok: true, profiles: data.assistant.profiles };
}

export async function setAssistantChannelProfile(guildId, channelId, profileName) {
  const data = await loadGuildData(guildId);
  data.assistant ??= {};
  data.assistant.channelProfiles ??= {};
  const v = String(profileName || "").trim();
  if (!v) delete data.assistant.channelProfiles[channelId];
  else data.assistant.channelProfiles[channelId] = v;
  await saveGuildData(guildId, data);
  return { ok: true, channelProfiles: data.assistant.channelProfiles };
}

export async function clearAssistantChannelProfiles(guildId) {
  const data = await loadGuildData(guildId);
  data.assistant ??= {};
  data.assistant.channelProfiles = {};
  await saveGuildData(guildId, data);
  return { ok: true, channelProfiles: {} };
}

export async function setAssistantVoicePersonality(guildId, voice, prompt) {
  const data = await loadGuildData(guildId);
  data.assistant ??= {};
  data.assistant.voicePersonalities ??= {};
  const v = String(voice || "").trim();
  if (!v) return { ok: false };
  if (!prompt) delete data.assistant.voicePersonalities[v];
  else data.assistant.voicePersonalities[v] = String(prompt);
  await saveGuildData(guildId, data);
  return { ok: true, voicePersonalities: data.assistant.voicePersonalities };
}

export async function clearAssistantVoicePersonalities(guildId) {
  const data = await loadGuildData(guildId);
  data.assistant ??= {};
  data.assistant.voicePersonalities = {};
  await saveGuildData(guildId, data);
  return { ok: true, voicePersonalities: {} };
}

export async function setAssistantRotation(guildId, rotation) {
  const data = await loadGuildData(guildId);
  data.assistant ??= {};
  data.assistant.rotation = { ...rotation };
  await saveGuildData(guildId, data);
  return { ok: true, rotation: data.assistant.rotation };
}
