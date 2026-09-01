---
name: hominem-development
description: Run the local development, validation, and production user-data merge commands for this repo (just/pnpm loop, local OpenTelemetry stack, merge-user-data tool). Use when starting local dev, choosing a validation command, or merging a user's local data into production.
---

# Hominem development

Deployment-authority rules (one deployment authority per service, what proves
a deployment succeeded) live in [docs/development.md](../../../docs/development.md)
and are not repeated here — this skill is the command runbook.

Never start long-running services yourself (Expo/Metro, `pnpm dev`, the API,
workers, databases, Docker) — the user starts them. This skill's commands
assume the user has already started whatever the task needs.

## First-time setup: env files in a new worktree

A freshly created worktree has none of the git-ignored `.env` files each
app/service/package needs (they hold real secrets, so they're never
committed). Copy them over from the main checkout in one step:

```bash
scripts/sync-worktree-env.sh            # copies whatever's missing
scripts/sync-worktree-env.sh --dry-run  # preview without changing anything
scripts/sync-worktree-env.sh --force    # also overwrite files that already exist
```

It never overwrites an existing file by default, so it's safe to re-run.
After copying, review the `*_URL` / `VITE_PUBLIC_API_URL` /
`HOMINEM_INTERNAL_API_URL` values in the copied files — a worktree running
its own portless-proxied instance (see below) needs the `:4200` portless
URLs, not the plain-port ones the main checkout may still use.

## First-time setup: portless proxy

`pnpm dev` for `api`/`web`/`career`/`finance` runs through
[portless](https://github.com/vercel-labs/portless), configured per-package
(each app's `package.json` has its own `"portless": { "name", "script" }`
key — see below; there is no root `portless.json`), which gives each service
a stable `https://<name>.localhost` URL instead of
a fixed port — this is what lets the same app run from multiple worktrees
without a port collision (portless prefixes the worktree's branch name onto
the hostname automatically).

Before the first `pnpm dev`, start the proxy once on an unprivileged port —
binding the default port 443 needs `sudo`, which can hang when portless's
elevation prompt isn't attached to an interactive terminal:

```bash
pnpm exec portless proxy start --port 4200
```

This trusts a local CA (one-time, may prompt for your password directly —
that prompt does work) and starts the HTTPS proxy on port 4200. Portless
remembers this configuration, so subsequent `pnpm dev` runs auto-attach to
the running proxy instead of trying to start their own. `.env.example`
defaults already point at `https://<name>.localhost:4200`.

Each of `api`/`web`/`career`/`finance`'s `package.json` has its own
`"portless": { "name", "script": "dev:app" }` key — that's what portless
actually reads when a package's own `"dev": "portless"` script runs (a root
`portless.json` apps map is only consulted for the bare, monorepo-wide
`portless` command, which this repo's turbo-driven `pnpm dev` never uses).
If you add a new portless-fronted app, give it this key, not a root config
entry.

Because portless gives each app its own subdomain (`api.localhost`,
`career.localhost`, `finance.localhost`, `web.localhost`) rather than just a
different port on the same host, the hosted-login session cookie needs
`services/api`'s `AUTH_COOKIE_DOMAIN=localhost` (see `.env.example`) to be
shared across them via Better Auth's cross-subdomain cookies — without it,
login appears to succeed but the other apps never see the session and bounce
back to `/login`. See [docs/authentication.md](../../../docs/authentication.md)
for the full cookie-domain mechanism.

`services/api`'s hosted login page ships a client bundle
(`public/login.js`) built from `src/routes/login/browser.ts` — this is a
committed artifact, not compiled at request time, so a source-only edit to
`browser.ts` has no effect until it's rebuilt. `pnpm dev`/`dev:api` handles
this automatically (see [services/api/AGENTS.md](../../../services/api/AGENTS.md)); an out-of-band build needs
`node build.mjs` run from `services/api`, with the regenerated
`public/login.js` committed alongside the source change.

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
