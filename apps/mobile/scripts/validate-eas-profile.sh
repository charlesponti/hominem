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
const requiredProfiles = ['development', 'e2e', 'preview', 'production']
for (const profile of requiredProfiles) {
  if (!cfg.build || !cfg.build[profile]) {
    throw new Error('Missing build profile: ' + profile)
  }
}
if (cfg.build.development.channel !== 'development') {
  throw new Error('development profile must use channel=development')
}
if (cfg.build.development.developmentClient !== true) {
  throw new Error('development profile must enable developmentClient')
}
if (cfg.build.development.env?.APP_VARIANT !== 'dev') {
  throw new Error('development profile must define APP_VARIANT=dev')
}
if (cfg.build.e2e.ios?.simulator !== true) {
  throw new Error('e2e profile must set ios.simulator=true')
}
if (cfg.build.e2e.developmentClient === true) {
  throw new Error('e2e profile must not enable developmentClient')
}
if (cfg.build.e2e.env?.APP_VARIANT !== 'e2e') {
  throw new Error('e2e profile must define APP_VARIANT=e2e')
}
if (cfg.build.preview.env?.APP_VARIANT !== 'preview') {
  throw new Error('preview profile must define APP_VARIANT=preview')
}
if (cfg.build.preview.developmentClient === true) {
  throw new Error('preview profile must not enable developmentClient')
}
if (cfg.build.production.channel !== 'production') {
  throw new Error('production profile must use channel=production')
}
if (cfg.build.production.env?.APP_VARIANT !== 'production') {
  throw new Error('production profile must define APP_VARIANT=production')
}
if (cfg.build.production.developmentClient === true) {
  throw new Error('production profile must not enable developmentClient')
}
if (cfg.build.production.autoIncrement !== true) {
  throw new Error('production profile must enable autoIncrement')
}
if (cfg.build.preview.autoIncrement !== true) {
  throw new Error('preview profile must enable autoIncrement')
}
console.log('EAS profile validation passed')
" "${EAS_FILE}"
