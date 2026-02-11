import os
import subprocess
import tempfile
from fastapi import FastAPI, Request
from fastapi.responses import Response, JSONResponse

PIPER_BIN = os.getenv("PIPER_BIN", "/piper/piper")
PIPER_MODEL = os.getenv("PIPER_MODEL", "/piper/model.onnx")
PIPER_CONFIG = os.getenv("PIPER_CONFIG", "/piper/model.onnx.json")
VOICE_DIR = os.getenv("PIPER_VOICES_DIR", "/piper/voices")
TARGET_RATE = int(os.getenv("TTS_TARGET_RATE", "48000"))
TARGET_CHANNELS = int(os.getenv("TTS_TARGET_CHANNELS", "2"))

app = FastAPI()

@app.post("/tts")
async def tts(req: Request):
    data = await req.json()
    text = str(data.get("text", "")).strip()
    if not text:
        return JSONResponse({"error": "empty_text"}, status_code=400)

    if not os.path.exists(PIPER_BIN) or not os.path.exists(PIPER_MODEL):
        return JSONResponse({"error": "piper_not_configured"}, status_code=500)

    voice = str(data.get("voice", "") or "").strip()
    model_path = PIPER_MODEL
    config_path = PIPER_CONFIG
    if voice:
        vdir = os.path.join(VOICE_DIR, voice)
        cand_model = os.path.join(vdir, "model.onnx")
        cand_config = os.path.join(vdir, "model.onnx.json")
        if os.path.exists(cand_model):
            model_path = cand_model
            if os.path.exists(cand_config):
                config_path = cand_config

    speed = float(data.get("speed", 1.0) or 1.0)
    pitch = float(data.get("pitch", 1.0) or 1.0)
    speed = max(0.5, min(2.0, speed))
    pitch = max(0.5, min(2.0, pitch))

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as out:
        out_path = out.name
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as out2:
        resampled_path = out2.name

    cmd = [PIPER_BIN, "--model", model_path, "--output_file", out_path]
    if config_path:
        cmd.extend(["--config", config_path])

    try:
        proc = subprocess.run(cmd, input=text.encode("utf-8"), capture_output=True, check=False)
        if proc.returncode != 0:
            return JSONResponse({"error": "piper_failed", "detail": proc.stderr.decode("utf-8", "ignore")}, status_code=500)

        # Resample to 48kHz 16-bit stereo for Discord voice pipeline compatibility
        filters = []
        if pitch != 1.0:
            filters.append(f"asetrate=sample_rate*{pitch},atempo={1.0/pitch}")
        if speed != 1.0:
            filters.append(f"atempo={speed}")

        ffmpeg_cmd = [
            "ffmpeg",
            "-y",
            "-i",
            out_path,
            *(["-filter:a", ",".join(filters)] if filters else []),
            "-ar",
            str(TARGET_RATE),
            "-ac",
            str(TARGET_CHANNELS),
            "-sample_fmt",
            "s16",
            resampled_path
        ]
        proc2 = subprocess.run(ffmpeg_cmd, capture_output=True, check=False)
        if proc2.returncode != 0:
            return JSONResponse({"error": "ffmpeg_failed", "detail": proc2.stderr.decode("utf-8", "ignore")}, status_code=500)

        with open(resampled_path, "rb") as f:
            audio = f.read()
        return Response(content=audio, media_type="audio/wav")
    finally:
        try:
            os.remove(out_path)
        except Exception:
            pass
        try:
            os.remove(resampled_path)
        except Exception:
            pass

@app.get("/health")
async def health():
    return {"ok": True}
