---
name: hominem-development
description: Run the local development, validation, and production user-data merge commands for this repo (just/pnpm loop, local OpenTelemetry stack, merge-user-data tool). Use when starting local dev, choosing a validation command, or merging a user's local data into production.
---

# Hominem development

This skill is the repository's development runbook and also holds the
development and deployment rules and environment-variable facts that used to
live in `docs/development.md`. Per the root [AGENTS.md](../../../AGENTS.md), you
may start local dev services yourself (Expo/Metro, `pnpm dev`, the API,
workers, databases, Docker) when a task needs one running. Prefer the Browser
pane's `preview_start` for anything you'll drive or screenshot in a browser.
Stop services you started once you're done with them, unless the user is
actively using them.

`.claude/launch.json`'s `career`/`finance`/`web` entries open the Browser
pane at `http://localhost:<port>`, not the portless `https://<name>.lvh.me:4200`
URL, even though `pnpm dev` itself still runs those apps through portless.
This is deliberate: a Claude Code cloud/remote session's outbound traffic is
sandboxed through its own egress proxy, and that proxy does not support
non-443 HTTPS ports (see `/root/.ccr/README.md` inside such a session) —
portless's proxy listens on 4200, so requests to `*.lvh.me:4200` fail there,
which is why JS/CSS/HMR asset requests get silently blocked in the Browser
pane while the initial SSR HTML sometimes still renders. Loading the app's
own fixed local port instead avoids that proxy path entirely. The tradeoff:
`localhost` doesn't share the cross-subdomain `AUTH_COOKIE_DOMAIN=lvh.me`
session cookie (see [docs/authentication.md](../../../docs/authentication.md)),
so a login performed through the Browser pane on `localhost` won't persist
across apps the way it does when testing directly against the portless
`lvh.me` origins (e.g. via `curl`/Playwright, which aren't proxied the same
way). For an authenticated preview, drive the portless origins directly
instead of the Browser pane.

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
Copying alone would leave the main checkout's plain portless hostnames
(`api.lvh.me`, `career.lvh.me`, ...) in place, but a linked worktree
is actually served at a branch-prefixed hostname (see "First-time setup:
portless proxy" below) — so for every file it just copied, the script also
resolves this worktree's real URLs via `pnpm exec portless get <name>` and
patches the `API_URL`/`WEB_URL`/`CAREER_URL`/`FINANCE_URL`/
`VITE_PUBLIC_API_URL`/`HOMINEM_INTERNAL_API_URL`/`PUBLIC_APP_URL` values in
place. This needs the portless proxy already running (see below) — if it
isn't, the script leaves the copied URLs as-is and says so; start the proxy
and re-run with `--force` to patch them. It only ever touches files it just
copied in that same run, so a file that already existed (and was therefore
skipped) is never rewritten — hand-edited values are left alone.

## First-time setup: portless proxy

`pnpm dev` for `api`/`web`/`career`/`finance` runs through
[portless](https://github.com/vercel-labs/portless), configured per-package
(each app's `package.json` has its own `"portless": { "name", "script" }`
key — see below; there is no root `portless.json`), which gives each service
a stable `https://<name>.lvh.me` URL instead of
a fixed port — this is what lets the same app run from multiple worktrees
without a port collision (portless prefixes the worktree's branch name onto
the hostname automatically).

The TLD is `lvh.me`, not the `.localhost` default — `lvh.me` is a public
domain with wildcard DNS to `127.0.0.1` (like `nip.io`), and it has to be a
real registrable domain for cross-subdomain login to work at all: Chrome
(confirmed empirically) silently refuses to set any cookie with
`Domain=localhost` or `Domain=.localhost`, even though the `Set-Cookie`
response header looks completely correct — there's no client-visible error,
sign-in just quietly never persists a session. `apps/*/playwright.config.ts`
already relies on the same `lvh.me` fact for e2e cross-subdomain auth.

Don't reach for `--tld test` as a fix for this — it hits the identical wall.
Chrome's restriction isn't specific to the literal string "localhost"; it
covers the whole RFC 2606 reserved special-use-TLD group (`localhost`,
`test`, `example`, `invalid`), confirmed empirically the same way. Portless
itself supports any custom `--tld`, and a self-hosted reverse proxy (Caddy,
etc.) with its own local CA doesn't change this either — the constraint is
Chrome's cookie policy, not the proxying layer. Only a real, non-reserved
registrable domain works. See
[the local dev domain ADR](../../../docs/decisions/auth.local-tld.md) for the full
investigation and the alternatives ruled out.

Before the first `pnpm dev`, start the proxy once on an unprivileged port —
binding the default port 443 needs `sudo`, which can hang when portless's
elevation prompt isn't attached to an interactive terminal:

```bash
pnpm exec portless proxy start --port 4200 --tld lvh.me
```

This trusts a local CA (one-time, may prompt for your password directly —
that prompt does work) and starts the HTTPS proxy on port 4200. Portless
remembers this configuration, so subsequent `pnpm dev` runs auto-attach to
the running proxy instead of trying to start their own. `.env.example`
defaults already point at `https://<name>.lvh.me:4200`.

Each of `api`/`web`/`career`/`finance`'s `package.json` has its own
`"portless": { "name", "script": "dev:app" }` key — that's what portless
actually reads when a package's own `"dev": "portless"` script runs (a root
`portless.json` apps map is only consulted for the bare, monorepo-wide
`portless` command, which this repo's turbo-driven `pnpm dev` never uses).
If you add a new portless-fronted app, give it this key, not a root config
entry.

## Verifying the local stack

After dependency or React catalog changes, run `pnpm install --frozen-lockfile`
and restart SSR apps before browser tests. An already-running Vite/React
Router process can retain an older `react-dom` version and produce a misleading
SSR `useContext` failure even though the workspace install is now consistent.

Smoke-test the actual origins selected for the run:

```bash
curl -k -o /dev/null -w '%{http_code}\n' https://api.lvh.me:4200/
curl -k -o /dev/null -w '%{http_code}\n' https://web.lvh.me:4200/chats
curl -k -o /dev/null -w '%{http_code}\n' https://career.lvh.me:4200/
curl -k -o /dev/null -w '%{http_code}\n' https://finance.lvh.me:4200/
```

The Web `/chats` endpoint returning `302` is expected when the browser is not
authenticated; it proves the Web server and auth redirect are reachable.
When using the fixed-port Browser harness, use `http://localhost:4040` and
`http://localhost:4445` instead and do not mix the two origin sets in one run.

For authenticated Playwright runs, prepare the stable disposable session in
the same shell that starts Playwright:

```bash
eval "$(pnpm --filter @hominem/api --silent e2e:setup 2>/dev/null | grep 'export ')"
pnpm --filter @hominem/web test:e2e --project=chat
```

The Playwright auth setup requires `E2E_SESSION_COOKIE`; skipped scenarios must
retain their exact harness limitation in the evidence rather than being
counted as passing.

Because portless gives each app its own subdomain (`api.lvh.me`,
`career.lvh.me`, `finance.lvh.me`, `web.lvh.me`) rather than just a
different port on the same host, the hosted-login session cookie needs
`services/api`'s `AUTH_COOKIE_DOMAIN=lvh.me` (see `.env.example`) to be
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

1. `pnpm install`
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

- `pnpm install` — install dependencies and prepare the repo toolchain
- `pnpm run check` — full pre-push validation (lint → typecheck → build → test via turbo)
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
`build`/`test`, scoped with `--filter=@hominem/<package>...`), not `pnpm run check`
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

## Development rules

- Use `just` and the root `pnpm` scripts as the repository command interface. Package scripts are Turbo implementation details, not contributor instructions.
- Start with the smallest relevant validation command: `pnpm lint`, `pnpm typecheck`, `pnpm build`, or `pnpm test`. Scope it with `--filter=@hominem/<package>...`, for example `--filter=@hominem/api...`.
- The monorepo resolves types through compiled declaration contracts, not source. Package `exports` `types` conditions point at `build/`, and declaration emit is a types-only artifact. Run `pnpm dev:types` alongside `pnpm dev` when editing shared types: composite packages are watched via `tsc -b`, while the API/RPC boundaries use declaration-only emit watchers. Runtime (tsx, metro, vite) runs from source and is unaffected. If a type change ripples further than one hop, restart the TypeScript server. See [docs/type-system.md](../../../docs/type-system.md) for the model, why the watcher is shaped the way it is, and what else was tried to speed up type-checking.
- Published shared packages expose compiled artifacts. Local development may use source aliases for hot reload, but CI, deployables, EAS, and external consumers must use the same compiled public exports.
- Keep the shared UI package registry-resolved in manifests and lockfiles. Use `just ui link [path]`, `just ui status`, and `just ui unlink` for a reversible local source link. Never commit the local path.
- Use the same Node and pnpm versions in local development, CI, Docker, Railway, and EAS. A version mismatch is a defect.
- `@hominem/env` defines shared environment-variable behavior. Framework prefixes adapt a variable for a runtime; they must not give it a second meaning.
- Redact secrets from logs. Use a safe identifier instead of a raw third-party URL when one is available.

## Deployment rules

Each production service must have one deployment authority. A Railway service
managed by GitHub must not also use Railway linked-source auto-deploy.

A deployment target is identified by this set of values:

```text
repository + logical service + immutable Railway service ID
+ checked-in configuration path + triggering workflow
```

An accepted upload does not prove that deployment succeeded. Automation must
verify the resolved target and the final remote deployment state.

Omiro's mobile delivery, release, and app-specific implementation notes are
documented in [the Omiro README](../../../apps/omiro/README.md). General
repository and deployment rules remain here.

## Environment variables

- **Dev Database**: `DATABASE_URL="postgresql://postgres:postgres@localhost:5434/hominem"`
- **Test Database**: `DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:4433/hominem-test"`
