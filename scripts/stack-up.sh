#!/usr/bin/env bash
set -euo pipefail

docker compose \
  -f docker-compose.stack.yml \
  -f docker-compose.voice.yml \
  -f docker-compose.full.yml \
  up -d --build
