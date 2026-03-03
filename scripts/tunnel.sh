#!/usr/bin/env bash
# Helper for managing Cloudflare tunnels used by auth services.
# Usage: tunnel.sh auth   # start a tunnel
#        tunnel.sh check  # sanity-check auth endpoints

set -euo pipefail

# allow overrides from environment or Makefile
CLOUDFLARED=${CLOUDFLARED:-cloudflared}
AUTH_BASE_URL=${AUTH_BASE_URL:-https://api.hominem.test}
CLOUDFLARED_TUNNEL_TOKEN=${CLOUDFLARED_TUNNEL_TOKEN:-$AUTH_TUNNEL_TOKEN}
CLOUDFLARED_TUNNEL=${CLOUDFLARED_TUNNEL:-$AUTH_TUNNEL_NAME}

usage() {
  echo "Usage: $0 {auth|check}"
  exit 1
}

if [ $# -lt 1 ]; then
  usage
fi

case "$1" in
  auth)
    command -v "$CLOUDFLARED" >/dev/null 2>&1 || { \
      echo "ERROR: cloudflared is not installed. Install via: brew install cloudflared"; \
      exit 1; \
    }

    if [ -n "$CLOUDFLARED_TUNNEL_TOKEN" ]; then
      echo "Starting Cloudflare tunnel using CLOUDFLARED_TUNNEL_TOKEN..."
      "$CLOUDFLARED" tunnel --no-autoupdate run --token "$CLOUDFLARED_TUNNEL_TOKEN"
    elif [ -n "$CLOUDFLARED_TUNNEL" ]; then
      echo "Starting Cloudflare tunnel using named tunnel: $CLOUDFLARED_TUNNEL"
      "$CLOUDFLARED" tunnel --no-autoupdate run "$CLOUDFLARED_TUNNEL"
    else
      echo "ERROR: set CLOUDFLARED_TUNNEL_TOKEN or CLOUDFLARED_TUNNEL before running"
      exit 1
    fi
    ;;

  check)
    echo "Checking $AUTH_BASE_URL/api/status"
    status_code=$(curl -sS -o /tmp/hominem_auth_status.out -w "%{http_code}" "$AUTH_BASE_URL/api/status")
    echo "status=$status_code"
    if [ "$status_code" = "530" ] || [ "$status_code" = "502" ]; then
      echo "ERROR: auth edge is unhealthy (HTTP $status_code)."
      echo "Response:"
      head -c 300 /tmp/hominem_auth_status.out
      echo
      exit 1
    fi

    echo "Checking mobile authorize edge path"
    status_code=$(curl -sS -o /tmp/hominem_mobile_authorize.out -w "%{http_code}" \
      -X POST "$AUTH_BASE_URL/api/auth/mobile/authorize" \
      -H "content-type: application/json" \
      --data '{"redirect_uri":"hakumi://auth/callback","code_challenge":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","state":"12345678"}')
    echo "status=$status_code"
    if [ "$status_code" = "530" ] || [ "$status_code" = "502" ]; then
      echo "ERROR: mobile auth endpoint is still behind an unhealthy edge (HTTP $status_code)."
      echo "Response:"
      head -c 300 /tmp/hominem_mobile_authorize.out
      echo
      exit 1
    fi

    echo "Tunnel check passed."
    ;;

  *)
    usage
    ;;
esac
