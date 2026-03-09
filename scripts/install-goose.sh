#!/usr/bin/env bash
set -euo pipefail

TARGET_BIN="${HOME}/.local/bin/goose-migrate"
DEFAULT_TAG="${GOOSE_VERSION:-v3.27.0}"

if [ -x "$TARGET_BIN" ]; then
  "$TARGET_BIN" -version >/dev/null 2>&1 || true
  exit 0
fi

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "$ARCH" in
  x86_64|amd64) ARCH="x86_64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *)
    echo "Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

LATEST_TAG="$(curl -fsSL https://api.github.com/repos/pressly/goose/releases/latest | sed -n 's/.*\"tag_name\": \"\\([^\"]*\\)\".*/\\1/p' | head -n 1 || true)"
if [ -z "$LATEST_TAG" ]; then
  LATEST_TAG="$DEFAULT_TAG"
fi

BIN_URL="https://github.com/pressly/goose/releases/download/${LATEST_TAG}/goose_${OS}_${ARCH}"
mkdir -p "${HOME}/.local/bin"
curl -fsSL "$BIN_URL" -o "$TARGET_BIN"
chmod +x "$TARGET_BIN"
"$TARGET_BIN" -version
