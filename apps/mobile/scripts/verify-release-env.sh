#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: verify-release-env.sh <preview|production>" >&2
  exit 1
fi

VARIANT="$1"

bun -e "
const { assertReleaseEnv } = require('./config/release-env-policy.js')

assertReleaseEnv('${VARIANT}', process.env)
console.log('Release env verification passed for ${VARIANT}')
"
