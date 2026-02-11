#!/usr/bin/env bash
set -euo pipefail

PIPER_DIR=${PIPER_DIR:-models/piper}
VOICE_NAME=${VOICE_NAME:-default}
PIPER_BIN_URL=${PIPER_BIN_URL:-https://sourceforge.net/projects/piper-tts.mirror/files/2023.11.14-2/piper_linux_x86_64.tar.gz/download}
PIPER_MODEL_URL=${PIPER_MODEL_URL:-https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx?download=true}
PIPER_CONFIG_URL=${PIPER_CONFIG_URL:-https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json?download=true}

if [ -z "${PIPER_BIN_URL}" ] || [ -z "${PIPER_MODEL_URL}" ] || [ -z "${PIPER_CONFIG_URL}" ]; then
  echo "Set PIPER_BIN_URL, PIPER_MODEL_URL, PIPER_CONFIG_URL"
  exit 1
fi

mkdir -p "${PIPER_DIR}"

if [ "${VOICE_NAME}" = "default" ]; then
  TARGET_DIR="${PIPER_DIR}"
else
  TARGET_DIR="${PIPER_DIR}/voices/${VOICE_NAME}"
  mkdir -p "${TARGET_DIR}"
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

BIN_ARCHIVE="${TMP_DIR}/piper.bin"
curl -L "${PIPER_BIN_URL}" -o "${BIN_ARCHIVE}"

if [[ "${PIPER_BIN_URL}" == *.tar.gz ]] || [[ "${PIPER_BIN_URL}" == *.tgz ]] || [[ "${BIN_ARCHIVE}" == *.tar.gz ]]; then
  tar -xzf "${BIN_ARCHIVE}" -C "${TMP_DIR}"
  if [ -f "${TMP_DIR}/piper/piper" ]; then
    cp "${TMP_DIR}/piper/piper" "${PIPER_DIR}/piper"
  elif [ -f "${TMP_DIR}/piper" ]; then
    cp "${TMP_DIR}/piper" "${PIPER_DIR}/piper"
  else
    echo "piper binary not found in archive"
    exit 1
  fi
else
  cp "${BIN_ARCHIVE}" "${PIPER_DIR}/piper"
fi

chmod +x "${PIPER_DIR}/piper"

curl -L "${PIPER_MODEL_URL}" -o "${TARGET_DIR}/model.onnx"
curl -L "${PIPER_CONFIG_URL}" -o "${TARGET_DIR}/model.onnx.json"

echo "[voice-setup] Piper installed in ${TARGET_DIR}"
