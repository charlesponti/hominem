#!/usr/bin/env bash
set -euo pipefail

find . \
  \( -type d \( -name node_modules -o -name dist -o -name build -o -name logs \
                -o -name coverage -o -name .next -o -name .turbo \) -prune \) \
  -exec rm -rf {} +

find . -name '*.tsbuildinfo' -type f -not -path './node_modules/*' -exec rm -f {} +
