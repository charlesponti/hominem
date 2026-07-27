## Rules

- Follow YAGNI (You Aren't Gonna Need It) principle and one-liner solutions whenever possible.
- Never commit code. The user must review and commit the changes themselves.
- `apps/omiro` should only support Apple devices. Do not add fallbacks for other platforms such as Android.

## Decision authority

- The user is the product manager and software architect. Do not invent, infer, or silently select product behavior, information architecture, navigation hierarchy, route ownership, or platform architecture.
- In particular, do not introduce, remove, or relocate root destinations; change tabs into stacks or stacks into tabs; change route ownership; alter information architecture; or reinterpret a design reference without explicit user approval.
- Treat user-stated product intent, approved PRDs, approved specs, and existing governing Bible rules as authoritative. If they conflict or leave an architectural choice open, stop and ask the user; do not resolve the conflict by choosing an architecture.
- When the request, PRD, spec, plan, task list, and code disagree: stop implementation at the disagreement, state the exact conflict and affected files, and ask the user which source is authoritative.
- Never rewrite a PRD, spec, plan, or task list to justify an implementation choice that the user did not approve. Mark unresolved decisions as `OPEN — USER DECISION REQUIRED`.
- If implementation work reveals that the approved architecture cannot be expressed with the chosen library, report the constraint and alternatives without selecting one.

## Evidence before completion

- A change is complete only when its validation proves the exact behavior that changed in the environment where that behavior runs. Type checks, linting, a build, or unrelated tests are supporting evidence; none proves a user interaction, visual layout, external side effect, or deployment outcome.
- Select validation from the risk, not from habit: verify user-visible or interactive changes on the target device/browser; verify external writes against the resulting external state; verify library/framework assumptions with a minimal working proof before building a feature on them.
- For stateful interactions, test every affected state and transition, including entry, active/focused or loading state, cancellation or failure, and return to the prior state. A control that renders is not validated until its action and resulting state are observed.
- Before composing controls into a constrained surface, prove that the full composition fits at the smallest supported viewport, device, or container. If the chosen primitive cannot meet the approved behavior within those constraints, stop and report the limitation; do not improvise a different product behavior.
- Treat a failed, skipped, ambiguous, stale-build, or non-targeted validation as a blocker. State exactly what remains unproven. Never call work done, update acceptance tests as though it passed, or claim a result based on a test that did not exercise the changed behavior.
- Automation needs a deterministic observation path. If an app-owned control or outcome cannot be selected or observed reliably, resolve that testability gap or report it before completion; do not replace it with a fuzzy assertion and call the interaction verified.
- For Omiro, a user-visible interaction requires Maestro evidence on the booted iPhone simulator and visual inspection of every changed state. A type check or unit test may supplement this evidence but never replace it.

## Repo structure

pnpm monorepo orchestrated with Turbo. Key directories:

- `apps/omiro` — Expo/React Native iOS app (Apple-only; no Android fallbacks)
- `apps/career` — React Router v7 web app
- `services/api` — Hono HTTP + BullMQ worker
- `packages/db` — PostgreSQL + Kysely + Goose migrations
- `packages/auth` — Better-auth (passkeys + OTP)
- `packages/ai` — OpenRouter integration
- `justfile` and `just/*.just` — the repository command interface and its domain modules

## Commands

Use `just` for every repo-level command. Package scripts are internal Turbo primitives.

```bash
just dev api
just check api
just check mobile
just format write
just db migrate
```

## Code style

- Linter: **oxlint** — `typescript/no-explicit-any` is an **error**, not a warning
- Formatter: **oxfmt** — single quotes, imports sorted ascending case-insensitively
- Run `just format write` to apply formatting before any edit is considered done
- If a function only calls a function use `() => <function name>(<args>)` style instead of unnecessary curly braces

## Git conventions

- Branch naming: `feature/<name>`
- PR merge: squash commit
- Never commit on the user's behalf — always leave commits for the user to review and push

## Documentation

- The root `README.md` is the front door to the Hominem Bible ([docs/](docs/)).
- Durable product, architecture, design, security, and operational decisions in the appropriate numbered Bible part under the root `docs/` directory.
  - Do not create `docs/` directories inside apps, packages, or services.
- Keep package READMEs to setup and local entrypoint information; link to the root Bible for governing decisions.
- Write current rules and invariants, not incident narratives or temporary task lists. Git history preserves history; the work tracker owns temporary execution.
- Update the relevant Bible document in the same change when a durable implementation decision changes.

## Adding a new package, app, or service

**Never add a `workspace:*` dependency for a type-only import.** If you only `import type { X } from '@hominem/y'`, do not list `@hominem/y` in `package.json`. pnpm/turbo build their task graph from `package.json` edges with no idea an import is type-only — a single `import type` turned into a real dependency once dragged another package's entire build/test/lint/typecheck into every consumer's CI scope. Instead, add a `paths` alias directly in your own `tsconfig.json` pointing at the real source file:

```json
"paths": { "@hominem/api/types": ["../../services/api/src/rpc/app.ts"] }
```

Keep it in sync with whatever `services/api/package.json`'s `exports` map says that subpath resolves to. `packages/rpc`, `apps/career`, `apps/omiro`, and `apps/finance` all do this for `@hominem/api` — copy the pattern.

**New library package (something other packages depend on at runtime):**

1. `tsconfig.json`: `rootDir: "src"`, `outDir: "./build"`, `tsBuildInfoFile: "./.cache/tsconfig.tsbuildinfo"` — always package-local, never a shared cross-package `.cache/` path. Turbo can't safely cache outputs that escape a package's own directory.
2. Add a `"references"` array mirroring your real `package.json` dependencies exactly (only other composite library packages — see below).
3. Add a `"build": "tsc -p tsconfig.json"` script if you don't have one — required for your `references` (and anything referencing _you_) to resolve real declaration output instead of erroring with "Output file has not been built from source file" during `tsc --noEmit`.
4. Register yourself in the root `tsconfig.json`'s `references` array — but only if `outDir` is actually set. A referenced project with no `outDir` and `tsc -b` run from root will ignore `noEmit` and write generated `.js`/`.d.ts` straight into your `src/` tree (this happened while wiring this up — `packages/rpc` and `services/api` are deliberately excluded from the root graph for exactly this reason, since they're type-inference boundary packages, see below).

