// src/utils/textLlm.js
// LLM client for the voice-llm microservice.
// Supports multi-backend fallback: anthropic → openai → ollama (configured in voice-llm service).

function isValidHttpUrl(s) {
  try {
    const u = new URL(String(s));
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeGenerateUrl(url) {
  const base = String(url || "").trim().replace(/\/$/, "");
  if (!base) return "";
  if (base.endsWith("/generate")) return base;
  return `${base}/generate`;
}

export async function generateText({ prompt, system = "" } = {}) {
  const raw = String(process.env.TEXT_LLM_URL || process.env.VOICE_ASSIST_LLM_URL || "").trim();
  if (!raw) throw new Error("llm-not-configured");
  if (!isValidHttpUrl(raw)) throw new Error("llm-url-invalid");

  const url = normalizeGenerateUrl(raw);
  const body = JSON.stringify({ prompt: String(prompt || ""), system: String(system || "") });

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      const detail = data?.backends_tried
        ? data.backends_tried.map(b => `${b.backend||b.error}:${b.error||""}`).join("; ")
        : await res.text().catch(() => "");
      throw new Error(`llm-failed:${res.status}:${detail.slice(0, 160)}`);
    }

    const data = await res.json().catch(() => null);
    const text = String(data?.text || data?.response || "").trim();
    if (!text) throw new Error("llm-empty");
    // data.backend is the name of whichever backend actually responded
    return text;
  } finally {
    clearTimeout(t);
  }
}

