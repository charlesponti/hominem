#!/usr/bin/env bash
goose_bin="$(go env GOPATH)/bin/goose"

# Installs the Goose CLI if it is not already installed and prints the path to the Goose binary.
if [[ ! -x "$goose_bin" ]]; then
  go install github.com/pressly/goose/v3/cmd/goose@v3.27.0
fi

printf '%s' "$goose_bin"
