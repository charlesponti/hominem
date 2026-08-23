set dotenv-load := false

status:
    #!/usr/bin/env bash
    set -euo pipefail
    sha="$(git rev-parse HEAD)"
    gh run list --branch main --commit "$sha" --limit 20 \
      --json name,status,conclusion,url \
      --jq '.[] | [.name, .status, (.conclusion // ""), .url] | @tsv'
