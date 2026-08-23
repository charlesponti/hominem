#!/usr/bin/env bash
set -euo pipefail

since="${1:-30m}"
environment="${RAILWAY_ENVIRONMENT:-production}"
export RAILWAY_ENVIRONMENT="$environment"

echo "Speech diagnosis (Railway: ${environment}, since: ${since})"
echo

show_logs() {
  local service="$1"
  echo "--- ${service} speech/reconciliation logs ---"
  "$(dirname "$0")/railway-logs.sh" "$service" --since "$since" --json \
    | jq -r '.message // empty' \
    | rg -i 'speech|reconcil|ai-usage|constraint|exception|error' || true
  echo
}

show_logs api
show_logs worker

echo "--- recent production failures ---"
"$(dirname "$0")/railway-logs.sh" api --since "$since" --json \
  | jq -r '.message // empty' \
  | rg -i 'error|exception|failed|unavailable' || true
echo

echo "--- current commit workflow status ---"
if command -v gh >/dev/null 2>&1 && git rev-parse --verify HEAD >/dev/null 2>&1; then
  gh run list --branch main --commit "$(git rev-parse HEAD)" --limit 20 \
    --json name,status,conclusion,url \
    --jq '.[] | [.name, .status, (.conclusion // ""), .url] | @tsv'
else
  echo 'gh or git is unavailable; skipped workflow status'
fi
