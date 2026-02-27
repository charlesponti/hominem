#!/bin/bash
# wait-for-ci.sh - Wait for CI checks to complete on current branch
# Usage: ./scripts/wait-for-ci.sh [branch-name] [timeout-seconds]
# Only prints when checks complete (success/failure) or timeout

set -e

BRANCH="${1:=$(git rev-parse --abbrev-ref HEAD)}"
TIMEOUT="${2:-600}"  # Default 10 minutes
INTERVAL=15          # Check every 15 seconds
ELAPSED=0

while [ $ELAPSED -lt $TIMEOUT ]; do
  # Get latest run
  result=$(gh run list --branch "$BRANCH" --limit 1 --json name,status,conclusion 2>/dev/null)
  
  status=$(echo "$result" | jq -r '.[0].status // empty')
  conclusion=$(echo "$result" | jq -r '.[0].conclusion // empty')
  name=$(echo "$result" | jq -r '.[0].name // "unknown"')
  
  if [ -z "$status" ]; then
    ELAPSED=$((ELAPSED + INTERVAL))
    sleep $INTERVAL
    continue
  fi
  
  case "$status" in
    "completed")
      case "$conclusion" in
        "success")
          echo "✅ $name: SUCCESS"
          exit 0
          ;;
        "failure")
          echo "❌ $name: FAILED"
          exit 1
          ;;
        "cancelled")
          echo "⚠️  $name: CANCELLED"
          exit 1
          ;;
        *)
          echo "❓ $name: UNKNOWN ($conclusion)"
          exit 1
          ;;
      esac
    ;;
    "in_progress"|"queued")
      ELAPSED=$((ELAPSED + INTERVAL))
      sleep $INTERVAL
      ;;
    *)
      echo "❓ Unknown status: $status"
      exit 1
      ;;
  esac
done

echo "⏱️  Timeout after ${TIMEOUT}s"
exit 1
