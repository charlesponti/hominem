set shell := ["bash", "-euo", "pipefail", "-c"]

root_dir := justfile_directory()
ui_repo_default := root_dir + "/../ui"

ui_consumers := root_dir + "/apps/career" + " " + root_dir + "/apps/finance" + " " + root_dir + "/apps/omiro"

link path=ui_repo_default:
    #!/usr/bin/env bash
    set -euo pipefail
    ui_repo="{{path}}"
    if [[ -n "${UI_REPO_PATH:-}" && "{{path}}" == "{{ui_repo_default}}" ]]; then
      ui_repo="$UI_REPO_PATH"
    fi
    [[ -d "$ui_repo" ]] || { echo "UI repository not found: $ui_repo" >&2; exit 1; }
    package_name="$(node -p "require('$ui_repo/package.json').name")"
    [[ "$package_name" == "@ponti-studios/ui" ]] || { echo "Expected @ponti-studios/ui, found $package_name" >&2; exit 1; }
    for consumer in {{ui_consumers}}; do
      echo "Linking @ponti-studios/ui in $consumer"
      mkdir -p "$consumer/node_modules/@ponti-studios"
      ln -sfn "$ui_repo" "$consumer/node_modules/@ponti-studios/ui"
    done

unlink:
    #!/usr/bin/env bash
    set -euo pipefail
    registry_target="$(find "{{root_dir}}/node_modules/.pnpm" -type d -path '*/node_modules/@ponti-studios/ui' -print -quit)"
    [[ -n "$registry_target" ]] || { echo "Registry @ponti-studios/ui 1.3.0 is not installed" >&2; exit 1; }
    for consumer in {{ui_consumers}}; do
      echo "Restoring registry @ponti-studios/ui in $consumer"
      rm -f "$consumer/node_modules/@ponti-studios/ui"
      ln -s "$registry_target" "$consumer/node_modules/@ponti-studios/ui"
    done

status:
    #!/usr/bin/env bash
    set -euo pipefail
    default_ui_repo="$(realpath "{{ui_repo_default}}")"
    custom_ui_repo=""
    if [[ -n "${UI_REPO_PATH:-}" ]]; then custom_ui_repo="$(realpath "$UI_REPO_PATH")"; fi
    registry_count=0
    local_count=0
    for consumer in {{ui_consumers}}; do
      resolved="$(node -e "const fs=require('fs'); const p='$consumer/node_modules/@ponti-studios/ui/package.json'; if (!fs.existsSync(p)) process.exit(2); console.log(fs.realpathSync(p))")" || { echo "$consumer: missing"; exit 1; }
      if [[ "$resolved" == "$default_ui_repo" || -n "$custom_ui_repo" && "$resolved" == "$custom_ui_repo" ]]; then
        local_count=$((local_count + 1))
        echo "$consumer: local -> $resolved"
      else
        registry_count=$((registry_count + 1))
        echo "$consumer: registry -> $resolved"
      fi
    done
    if (( local_count > 0 && registry_count > 0 )); then
      echo "Mixed local/registry UI resolution is not supported" >&2
      exit 1
    fi
