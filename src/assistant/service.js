export function getAssistantSessionAgent(guildId, voiceChannelId) {
  const mgr = global.agentManager;
  if (!mgr) return { ok: false, reason: "agents-not-ready" };
  return mgr.getAssistantSessionAgent(guildId, voiceChannelId);
}

export function ensureAssistantAgent(guildId, voiceChannelId, { textChannelId, ownerUserId } = {}) {
  const mgr = global.agentManager;
  if (!mgr) return { ok: false, reason: "agents-not-ready" };
  return mgr.ensureAssistantAgent(guildId, voiceChannelId, { textChannelId, ownerUserId });
}

export function releaseAssistantSession(guildId, voiceChannelId) {
  const mgr = global.agentManager;
  if (!mgr) return;
  mgr.releaseAssistantSession(guildId, voiceChannelId);
}

export async function sendAgentCommand(agent, op, data) {
  const mgr = global.agentManager;
  if (!mgr) throw new Error("agents-not-ready");
  return mgr.request(agent, op, data);
}

export function countAssistantSessionsInGuild(guildId) {
  const mgr = global.agentManager;
  if (!mgr) return 0;
  let count = 0;
  for (const key of mgr.assistantSessions?.keys?.() ?? []) {
    const parts = String(key).split(":");
    if (String(parts[1]) === String(guildId)) count++;
  }
  return count;
}

export function formatAssistantError(reasonOrErr) {
  const msg = String(reasonOrErr?.message ?? reasonOrErr);
  if (msg === "agents-not-ready") return "Agents are still starting up.";
  if (msg === "no-agents-in-guild" || msg === "no-free-agents") {
    return "No idle agents available in this server.";
  }
  if (msg === "not-in-voice") return "You must be in the same voice channel.";
  if (msg === "assistant-busy") return "Assistant is busy. Try again.";
  if (msg === "assistant-no-audio") return "No audio detected.";
  if (msg === "assistant-empty") return "Nothing to say.";
  if (msg === "stt-not-configured") return "STT service not configured.";
  if (msg === "llm-not-configured") return "LLM service not configured.";
  if (msg === "tts-not-configured") return "TTS service not configured.";
  if (msg === "stt-failed" || msg === "llm-failed" || msg === "tts-failed") {
    return "Assistant backend failed.";
  }
  if (msg === "tts-bad-format") return "TTS output must be 48kHz 16-bit WAV.";
  if (msg === "voice-not-ready") return "Voice connection not ready yet. Try again.";
  if (msg === "agent-offline") return "Agent went offline. Try again.";
  if (msg === "assistant-disabled") return "Assistant is disabled for this server.";
  if (msg === "assistant-channel-not-allowed") return "Assistant is not allowed in this channel.";
  if (msg === "assistant-max-sessions") return "Assistant session limit reached.";
  if (msg === "assistant-not-owner") return "Only the session starter can change settings.";
  return "Assistant failed.";
}
