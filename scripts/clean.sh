#!/usr/bin/env bash
# Clean helper extracted from Makefile.
# Usage: ./scripts/clean.sh

set -euo pipefail

# one-pass directory cleanup
find . \
  \( -type d \( -name node_modules -o -name dist -o -name build -o -name logs \
                -o -name coverage -o -name .next -o -name .turbo \) -prune \) \
  -exec rm -rf {} +

# remove lockfiles and tsbuildinfo (skip node_modules)
find . -name "bun.lock" -exec rm -f {} +
find . -name '*.tsbuildinfo' -type f -not -path './node_modules/*' -exec rm -f {} +
