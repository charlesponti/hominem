#!/usr/bin/env just --justfile

set shell := ["bash", "-euo", "pipefail", "-c"]
set positional-arguments := true

ROOT_DIR := justfile_directory()
TEST_DATABASE_URL := 'postgresql://postgres:postgres@127.0.0.1:5434/app-test'
TEST_AUTH_E2E_SECRET := 'otp-secret'

mod db 'just/db.just'
mod deploy 'just/deploy.just'
mod mcp 'just/mcp.just'
mod mobile 'just/mobile.just'

setup:
    cd "{{ ROOT_DIR }}" && pnpm install

dev scope='all':
    #!/usr/bin/env bash
    case "{{ scope }}" in
      all) filter=() ;;
      api) filter=(--filter=@hominem/api) ;;
      career) filter=(--filter=@hominem/career) ;;
      finance) filter=(--filter=@hominem/finance) ;;
      *) echo "error: unknown scope '{{ scope }}'" >&2; exit 1 ;;
    esac
    cd "{{ ROOT_DIR }}"
    pnpm exec turbo run dev --ui stream "${filter[@]}"

_lint task scope='all':
    #!/usr/bin/env bash
    case "{{ scope }}" in
      all) filter=() ;;
      api) filter=(--filter=@hominem/api...) ;;
      career) filter=(--filter=@hominem/career...) ;;
      finance) filter=(--filter=@hominem/finance...) ;;
      mobile) filter=(--filter=@hominem/omiro...) ;;
      *) echo "error: unknown scope '{{ scope }}'" >&2; exit 1 ;;
    esac
    cd "{{ ROOT_DIR }}"
    pnpm exec turbo run "{{ task }}" "${filter[@]}"

lint scope='all':
    just _lint lint "{{ scope }}"

lint-fix scope='all':
    just _lint lint:fix "{{ scope }}"

format first='write' second='':
    #!/usr/bin/env bash
    case "{{ first }}:{{ second }}" in
      write:) task=format; scope=all ;;
      write:all|write:api|write:career|write:finance|write:mobile) task=format; scope="{{ second }}" ;;
      check:) task=format:check; scope=all ;;
      check:all|check:api|check:career|check:finance|check:mobile) task=format:check; scope="{{ second }}" ;;
      all:|api:|career:|finance:|mobile:) task=format; scope="{{ first }}" ;;
      *) echo "error: use just format [write|check] [scope]" >&2; exit 1 ;;
    esac
    case "$scope" in
      all) filter=() ;;
      api) filter=(--filter=@hominem/api...) ;;
      career) filter=(--filter=@hominem/career...) ;;
      finance) filter=(--filter=@hominem/finance...) ;;
      mobile) filter=(--filter=@hominem/omiro...) ;;
    esac
    cd "{{ ROOT_DIR }}"
    pnpm exec turbo run "$task" "${filter[@]}"

typecheck scope='all':
    #!/usr/bin/env bash
    cd "{{ ROOT_DIR }}"
    case "{{ scope }}" in
      all) filter=() ;;
      api) filter=(--filter=@hominem/api...) ;;
      career) filter=(--filter=@hominem/career...) ;;
      finance) filter=(--filter=@hominem/finance...) ;;
      mobile) filter=(--filter=@hominem/omiro...) ;;
      *) echo "error: unknown scope '{{ scope }}'" >&2; exit 1 ;;
    esac
    pnpm exec turbo run typecheck "${filter[@]}"

build scope='all':
    #!/usr/bin/env bash
    cd "{{ ROOT_DIR }}"
    case "{{ scope }}" in
      all) filter=() ;;
      api) filter=(--filter=@hominem/api...) ;;
      career) filter=(--filter=@hominem/career...) ;;
      finance) filter=(--filter=@hominem/finance...) ;;
      mobile) filter=(--filter=@hominem/omiro...) ;;
      *) echo "error: unknown scope '{{ scope }}'" >&2; exit 1 ;;
    esac
    pnpm exec turbo run build "${filter[@]}"

test scope='all':
    #!/usr/bin/env bash
    cd "{{ ROOT_DIR }}"
    case "{{ scope }}" in
      all) filter=() ;;
      api) filter=(--filter=@hominem/api...) ;;
      career) filter=(--filter=@hominem/career...) ;;
      finance) filter=(--filter=@hominem/finance...) ;;
      mobile) filter=(--filter=@hominem/omiro...) ;;
      *) echo "error: unknown scope '{{ scope }}'" >&2; exit 1 ;;
    esac
    DATABASE_URL="{{ TEST_DATABASE_URL }}" AUTH_E2E_SECRET="{{ TEST_AUTH_E2E_SECRET }}" pnpm exec turbo run test "${filter[@]}"

check scope='all':
    just format check "{{ scope }}"
    just lint "{{ scope }}"
    just typecheck "{{ scope }}"
    just build "{{ scope }}"
    just test "{{ scope }}"
