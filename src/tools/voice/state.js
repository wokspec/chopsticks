import {
  getVoiceState,
  saveVoiceState
} from "./schema.js";

/* ---------- LOCKS (PROCESS-LOCAL) ---------- */

const creationLocks = new Map();
const creationCooldowns = new Map();

function lockKey(guildId, lockId) {
  return `${guildId}:${lockId}`;
}

export function acquireCreationLock(guildId, lockId) {
  const key = lockKey(guildId, lockId);
  if (creationLocks.has(key)) return false;
  creationLocks.set(key, true);
  return true;
}

export function releaseCreationLock(guildId, lockId) {
  creationLocks.delete(lockKey(guildId, lockId));
}

export function canCreateTempChannel(guildId, userId, cooldownMs) {
  const ms = Number(cooldownMs);
  if (!Number.isFinite(ms) || ms <= 0) return true;
  const key = `${guildId}:${userId}`;
  const last = creationCooldowns.get(key) ?? 0;
  const now = Date.now();
  if (now - last < ms) return false;
  return true;
}

export function markTempChannelCreated(guildId, userId) {
  const key = `${guildId}:${userId}`;
  creationCooldowns.set(key, Date.now());
}

/* ---------- STATE ACCESS ---------- */

export function ensureVoiceState(_) {
  // NO-OP BY DESIGN
  // Schema is authoritative
}

/* ---------- TEMP CHANNEL MUTATION (SCHEMA-SAFE) ---------- */

export async function registerTempChannel(
  guildId,
  channelId,
  ownerId,
  lobbyId,
  voiceOverride = null
) {
  const voice = await (voiceOverride ?? getVoiceState(guildId));
  if (!voice.lobbies[lobbyId]) return;

  voice.tempChannels[channelId] = {
    ownerId,
    lobbyId
  };

  await saveVoiceState(guildId, voice);
}

export async function removeTempChannel(
  guildId,
  channelId,
  voiceOverride = null
) {
  const voice = await (voiceOverride ?? getVoiceState(guildId));

  if (voice.tempChannels[channelId]) {
    delete voice.tempChannels[channelId];
    await saveVoiceState(guildId, voice);
  }
}

export async function findUserTempChannel(
  guildId,
  userId,
  lobbyId,
  voiceOverride = null
) {
  const voice = await (voiceOverride ?? getVoiceState(guildId));
  for (const [channelId, temp] of Object.entries(
    voice.tempChannels
  )) {
    if (
      temp.ownerId === userId &&
      temp.lobbyId === lobbyId
    ) {
      return channelId;
    }
  }

  return null;
}
