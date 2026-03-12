#!/usr/bin/env bash
set -euo pipefail

CONFIG_JSON="$(zsh -lc 'bunx expo config --json --type public')"

export CONFIG_JSON

bun -e "
const { EXPO_OWNER, EXPO_PROJECT_ID, EXPO_PROJECT_SLUG } = require('./config/expo-config.js')

const config = JSON.parse(process.env.CONFIG_JSON ?? '{}')
const resolvedConfig = {
  owner: config.owner,
  projectId: config.extra?.eas?.projectId,
  slug: config.slug,
}
const expectedConfig = {
  owner: EXPO_OWNER,
  projectId: EXPO_PROJECT_ID,
  slug: EXPO_PROJECT_SLUG,
}

if (JSON.stringify(resolvedConfig) !== JSON.stringify(expectedConfig)) {
  throw new Error(
    'Expo config mismatch: expected ' +
      JSON.stringify(expectedConfig) +
      ', got ' +
      JSON.stringify(resolvedConfig),
  )
}

if (config.extra?.mobilePasskeyEnabled === undefined) {
  throw new Error('Expo config mismatch: extra.mobilePasskeyEnabled must be present')
}

console.log('Expo config verification passed')
"
