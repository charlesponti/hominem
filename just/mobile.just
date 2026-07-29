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

cng-check:
    pnpm --filter @hominem/omiro check:cng

ota-safe-check:
    pnpm --filter @hominem/omiro check:ota-safe

build-config-check:
    pnpm --filter @hominem/omiro check:build-config

update environment='':
    pnpm --filter @hominem/omiro update

release:
    pnpm --filter @hominem/omiro release
