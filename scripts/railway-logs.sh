#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${RAILWAY_PROJECT_ID:-777ae082-725f-40b2-808e-e4635d5e2b82}"
ENVIRONMENT="${RAILWAY_ENVIRONMENT:-production}"
LINES="${RAILWAY_LOG_LINES:-200}"
SERVICE_KEY="${1:-api}"
shift || true

case "$SERVICE_KEY" in
  api) SERVICE_ID="5c71aa0d-3fab-4a9b-a910-079b44315b6e" ;;
  worker|workers) SERVICE_ID="5b2c83af-9f65-450f-85bc-aed36cbfa982" ;;
  redis) SERVICE_ID="013f8192-6218-4b6a-b72a-2976673bc21c" ;;
  database|db) SERVICE_ID="edf57c24-36f5-4f8a-8c10-2bd3fdede298" ;;
  *)
    echo "error: unknown service '$SERVICE_KEY' (expected api, worker, redis, or database)" >&2
    exit 2
    ;;
esac

usage() {
  cat >&2 <<'EOF'
Usage: scripts/railway-logs.sh [api|worker|redis|database] [options]

Options are passed to `railway logs` after the repository's production context:
  --follow       stream live logs instead of fetching a snapshot
  --http         read Railway proxy request logs
  --build        read build logs
  --since <time> read logs since a relative time such as 1h or 30m
  --filter <q>   apply a Railway log filter, e.g. '@level:error'
  --json         preserve JSON output

Environment overrides:
  RAILWAY_PROJECT_ID, RAILWAY_ENVIRONMENT, RAILWAY_LOG_LINES
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

args=(
  --project "$PROJECT_ID"
  --environment "$ENVIRONMENT"
  --service "$SERVICE_ID"
)
json=false
follow=false

while (($# > 0)); do
  case "$1" in
    --follow)
      follow=true
      ;;
    --json)
      json=true
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      args+=("$1")
      if [[ "$1" == "--lines" || "$1" == "--since" || "$1" == "--until" || "$1" == "--filter" || "$1" == "--path" || "$1" == "--status" || "$1" == "--method" ]]; then
        option="$1"
        shift
        [[ $# -gt 0 ]] || { echo "error: $option requires a value" >&2; exit 2; }
        args+=("$1")
      fi
      ;;
  esac
  shift
done

if [[ "$follow" == false && ! " ${args[*]} " =~ " --lines " && ! " ${args[*]} " =~ " --since " && ! " ${args[*]} " =~ " --until " ]]; then
  args+=(--lines "$LINES")
fi

if [[ "$json" == true ]]; then
  args+=(--json)
fi

RAILWAY_CALLER="skill:use-railway@1.3.7" \
RAILWAY_AGENT_SESSION="railway-logs-20260823" \
railway logs "${args[@]}"
