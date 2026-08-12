start:
    pnpm --filter @hominem/omiro start:ios

dev:
    pnpm --filter @hominem/omiro run:ios

e2e:
    pnpm --filter @hominem/omiro run:ios:e2e

lint:
    pnpm --filter @hominem/omiro lint:expo

test:
    pnpm --filter @hominem/omiro test

test-watch:
    pnpm --filter @hominem/omiro test:watch

prebuild env:
    #!/usr/bin/env bash
    set -euo pipefail
    case "{{ env }}" in
        development) pnpm --filter @hominem/omiro run prebuild:dev ;;
        production) pnpm --filter @hominem/omiro run prebuild:prod ;;
        screenshots) pnpm --filter @hominem/omiro run prebuild:screenshots ;;
        *)
            echo "error: unknown env '{{ env }}' (expected development|production|screenshots)" >&2
            exit 1
            ;;
    esac

# Runs apps/omiro/.eas/workflows/production-release.yml: build, verify app
# identity, wait for approval, then submit to TestFlight/App Store.
release:
    cd apps/omiro && pnpm exec eas workflow:run .eas/workflows/production-release.yml

# Runs apps/omiro/.eas/workflows/ota-update.yml to publish a JS-only update
# to the production channel.
update message:
    cd apps/omiro && pnpm exec eas workflow:run .eas/workflows/ota-update.yml -F message="{{ message }}"
