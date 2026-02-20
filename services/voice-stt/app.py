import io
import os
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from faster_whisper import WhisperModel

# Model selection: small (fast/cheap), medium (balanced), large-v3 (best quality)
MODEL_NAME    = os.getenv("WHISPER_MODEL", "small")
DEVICE        = os.getenv("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE  = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
CPU_THREADS   = int(os.getenv("WHISPER_CPU_THREADS", "4"))
# Language hint speeds up transcription; leave blank for auto-detect
LANGUAGE_HINT = os.getenv("WHISPER_LANGUAGE", "") or None
# VAD filtering removes silence chunks and reduces hallucinations
VAD_FILTER    = os.getenv("WHISPER_VAD_FILTER", "true").lower() == "true"

app = FastAPI()
model = WhisperModel(MODEL_NAME, device=DEVICE, compute_type=COMPUTE_TYPE, cpu_threads=CPU_THREADS)

@app.post("/transcribe")
async def transcribe(req: Request):
    audio = await req.body()
    if not audio:
        return JSONResponse({"error": "empty_audio"}, status_code=400)
    audio_bytes = io.BytesIO(audio)
    segments, info = model.transcribe(
        audio_bytes,
        language=LANGUAGE_HINT,
        vad_filter=VAD_FILTER,
    )
    text = "".join([seg.text for seg in segments]).strip()
    if not text:
        return JSONResponse({"error": "empty_text"}, status_code=500)
    return {"text": text, "language": info.language, "model": MODEL_NAME}

@app.get("/health")
async def health():
    return {"ok": True, "model": MODEL_NAME, "device": DEVICE, "vad_filter": VAD_FILTER}

@app.get("/models")
async def models():
    return {
        "current": MODEL_NAME,
        "available": ["tiny", "base", "small", "medium", "large-v2", "large-v3"],
        "recommended": {
            "low_latency": "small",
            "balanced": "medium",
            "best_quality": "large-v3",
        }
    }
