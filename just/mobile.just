OMIRO_DIR := justfile_directory() / 'apps' / 'omiro'
start:
    cd "{{ OMIRO_DIR }}" && APP_ENV=development pnpm exec expo start --dev-client --ios

dev:
    cd "{{ OMIRO_DIR }}" && APP_ENV=development pnpm exec expo run:ios

e2e:
    cd "{{ OMIRO_DIR }}" && APP_ENV=e2e pnpm exec expo run:ios

lint:
    cd "{{ OMIRO_DIR }}" && pnpm exec expo lint

test:
    cd "{{ OMIRO_DIR }}" && pnpm exec vitest run --config vitest.config.ts

test-watch:
    cd "{{ OMIRO_DIR }}" && pnpm exec vitest --config vitest.config.ts

cng-check:
    bash "{{ justfile_directory() }}/scripts/check-omiro-cng.sh"

build-config-check:
    bash "{{ justfile_directory() }}/scripts/check-omiro-eas-build-config.sh"

update environment:
    #!/usr/bin/env bash
    case "{{ environment }}" in
      production) cd "{{ OMIRO_DIR }}" && APP_ENV=production pnpm dlx eas-cli@21.2.0 update --channel production ;;
      *) echo "error: unknown environment '{{ environment }}'" >&2; exit 1 ;;
    esac

release:
    #!/usr/bin/env bash
    cd "{{ OMIRO_DIR }}"
    APP_ENV=production pnpm dlx eas-cli@21.2.0 build --platform ios --profile production --auto-submit --non-interactive