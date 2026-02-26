#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
EAS_FILE="${ROOT_DIR}/apps/mobile/eas.json"

if [[ ! -f "${EAS_FILE}" ]]; then
  echo "Missing eas.json at ${EAS_FILE}" >&2
  exit 1
fi

node -e "
const fs = require('node:fs')
const path = process.argv[1]
const raw = fs.readFileSync(path, 'utf8')
const cfg = JSON.parse(raw)
const requiredProfiles = ['development', 'simulator', 'production']
for (const profile of requiredProfiles) {
  if (!cfg.build || !cfg.build[profile]) {
    throw new Error('Missing build profile: ' + profile)
  }
}
if (cfg.build.development.channel !== 'development') {
  throw new Error('development profile must use channel=development')
}
if (cfg.build.simulator.ios?.simulator !== true) {
  throw new Error('simulator profile must set ios.simulator=true')
}
if (cfg.build.production.channel !== 'production') {
  throw new Error('production profile must use channel=production')
}
if (!cfg.build.development.env?.EXPO_PUBLIC_API_BASE_URL) {
  throw new Error('development env must define EXPO_PUBLIC_API_BASE_URL')
}
console.log('EAS profile validation passed')
" "${EAS_FILE}"
