#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
app_dir="$repo_root/apps/omiro"
temp_dir="$(mktemp -d "${TMPDIR:-/tmp}/omiro-cng.XXXXXX")"

restore_native_dir() {
  if [[ -d "$temp_dir/ios" && ! -e "$app_dir/ios" ]]; then
    mv "$temp_dir/ios" "$app_dir/ios"
  fi
}
trap restore_native_dir EXIT

if [[ -d "$app_dir/ios" ]]; then
  mv "$app_dir/ios" "$temp_dir/ios"
fi

cd "$app_dir"
APP_ENV=production NODE_ENV=production \
  EXPO_PUBLIC_API_BASE_URL="${EXPO_PUBLIC_API_BASE_URL:-https://cng.invalid}" \
  pnpm exec expo prebuild --platform ios --clean --no-install
mv "$app_dir/ios" "$temp_dir/ios-generated"

fingerprint() {
  APP_ENV=production NODE_ENV=production \
    EXPO_PUBLIC_API_BASE_URL="${EXPO_PUBLIC_API_BASE_URL:-https://cng.invalid}" \
    pnpm dlx eas-cli@21.2.0 fingerprint:generate \
      --json --non-interactive --platform ios --build-profile production
}

fingerprint > "$temp_dir/first.json"
fingerprint > "$temp_dir/second.json"

node - "$temp_dir/first.json" "$temp_dir/second.json" <<'NODE'
const fs = require('node:fs');

const [firstPath, secondPath] = process.argv.slice(2);
const readHash = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8')).hash;
const first = readHash(firstPath);
const second = readHash(secondPath);

if (!first || first !== second) {
  console.error(`Omiro CNG fingerprint is not deterministic: ${first} != ${second}`);
  process.exit(1);
}

console.log(`Omiro CNG fingerprint is deterministic: ${first}`);
NODE
