#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/_lib.sh"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
MOBILE_DIR="${ROOT_DIR}/apps/mobile"
VARIANT="${1:-}"
PODFILE="${MOBILE_DIR}/ios/Podfile"
STAMP_FILE="${MOBILE_DIR}/ios/.app-variant"

if [[ -z "${VARIANT}" ]]; then
  fail "usage: ensure-ios-variant.sh <dev|e2e|preview|production>"
  exit 1
fi

EXPECTED_LINE="$(
  cd "${MOBILE_DIR}"
  node -e "const { getPodfileUseExpoModulesLine } = require('./config/appVariant'); process.stdout.write(getPodfileUseExpoModulesLine(process.argv[1]))" "${VARIANT}"
)"

CURRENT_VARIANT=""
if [[ -f "${STAMP_FILE}" ]]; then
  CURRENT_VARIANT="$(cat "${STAMP_FILE}")"
fi

if [[ -f "${PODFILE}" ]] && [[ "${CURRENT_VARIANT}" == "${VARIANT}" ]] && grep -Fqx "${EXPECTED_LINE}" "${PODFILE}"; then
  info "iOS project already configured for variant: ${VARIANT}"
  exit 0
fi

step "Configuring iOS project for variant: ${VARIANT}"
cd "${MOBILE_DIR}"
bash scripts/setup-icons.sh "${VARIANT}"
bash scripts/run-variant.sh "${VARIANT}" bunx expo prebuild --platform ios --clean
printf '%s\n' "${VARIANT}" > "${STAMP_FILE}"
ok "iOS project ready (${VARIANT})"
