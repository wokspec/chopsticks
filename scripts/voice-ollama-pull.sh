#!/usr/bin/env bash
set -euo pipefail

MODEL=${1:-llama3.1:8b}

docker exec -it chopsticks-ollama ollama pull "${MODEL}"
