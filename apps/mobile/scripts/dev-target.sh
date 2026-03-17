#!/usr/bin/env bash
# Usage:
#   ./scripts/dev-target.sh            — show current target
#   ./scripts/dev-target.sh simulator  — switch to simulator (localhost)
#   ./scripts/dev-target.sh device     — switch to device (auto-detect LAN IP)
#   ./scripts/dev-target.sh devices    — list connected iOS devices

set -euo pipefail
source "$(dirname "$0")/_lib.sh"

ENV_FILE="$(dirname "$0")/../.env.development.local"
ENV_FILE="$(realpath "$ENV_FILE")"

# ── helpers ────────────────────────────────────────────────────────────────────

get_lan_ip() {
  local ip
  ip=$(ipconfig getifaddr en0 2>/dev/null || true)
  if [[ -z "$ip" ]]; then
    ip=$(ifconfig | awk '/inet / && !/127\.0\.0\.1/ { print $2; exit }')
  fi
  echo "$ip"
}

get_api_port() {
  local current
  current=$(grep -E '^EXPO_PUBLIC_API_BASE_URL=' "$ENV_FILE" 2>/dev/null | head -1 || true)
  if [[ -n "$current" ]]; then
    echo "$current" | sed -E 's|.*:([0-9]+).*|\1|'
  else
    echo "4040"
  fi
}

set_api_base_url() {
  local new_url="$1"
  if grep -q 'EXPO_PUBLIC_API_BASE_URL=' "$ENV_FILE" 2>/dev/null; then
    sed -i '' "s|^EXPO_PUBLIC_API_BASE_URL=.*|EXPO_PUBLIC_API_BASE_URL=\"${new_url}\"|" "$ENV_FILE"
  else
    echo "EXPO_PUBLIC_API_BASE_URL=\"${new_url}\"" >> "$ENV_FILE"
  fi
}

show_status() {
  local current
  current=$(grep -E '^EXPO_PUBLIC_API_BASE_URL=' "$ENV_FILE" 2>/dev/null | head -1 || echo "(not set)")
  local url
  url=$(echo "$current" | sed -E 's/^EXPO_PUBLIC_API_BASE_URL=["'"'"']?([^"'"'"']*)["'"'"']?/\1/')

  printf "\n"
  printf "  ${DIM}env file${RESET}  .env.development.local\n"
  printf "  ${DIM}API URL${RESET}   ${CYAN}%s${RESET}\n" "${url}"

  if [[ "$url" == *"localhost"* ]] || [[ "$url" == *"127.0.0.1"* ]]; then
    printf "  ${DIM}target${RESET}    ${GREEN}simulator${RESET}\n"
  else
    printf "  ${DIM}target${RESET}    ${YELLOW}device${RESET} ($(get_lan_ip 2>/dev/null || echo '?'))\n"
  fi
  printf "\n"
}

list_devices() {
  header "Connected iOS devices"
  if command -v xcrun &>/dev/null; then
    xcrun devicectl list devices 2>/dev/null \
      | grep -E 'iPhone|iPad' \
      | awk '{ print "  • " $0 }' \
      || info "none found — is the device plugged in and trusted?"
  else
    warn "xcrun not available (Xcode required)"
  fi
  printf "\n"
}

# ── main ───────────────────────────────────────────────────────────────────────

CMD="${1:-status}"

case "$CMD" in
  simulator|sim)
    PORT=$(get_api_port)
    set_api_base_url "http://localhost:${PORT}"
    ok "Switched to simulator"
    show_status
    info "Run: bun run start"
    printf "\n"
    ;;

  device|iphone)
    PORT=$(get_api_port)
    LAN_IP=$(get_lan_ip)
    if [[ -z "$LAN_IP" ]]; then
      fail "Could not detect LAN IP"
      info "Are you connected to Wi-Fi? Or set manually:"
      info "  EXPO_PUBLIC_API_BASE_URL=\"http://<your-ip>:${PORT}\""
      printf "\n"
      exit 1
    fi
    set_api_base_url "http://${LAN_IP}:${PORT}"
    ok "Switched to device"
    show_status
    info "Run: bun run start"
    printf "\n"
    list_devices
    ;;

  devices)
    list_devices
    ;;

  status|*)
    header "Dev target"
    show_status
    info "target:sim    — use localhost (simulator)"
    info "target:device — use LAN IP (physical iPhone)"
    info "target        — show this status"
    printf "\n"
    ;;
esac
