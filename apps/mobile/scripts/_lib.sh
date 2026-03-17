#!/usr/bin/env bash
# Shared output helpers — sourced by other scripts.
# Colors are automatically disabled when stdout is not a TTY (e.g. CI logs).

if [[ -t 1 ]]; then
  BOLD='\033[1m'
  DIM='\033[2m'
  GREEN='\033[0;32m'
  RED='\033[0;31m'
  YELLOW='\033[0;33m'
  CYAN='\033[0;36m'
  RESET='\033[0m'
else
  BOLD='' DIM='' GREEN='' RED='' YELLOW='' CYAN='' RESET=''
fi

header() { printf "\n${BOLD}%s${RESET}\n" "$*"; }
step()   { printf "  ${DIM}▸${RESET} %s\n" "$*"; }
ok()     { printf "  ${GREEN}✓${RESET}  %s\n" "$*"; }
fail()   { printf "  ${RED}✗${RESET}  %s\n" "$*" >&2; }
warn()   { printf "  ${YELLOW}⚠${RESET}  %s\n" "$*"; }
info()   { printf "  ${DIM}%s${RESET}\n" "$*"; }
