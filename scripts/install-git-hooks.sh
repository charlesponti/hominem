#!/usr/bin/env bash

set -euo pipefail

if git rev-parse --git-dir >/dev/null 2>&1; then
  git config core.hooksPath .githooks
fi
