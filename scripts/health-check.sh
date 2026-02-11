#!/usr/bin/env bash
set -euo pipefail

HOST=${1:-http://127.0.0.1:9100}

curl -fsS "${HOST}/healthz" | cat
