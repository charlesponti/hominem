#!/usr/bin/env bash
set -euo pipefail

TARGET_BIN="${HOME}/.local/bin/goose-migrate"
TARGET_TAG="${GOOSE_VERSION:-v3.27.0}"

if [ -x "$TARGET_BIN" ]; then
  CURRENT_VERSION="$("$TARGET_BIN" -version 2>/dev/null | awk '{print $NF}' || true)"
  if [ "$CURRENT_VERSION" = "${TARGET_TAG#v}" ] || [ "$CURRENT_VERSION" = "$TARGET_TAG" ]; then
    exit 0
  fi
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

BIN_URL="https://github.com/pressly/goose/releases/download/${TARGET_TAG}/goose_${OS}_${ARCH}"
mkdir -p "${HOME}/.local/bin"
curl -fsSL "$BIN_URL" -o "$TARGET_BIN"
chmod +x "$TARGET_BIN"
"$TARGET_BIN" -version
