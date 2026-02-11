import express from "express";
import { request } from "undici";

const app = express();
app.use(express.json({ limit: "2mb" }));

const OLLAMA_URL = (process.env.OLLAMA_URL || "http://ollama:11434").replace(/\/$/, "");
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";
const OLLAMA_OPTIONS = process.env.OLLAMA_OPTIONS || "";

app.post("/generate", async (req, res) => {
  const prompt = String(req.body?.prompt || "").trim();
  const system = String(req.body?.system || "").trim();
  if (!prompt) return res.status(400).json({ error: "missing_prompt" });

  try {
    const body = {
      model: OLLAMA_MODEL,
      prompt,
      system: system || undefined,
      stream: false
    };
    if (OLLAMA_OPTIONS) {
      try {
        body.options = JSON.parse(OLLAMA_OPTIONS);
      } catch {}
    }

    const r = await request(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (r.statusCode >= 400) {
      const t = await r.body.text().catch(() => "");
      return res.status(500).json({ error: "ollama_failed", detail: t });
    }

    const data = await r.body.json().catch(() => null);
    const text = String(data?.response || "").trim();
    if (!text) return res.status(500).json({ error: "empty_response" });
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: "llm_error", detail: String(err?.message || err) });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

const port = Number(process.env.PORT || 9001);
app.listen(port, () => {
  console.log(`[voice-llm] listening on :${port}`);
});
