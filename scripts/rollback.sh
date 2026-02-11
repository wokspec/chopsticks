#!/usr/bin/env bash
set -euo pipefail

TAG=${1:-}
if [ -z "${TAG}" ]; then
  echo "Usage: rollback.sh <tag>"
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not a git repo"
  exit 1
fi

git fetch --tags

echo "[rollback] checkout ${TAG}"
git checkout ${TAG}

echo "[rollback] docker compose up (full stack)"
./scripts/stack-up.sh

echo "[rollback] done"
