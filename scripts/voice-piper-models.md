# Piper Model URLs

Defaults are now baked into `scripts/voice-setup.sh`:
- Default voice: `en_US-lessac-medium`

To override, set URLs:

PIPER_BIN_URL=... \
PIPER_MODEL_URL=... \
PIPER_CONFIG_URL=... \
./scripts/voice-setup.sh

To install a named custom voice:

VOICE_NAME=myvoice \
PIPER_BIN_URL=... \
PIPER_MODEL_URL=... \
PIPER_CONFIG_URL=... \
./scripts/voice-setup.sh

Suggested presets (set in `.env`):
```
ASSISTANT_VOICE_PRESETS=default,lessac-medium,amy-medium
```

Install a preset by name:
```
node scripts/voice-install-preset.js lessac-medium
```
