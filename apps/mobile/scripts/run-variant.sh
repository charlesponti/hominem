#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
MOBILE_DIR="${ROOT_DIR}/apps/mobile"

if [[ $# -lt 2 ]]; then
  echo "usage: run-variant.sh <variant> <command> [args...]" >&2
  exit 1
fi

VARIANT="$1"
shift

case "${VARIANT}" in
  dev)
    ENV_FILE="${MOBILE_DIR}/.env.development.local"
    ;;
  e2e)
    ENV_FILE="${MOBILE_DIR}/.env.e2e.local"
    ;;
  preview)
    ENV_FILE="${MOBILE_DIR}/.env.preview.local"
    ;;
  production)
    ENV_FILE="${MOBILE_DIR}/.env.production.local"
    ;;
  *)
    echo "unsupported variant: ${VARIANT}" >&2
    exit 1
    ;;
esac

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "missing env file: ${ENV_FILE}" >&2
  exit 1
fi

set -a
source "${ENV_FILE}"
set +a

export APP_VARIANT="${VARIANT}"
export EXPO_NO_DOTENV=1

exec "$@"
