#!/usr/bin/env bash
set -euo pipefail

project=''
environment=''
while (($#)); do
  case "$1" in
    --project) project=${2:?missing value for --project}; shift 2 ;;
    --environment) environment=${2:?missing value for --environment}; shift 2 ;;
    -h|--help) printf 'Usage: %s [--project PROJECT_ID] [--environment ENVIRONMENT_ID]\n' "$0"; exit 0 ;;
    *) printf 'Unknown argument: %s\n' "$1" >&2; exit 2 ;;
  esac
done

command -v railway >/dev/null || { echo 'railway CLI is required' >&2; exit 2; }
command -v jq >/dev/null || { echo 'jq is required' >&2; exit 2; }
command -v curl >/dev/null || { echo 'curl is required' >&2; exit 2; }

caller='skill:hominem-production-check@1.0.0'
session="hominem-production-check-$(date +%s)-$$"
status_json=$(RAILWAY_CALLER="$caller" RAILWAY_AGENT_SESSION="$session" railway status --json)
project=${project:-$(jq -r '.id // empty' <<<"$status_json")}
environment=${environment:-$(jq -r '.environments.edges[]?.node | select(.name == "production") | .id' <<<"$status_json" | head -n1)}
if [[ -z "$project" || -z "$environment" ]]; then
  echo 'Could not resolve the Hominem project or production environment.' >&2
  exit 2
fi

echo "Production check: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Project: $project"
echo "Environment: $environment"
echo
echo 'SERVICE DEPLOYMENTS'
printf '%-14s %-38s %-10s %-10s\n' service deployment status instance

service_rows=$(RAILWAY_CALLER="$caller" RAILWAY_AGENT_SESSION="$session" railway status --project "$project" --environment "$environment" --json \
  | jq -r '.environments.edges[]?.node.serviceInstances.edges[]?.node | [.serviceName,.latestDeployment.id,.latestDeployment.status,(.latestDeployment.instances[0].status // "NONE")] | @tsv')
failed=0
while IFS=$'\t' read -r service deployment deployment_status instance_status; do
  [[ -z "$service" ]] && continue
  printf '%-14s %-38s %-10s %-10s\n' "$service" "$deployment" "$deployment_status" "$instance_status"
  if [[ "$deployment_status" != SUCCESS || "$instance_status" != RUNNING ]]; then failed=1; fi
done <<<"$service_rows"

echo
echo 'PUBLIC DOMAINS'
printf '%-22s %-6s %-52s\n' domain code location

check_domain() {
  local host=$1 expected_code=$2 expected_location=$3 headers code location
  headers=$(curl -sS -D - -o /dev/null --max-time 15 --max-redirs 0 "https://$host/" 2>/dev/null || true)
  code=$(awk '/^HTTP\//{value=$2} END{print value}' <<<"$headers")
  location=$(awk 'BEGIN{IGNORECASE=1}/^location:/{print substr($0,11)}' <<<"$headers" | tr -d '\r')
  printf '%-22s %-6s %-52s\n' "$host" "${code:-ERR}" "${location:-—}"
  [[ "$code" == "$expected_code" ]] || { failed=1; return; }
  case "$expected_location" in
    '') [[ -z "$location" ]] || failed=1 ;;
    exact:*) [[ "$location" == "${expected_location#exact:}" ]] || failed=1 ;;
    prefix:*) [[ "$location" == "${expected_location#prefix:}"* ]] || failed=1 ;;
  esac
}

check_domain api.ponti.io 200 ''
check_domain career.ponti.io 200 ''
check_domain labs.ponti.io 200 ''
check_domain ponti.io 200 ''
check_domain omiro.ponti.io 302 'prefix:https://api.ponti.io/login?'
check_domain what.ponti.io 302 'exact:/reality'

echo
if ((failed)); then
  echo 'RESULT: FAIL'
  exit 1
fi
echo 'RESULT: PASS'