**Package that infers types across other packages (Hono `typeof app` RPC pattern, like `services/api`):** do NOT wire it into the composite `references` graph even if its dependencies are composite. TS's "portable type" check (`TS2883`) refuses to infer an exported type like `AppType` across a real composite project boundary without an explicit annotation, which defeats Hono's RPC type-inference pattern. Keep it resolving dependencies via plain source (no `references`, `composite: false`), exactly like `services/api/tsconfig.json` and `packages/rpc/tsconfig.json` already do — their tsconfig comments explain why.

**New deployable app or service:**

1. `Dockerfile`, if it deploys via Railway/Docker: follow `services/api/Dockerfile` / `apps/career/Dockerfile` — `COPY` only `packages`, `services/api` (if you need its types), and your own app directory, never `COPY . .`, then `pnpm install --frozen-lockfile --filter @hominem/<name>...` (scoped install) before building. This keeps build time and context size flat as unrelated apps get added to the monorepo.
2. `.github/workflows/validate-<name>.yml`: model it on `validate-career.yml`. Set every env var your app _and its transitive dependencies_ actually require in the job's `env:` block with fake test values — including ones you don't obviously need yourself (e.g. `DATABASE_URL` if you depend on `@hominem/db`, `BETTER_AUTH_SECRET` if anything in your dependency chain imports `services/api` for real). Use `./.github/actions/setup-pnpm-workspace` for setup — it caches both the pnpm store and turbo's local cache directory (`.turbo/cache`), shared across all `validate-*.yml` workflows, so your new workflow reuses whatever core packages an earlier workflow already built/tested on this branch instead of rebuilding them from scratch. This is the main lever keeping CI time from growing linearly with app count — see "CI and build performance" below.
3. `deploy-<name>.yml`, if it deploys: trigger on `workflow_run: { workflows: [validate-<name>] }`. The workflow **name** (the `name:` field, not the filename) must match exactly — renaming a `validate-*.yml` workflow silently breaks its deploy trigger with no error.
4. A new deployable app's CI workflow must set every env var required by its own code _and_ its transitive `@hominem/*` dependencies — missing one silently breaks CI with an `EnvValidationError`, not an obviously-related error message.

## CI and build performance

