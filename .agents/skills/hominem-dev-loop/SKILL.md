---
name: hominem-dev-loop
description: Run the local development, validation, and production user-data merge commands for this repo (just/pnpm loop, local OpenTelemetry stack, merge-user-data tool). Use when starting local dev, choosing a validation command, or merging a user's local data into production.
---

# Hominem dev loop

Deployment-authority rules (one deployment authority per service, what proves
a deployment succeeded) live in [docs/development.md](../../../docs/development.md)
and are not repeated here — this skill is the command runbook.

Never start long-running services yourself (Expo/Metro, `pnpm dev`, the API,
workers, databases, Docker) — the user starts them. This skill's commands
assume the user has already started whatever the task needs.

## Smallest loop by default

1. `just setup`
2. `pnpm --filter @hominem/api dev`
3. `pnpm test --filter=@hominem/api...`

When working on the API or shared backend code, run the fuller API validation
lane instead:

1. Start the local test services you need.
2. `pnpm lint --filter=@hominem/api...`, `pnpm typecheck --filter=@hominem/api...`, `pnpm build --filter=@hominem/api...`, `pnpm test --filter=@hominem/api...`
3. `pnpm build` for a full workspace build when needed

For Omiro work, use the app bootstrap loop in
[apps/omiro/README.md](../../../apps/omiro/README.md):

1. `just mobile prebuild development`
2. `just mobile dev`

## Canonical commands

- `just setup` — install dependencies and prepare the repo toolchain
- `just check` — read-only format, lint, typecheck, build, and test validation across the whole repo
- `pnpm dev` / `pnpm typecheck` / `pnpm build` / `pnpm test` — run for every package, or scope with `--filter=@hominem/<pkg>...`
- `pnpm format` — apply formatting across the repo
- `pnpm lint` / `pnpm lint:fix` — lint the repo, or lint and apply fixes
- `just db backup` — timestamped SQL backup of the dev database in `~/.hominem/`
- `just db migrate [test]` — apply database migrations
- `just db codegen` — regenerate database types against the caller's `DATABASE_URL`
- `pnpm --filter @hominem/api merge-user-data` — dry-run-first, insert-only local-to-production user-data merge (see below)
- `just mobile <action>` — iOS development, test, build, update, release commands
- `cd ~/Developer/infra/foundation && just up` / `just health` / `just down` — local infrastructure, including the OTLP Collector and Jaeger

Use the smallest relevant validation command first (`pnpm lint`/`typecheck`/
`build`/`test`, scoped with `--filter=@hominem/<package>...`), not `just check`
for every small change.

## Local OpenTelemetry

Start the foundation stack before running the API when you want local traces.
The API and worker export to `http://localhost:4318` from local env config.

- Jaeger: `http://localhost:16686`
- Collector logs: `cd ~/Developer/infra/foundation && just logs otel-collector`
- Local application logs stay in the service terminal

## Production user-data merge

```bash
pnpm --filter @hominem/api merge-user-data --sourceEmail <email> --targetEmail <email>
```

This plans a merge without writing to either database. Requires
`SOURCE_DATABASE_URL` and `TARGET_DATABASE_URL`; resolves one user in each
database; verifies the complete Goose history and app schema fingerprint;
writes a permission-restricted manifest under
`~/.hominem/user-data-merges/`.

Only after reviewing that manifest, run with `--apply --yes`. The tool then:

- creates a production `pg_dump` backup beside the manifest,
- inserts rows atomically, never updates or deletes production data,
- aborts on any non-identical primary-key or unique-key collision,
- excludes `app.ai_usage_events` and every `app.purchase_*` table.

For Railway, use a temporary tunnel as `TARGET_DATABASE_URL`, then close it
after the command finishes:

```bash
pnpm dlx @railway/cli@5.25.1 connect database --tunnel-only --environment production
```
