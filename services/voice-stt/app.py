import io
import os
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from faster_whisper import WhisperModel

MODEL_NAME = os.getenv("WHISPER_MODEL", "small")
DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
CPU_THREADS = int(os.getenv("WHISPER_CPU_THREADS", "4"))

app = FastAPI()
model = WhisperModel(MODEL_NAME, device=DEVICE, compute_type=COMPUTE_TYPE, cpu_threads=CPU_THREADS)

@app.post("/transcribe")
async def transcribe(req: Request):
    audio = await req.body()
    if not audio:
        return JSONResponse({"error": "empty_audio"}, status_code=400)
    audio_bytes = io.BytesIO(audio)
    segments, info = model.transcribe(audio_bytes)
    text = "".join([seg.text for seg in segments]).strip()
    if not text:
        return JSONResponse({"error": "empty_text"}, status_code=500)
    return {"text": text, "language": info.language}

@app.get("/health")
async def health():
    return {"ok": True}