- Real remote caching (Vercel Remote Cache or self-hosted) is not configured — every CI log shows "Remote caching disabled" even though `TURBO_TOKEN`/`TURBO_TEAM` are wired into every `validate-*.yml`. Until that's set up, `.github/actions/setup-pnpm-workspace/action.yml` caches turbo's local `.turbo/cache` directory via `actions/cache`, shared across all validate workflows on a branch — this is what stops every workflow from redundantly rebuilding the same core packages. Setting up real remote caching (needs a Vercel team/token or a self-hosted cache server) would let this same benefit extend across branches and to every contributor's local machine, and should replace this local-cache stand-in once available.
- `assumeChangesOnlyAffectDirectDependencies` is set in `tsconfig.base.json` for tsserver editor responsiveness in this project-reference graph (ignored by `tsc`/CI, editor-only). Anything that doesn't go through the shared `tsconfig.profiles/*` chain — like `apps/omiro`, which extends `expo/tsconfig.base` directly — needs the same flag set explicitly in its own `tsconfig.json`.
- `turbo.json`'s `typecheck` task `dependsOn: ["^build"]` — a package's composite dependencies get built (and turbo-cached) before it typechecks, so referenced projects have real declaration output to resolve against.

## Monorepo notes

- This root file is the sole agent instruction authority for the repository. Path-scoped `.claude/rules/` files may add narrowly scoped guidance, but must not duplicate or contradict these rules.
- The work tracker owns temporary execution.

## Expo and EAS

- `apps/omiro` uses Expo managed workflow with Metro package exports enabled.
- Shared ESM packages may use explicit `.js` imports while their source files are TypeScript. Keep the Omiro Metro resolver fallback that retries an explicit `.js` import without the extension so Metro can resolve the source file; do not rewrite shared Node ESM imports just to satisfy Metro.
- With Corepack enabled, do not pin `pnpm` in `apps/omiro/eas.json`. EAS may attempt a conflicting global install and fail with `npm ERR! EEXIST`.
- Verify an EAS fix with the same embed command used by the build: `pnpm --filter @hominem/omiro exec expo export:embed --eager --platform ios --dev false`.

## Mobile (omiro)

### Navigation and components

- Uses Expo Router file-based routes. Route files live in `apps/omiro/app/`; the `~` alias maps to the Omiro project root.
- Navigation architecture is user-owned. Do not introduce a root tab bar, remove a context from the header, move Tasks into a separate root destination, or otherwise change the Chats/Notes/Tasks information architecture without explicit approval in the current user request and governing spec.
- `app/(auth)/` contains unauthenticated screens. `app/(protected)/` requires auth and is guarded through `resolveAuthRedirect` in its layout. Auth redirect logic lives in `services/navigation/auth-route-guard.ts`.
- Root provider order is `GestureHandlerRootView` → `SafeAreaProvider` → `KeyboardProvider` → `QueryClientProvider` → `AuthProvider` → `PostHogProvider`. Do not add a provider without checking that chain.
- Use `makeStyles` and `theme` from `~/components/theme`; do not introduce hardcoded style values through raw `StyleSheet.create`.

### Commands

```bash
just mobile dev                  # launch on iOS simulator
just mobile lint                 # lint
just mobile prebuild development # Expo prebuild for development
just mobile test                 # Omiro test lane
```

### Testing the omiro app (iOS Simulator)

Use **Maestro** for programmatic UI testing of `apps/omiro`. The app is installed on the booted simulator as `com.pontistudios.hakumi.dev`.

**Prerequisites — Java 17 must be on PATH before running Maestro:**

```bash
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
```

**Launch the app:**

```bash
xcrun simctl launch booted com.pontistudios.hakumi.dev
```

**Take a screenshot:**

```bash
xcrun simctl io booted screenshot /tmp/omiro_screen.png
```

**Run a Maestro flow:**

```bash
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH" && export JAVA_HOME="/opt/homebrew/opt/openjdk@17" && maestro test my_flow.yaml
```

**Maestro flow skeleton:**

```yaml
appId: com.pontistudios.hakumi.dev
---
- launchApp
- assertVisible: 'Omiro'
- tapOn:
    id: 'feed-composer-input' # use testID values from source
- inputText: 'some text'
- takeScreenshot: /tmp/omiro_step
```

Tap targets use the React Native `testID` prop. Key IDs already in the codebase:

- `feed-composer` — the composer shell on the home screen
- `feed-composer-input` — the text input inside the home composer
- `chat-composer` / `chat-composer-input` — same for the chat detail screen

The booted simulator is iPhone 17 Pro (UDID `BD390792-D3EC-4351-BE57-EAF642FABD34`).

