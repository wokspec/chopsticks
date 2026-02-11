# Voice Stack (Self-hosted)

This stack wires STT + LLM + TTS locally. It is CPU-friendly by default and can be upgraded to GPU if available.

## Services
- **STT**: Faster-Whisper (CPU) – `/transcribe`
- **LLM**: Ollama – `/api/generate`
- **TTS**: Piper – `/tts` (48kHz WAV)

## Start the stack
```bash
./scripts/stack-up.sh
```

## Models
### Ollama
Pull a model:
```bash
./scripts/voice-ollama-pull.sh llama3.2:3b
```

### Piper
Install a default voice (used when no voice is set). Defaults are baked into `scripts/voice-setup.sh`:
```bash
VOICE_NAME=default \
./scripts/voice-setup.sh
```

Install a custom voice (select via `/assistant config voice:<name>`):
```bash
VOICE_NAME=myvoice \
PIPER_BIN_URL=... \
PIPER_MODEL_URL=... \
PIPER_CONFIG_URL=... \
./scripts/voice-setup.sh
```

Install a preset by name:
```bash
node scripts/voice-install-preset.js lessac-medium
```

## Voice Presets
Set in `.env`:
```
ASSISTANT_VOICE_PRESETS=default,lessac-medium,amy-medium
```
These are just names; they must match folders you install under `models/piper/voices/<name>`.

## Per-channel voices
You can set a voice per channel:
```
/assistant channel-voice action:set channel:#MyVC voice:amy-medium
```
Or set in the dashboard using `channel_id=voice` pairs.

## Listen prompt
If you run `/assistant listen` without a mode, you’ll get buttons:
- **One-shot**: listen once
- **Free mode**: start auto-listen

## Wire Chopsticks
Set in `.env`:
```
VOICE_ASSIST_STT_URL=http://127.0.0.1:9000/transcribe
VOICE_ASSIST_LLM_URL=http://127.0.0.1:9001/generate
VOICE_ASSIST_TTS_URL=http://127.0.0.1:9002/tts
```

## Notes
- WSL GPU passthrough is not available in your environment. CPU defaults are stable.
- If you later enable GPU, set `VOICE_WHISPER_DEVICE=cuda` and `VOICE_WHISPER_COMPUTE_TYPE=float16` in `.env`.
- TTS output is resampled to 48kHz stereo for Discord voice compatibility.
