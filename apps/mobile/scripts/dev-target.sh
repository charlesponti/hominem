#!/usr/bin/env bash
# Usage:
#   ./scripts/dev-target.sh            — show current target
#   ./scripts/dev-target.sh simulator  — switch to simulator (localhost)
#   ./scripts/dev-target.sh device     — switch to device (auto-detect LAN IP)
#   ./scripts/dev-target.sh devices    — list connected iOS devices

set -euo pipefail

ENV_FILE="$(dirname "$0")/../.env.development.local"
ENV_FILE="$(realpath "$ENV_FILE")"

# ── helpers ────────────────────────────────────────────────────────────────────

get_lan_ip() {
  # Prefer Wi-Fi (en0); fall back to first active interface with a 192.168/10./172. address
  local ip
  ip=$(ipconfig getifaddr en0 2>/dev/null || true)
  if [[ -z "$ip" ]]; then
    ip=$(ifconfig | awk '/inet / && !/127\.0\.0\.1/ { print $2; exit }')
  fi
  echo "$ip"
}

get_api_port() {
  # Read port from current env file if set, default to 4040
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
    # Replace existing line (macOS-compatible sed)
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

  echo ""
  echo "  Dev target: .env.development.local"
  echo "  API URL:    ${url}"
  echo ""

  if [[ "$url" == *"localhost"* ]] || [[ "$url" == *"127.0.0.1"* ]]; then
    echo "  Target: SIMULATOR (localhost)"
  else
    echo "  Target: DEVICE ($(get_lan_ip 2>/dev/null || echo '?'))"
  fi
  echo ""
}

list_devices() {
  echo ""
  echo "  Connected iOS devices:"
  echo ""
  if command -v xcrun &>/dev/null; then
    xcrun devicectl list devices 2>/dev/null \
      | grep -E 'iPhone|iPad' \
      | awk '{ print "  •", $0 }' \
      || echo "  (none found — is the device plugged in and trusted?)"
  else
    echo "  xcrun not available (Xcode required)"
  fi
  echo ""
}

# ── main ───────────────────────────────────────────────────────────────────────

CMD="${1:-status}"

case "$CMD" in
  simulator|sim)
    PORT=$(get_api_port)
    set_api_base_url "http://localhost:${PORT}"
    echo ""
    echo "  Switched to SIMULATOR"
    show_status
    echo "  Run with:  bun run ios"
    echo ""
    ;;

  device|iphone)
    PORT=$(get_api_port)
    LAN_IP=$(get_lan_ip)
    if [[ -z "$LAN_IP" ]]; then
      echo ""
      echo "  ERROR: Could not detect LAN IP."
      echo "  Are you connected to Wi-Fi? Or set manually:"
      echo "    EXPO_PUBLIC_API_BASE_URL=\"http://<your-ip>:${PORT}\""
      echo ""
      exit 1
    fi
    set_api_base_url "http://${LAN_IP}:${PORT}"
    echo ""
    echo "  Switched to DEVICE"
    show_status
    echo "  Run with:  npx expo run:ios --device"
    echo ""
    list_devices
    ;;

  devices)
    list_devices
    ;;

  status|*)
    show_status
    echo "  Commands:"
    echo "    ./scripts/dev-target.sh simulator  — use localhost (simulator)"
    echo "    ./scripts/dev-target.sh device     — use LAN IP (physical iPhone)"
    echo "    ./scripts/dev-target.sh devices    — list connected devices"
    echo ""
    ;;
esac
