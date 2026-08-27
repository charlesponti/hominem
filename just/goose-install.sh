#!/usr/bin/env bash
goose_bin="$(go env GOPATH)/bin/goose"

# Installs the Goose CLI if it is not already installed and prints the path to the Goose binary.
# go install verifies every transitive module against sum.golang.org, which
# intermittently returns transient HTTP/2 stream errors in CI; retry a few
# times before giving up rather than failing the whole job on a blip.
if [[ ! -x "$goose_bin" ]]; then
  attempt=1
  until go install github.com/pressly/goose/v3/cmd/goose@v3.27.0; do
    if (( attempt >= 3 )); then
      echo "error: go install failed after ${attempt} attempts" >&2
      exit 1
    fi
    echo "go install failed (attempt ${attempt}/3), retrying..." >&2
    sleep $((attempt * 5))
    attempt=$((attempt + 1))
  done
fi

printf '%s' "$goose_bin"
