# Hominem

Hominem is a product monorepo. Active products:

- **Omiro** — `apps/omiro`, the Apple-native surface
- **API** — `services/api`, identity and data authority
- **Career** — web product, server-owned data access
- **Finance** — in monorepo, release tier governed by explicit portfolio decision

## The Bible

The repository's operating law lives in `docs/`. Read the relevant part before
changing a system boundary. Package READMEs are setup entrypoints only.

### Product

- [Product](./docs/product.md)

### System

- [Architecture](./docs/architecture.md)
- [Authentication](./docs/auth.md)
- [Data](./docs/data.md)

### Experience

- [Time](./docs/time.md)
- Design system: `@ponti-studios/ui/docs/`

### Voice

- [Voice](./docs/voice.md)

### Operations

- [Developer](./docs/developer.md)
- [Evidence](./docs/evidence.md)
- [Sentry](./docs/sentry.md)
- [Production](./docs/production.md)

### Other

- [Design](./docs/design.md)

The reusable mobile starter extracted from Omiro now lives in the standalone
`/Users/charlesponti/Developer/ponti-mobile-starter` repo. Hominem continues to own the
production Omiro app, while `ponti-mobile-starter` owns the reusable mobile shell,
theming, auth seams, and starter contract for future experiments.

## Architecture

```text
apps/omiro     -> Expo app, native UI, mobile-only helpers
services/api   -> Hono API, auth, data access, workers
packages/*     -> shared libraries: db, env, utils, ui, auth, rpc, telemetry, hooks, etc.
```

The default direction is from apps into shared packages, and from shared packages into `services/api` only when backend coordination is required.

## Ponti UI package

`@ponti-studios/ui` is installed from GitHub Packages, not copied into this repository. Before installing dependencies outside GitHub Actions, configure a user-level credential with a token that has `read:packages` access to the `ponti-studios` organization:

```bash
pnpm config set --location=user //npm.pkg.github.com/:_authToken "$NODE_AUTH_TOKEN"
```

After the initial package publication, grant this repository Actions read access in the package's **Package settings → Manage Actions access**. Railway builds also need the same read-only token configured in their user-level npm configuration; do not put it in this repository's `.npmrc`.

## Golden Path

Use the smallest possible loop by default.

1. `just setup`
2. `pnpm --filter @hominem/api dev`
3. `pnpm test --filter=@hominem/api...`

When you are working on the API or shared backend code, run the API validation lane instead:

1. Start the local test services you need.
2. Run `pnpm lint --filter=@hominem/api...`, `pnpm typecheck --filter=@hominem/api...`, `pnpm build --filter=@hominem/api...`, `pnpm test --filter=@hominem/api...`

For Omiro work, use the app bootstrap loop in `apps/omiro/README.md`:

1. `just mobile prebuild development`
2. `just mobile dev`

## Canonical Commands

- `just setup`: install dependencies and prepare the repo toolchain
- `just check`: read-only format, lint, typecheck, build, and test validation across the whole repo
- `pnpm dev` / `pnpm typecheck` / `pnpm build` / `pnpm test`: run for every package, or scope with `--filter=@hominem/<pkg>...` (e.g. `--filter=@hominem/api...`)
- `pnpm format`: apply formatting across the repo
- `pnpm lint` / `pnpm lint:fix`: lint the repo, or lint and apply fixes
- `just db migrate [test]`: apply database migrations
- `just db codegen`: regenerate database types against the caller's `DATABASE_URL`
- `just mobile <action>`: iOS development, test, build, update, and release commands

## Setup And Build

1. `just setup`
2. `pnpm lint --filter=@hominem/api... && pnpm typecheck --filter=@hominem/api... && pnpm build --filter=@hominem/api... && pnpm test --filter=@hominem/api...`
3. `pnpm build` for a full workspace build when needed

`just` provides `setup`, `check`, `db`, `mcp`, and `mobile`. Everything else is a root `pnpm` script, optionally scoped with `--filter`.

## CI Model

The workflow is split into two layers:

- canonical checks: `Web Checks` and `API Checks`
- confidence lanes: `DB Migrations` and `E2E Web Auth`

The goal is to keep the product feedback loop focused while still preserving slower release-confidence checks.