**Known issue — always tap by `id`, not by fuzzy text:** iOS's accessibility tree merges all children of a screen (e.g. a bottom sheet) into a single node whenever no text field currently has focus. When that happens, `tapOn: text: '...'` (or the Maestro MCP `tap_on` tool's `text` param) resolves to the center point of that merged node's bounds — which is often the modal backdrop, not the element you meant — and silently dismisses the sheet instead of tapping the target. Tapping by `id` (i.e. the element's `testID`) works reliably regardless of focus state and does not suffer from this merging. Prefer `id` selectors over `text` selectors for anything inside a modal/sheet.

## API implementation rules

`services/api` is a Hono HTTP server and BullMQ worker. Its entry points are `src/index.ts` for HTTP and `src/worker.ts` for jobs.

- `AppEnv` in `src/server.ts` declares Hono's context variable map. Auth middleware sets `ctx.var.user`, `ctx.var.userId`, and `ctx.var.auth`; route handlers read those values and do not re-fetch the user.
- A route lives in `src/routes/<name>.ts` as a `Hono<AppEnv>` instance and is registered from `src/server.ts` with `app.route('/path', myRoutes)`. Apply `authJwtMiddleware` only when its route-specific protection is needed.
- `src/rpc/app.ts` is the type-safe RPC contract consumed by clients through `@hominem/api/types`. Update affected clients in the same change as an RPC contract change.
- Use `isServiceError` from `src/errors.ts` for known domain failures. Throw typed errors and let the global handler map them to HTTP responses.
- Job handlers live in `src/workers/` and register in `src/worker.ts`. The worker is a separate process and shares no HTTP-server memory.
- From `services/api`, build with `node build.mjs`; standard Turbo build is not its build path. Use `just test api` and `just dev api` for its normal lanes.

## Database implementation rules

`packages/db` is PostgreSQL access code and server-only. Client code uses `@hominem/rpc`, never the database package directly.

### Migrations and generated types

- `packages/db/src/types/database.ts` is generated by `kysely-codegen`; never edit it manually. After schema changes, run `just db migrate` then `just db codegen`.
- Migrations live in `packages/db/migrations/`, use Goose SQL `Up` and `Down` markers, and are idempotent because CI runs `goose up` twice.
- The schemas are `auth`, `app`, and `ops`. `pgcrypto`, `pg_trgm`, `unaccent`, `vector`, `earthdistance`, `ltree`, and `fuzzystrmatch` are already installed; do not create them again.

### Database workflow

After any schema change, follow [.agents/skills/db-migrate/SKILL.md](.agents/skills/db-migrate/SKILL.md):

```bash
just db migrate            # apply migrations using DATABASE_URL
just db codegen            # regenerate Kysely types using DATABASE_URL
```

Tests require `DATABASE_URL` to point at the intended test database with migrations applied:

```bash
just db migrate test
```

Do not rely on fallback database URLs. Set `DATABASE_URL` explicitly for local dev, CI, and tests.

### Repository boundary

Each domain has one repository file under `packages/db/src/services/<domain>/<name>.repository.ts`; split only when a domain contains entities with separate lifecycles or tables.

1. Keep the Kysely `Selectable<T>` row type private.
2. Export a hand-written, JSON-serializable DTO; never expose or alias `Selectable<T>` publicly.
3. Convert rows to DTOs in one explicit mapper.
4. Export functions returning DTOs, never row types. Query-local casts are permitted before mapping, never on an exported result.
5. Compose repositories in one direction. Put shared sibling checks in a leaf module rather than importing back into a parent domain.

At the RPC layer, return repository DTOs directly with `c.json({ x })`; do not recreate a parallel response type. Use `runInTransaction` from `@hominem/db` for multi-table writes.

## Production authentication

- Better Auth is the sole authentication authority. Preserve its session database, signed cookies, and native client storage contract.
- Do not add custom token or session storage when the Better Auth surface already exists.
- The test OTP store is enabled by `NODE_ENV !== 'production'`. A duplicate env-var gate is unnecessary and harmful. When enabled, the API records OTPs in the test store and returns success without sending through Resend.
- A `200` response from the OTP request endpoint does not prove delivery. Check the email provider path without logging OTPs, tokens, cookies, or credentials.
- Never rotate `BETTER_AUTH_SECRET` casually. Better Auth signs session cookies with it; changing it can invalidate every stored client session even when the database session rows still exist.
- When investigating a production auth incident, check the API deployment status, `/api/status`, auth HTTP status patterns, the presence of the OTP flag, and aggregate session counts/expiry through an approved Railway database tunnel. Do not retrieve session tokens or user records.
- `scripts/command` is a Bash command router invoked through `just`; use the `justfile` recipes as the public command interface.
