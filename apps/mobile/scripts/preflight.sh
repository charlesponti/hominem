#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/_lib.sh"

CHANNEL="${1:?usage: preflight.sh <dev|preview|production>}"
SCRIPTS_DIR="$(dirname "$0")"

header "Preflight · $CHANNEL"

bash "$SCRIPTS_DIR/check-eas-profiles.sh"
bash "$SCRIPTS_DIR/check-expo-config.sh"

if [[ "$CHANNEL" == "preview" || "$CHANNEL" == "production" ]]; then
  eas env:exec "$CHANNEL" "bash scripts/check-release-env.sh $CHANNEL"
fi

printf "\n"
