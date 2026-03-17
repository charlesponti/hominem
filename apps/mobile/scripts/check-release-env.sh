#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/_lib.sh"

if [[ $# -ne 1 ]]; then
  fail "usage: check-release-env.sh <preview|production>"
  exit 1
fi

VARIANT="$1"

bun -e "
const { assertReleaseEnv } = require('./config/release-env-policy.js')
assertReleaseEnv('${VARIANT}', process.env)
"

ok "Release env ($VARIANT)"
