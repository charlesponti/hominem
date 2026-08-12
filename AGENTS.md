## Rules

- Follow YAGNI (You Aren't Gonna Need It) principle and one-liner solutions whenever possible.
- Agents may commit code, but every commit must follow the Conventional Commits standard. Load the globally installed `conventional-commit` skill before staging, committing, or pushing.
- `apps/omiro` should only support Apple devices. Do not add fallbacks for other platforms such as Android.
- Never start long-running services (Expo/Metro, `pnpm dev`, the API, workers, databases, Docker containers, etc.) on your own. The user starts services for you. If a service is needed and not running, say so and ask the user to start it.
- **Evidence**: A change is not complete until it meets that standard. Validation and evidence standards are documented in [docs/evidence.md](docs/evidence.md). 
- **Production web auth**: Career and Finance redirect unauthenticated browsers to the API hosted login. Browser traffic uses the public API, while server auth/data calls require the private Railway API URL. See [docs/auth-production.md](docs/auth-production.md).


## Decision authority

- The user is the product manager and software architect. Do not invent, infer, or silently select product behavior, information architecture, navigation hierarchy, route ownership, or platform architecture.
- Do not introduce, remove, or relocate root destinations; alter information architecture; or reinterpret a design reference without explicit user approval.
- Treat the documentation as authoritative. If the user wishes to do something that will go against the documentation, ask them for explicit approval. If they confirm, update the relevant documentation before proceeding with the implementation.
- Never rewrite documentation to justify your own implementation choices that the user did not approve. Mark unresolved decisions as `OPEN — USER DECISION REQUIRED`.
- If implementation work reveals that the approved architecture cannot be expressed with the chosen library, report the constraint and alternatives without selecting one.

## Repo structure

pnpm monorepo orchestrated with Turbo. Key directories:

- `apps/omiro` — Expo/React Native iOS app (Apple-only; no Android fallbacks). See [apps/omiro/AGENTS.md](apps/omiro/AGENTS.md).
- `apps/career` — React Router v7 web app
- `services/api` — Hono HTTP + BullMQ worker. See [services/api/AGENTS.md](services/api/AGENTS.md).
- `packages/db` — PostgreSQL + Kysely + Goose migrations. See [packages/db/AGENTS.md](packages/db/AGENTS.md).
- `packages/auth` — Better-auth (passkeys + OTP)
- `packages/ai` — OpenRouter integration
- `justfile` and `just/*.just` — the repository command interface and its domain modules

## Commands

Use `just` for `setup`, `check`, and `db`; use `pnpm` for dev/lint/format/typecheck/build/test. Scope any pnpm task with `--filter=@hominem/<package>...`. Package scripts are internal Turbo primitives. `scripts/command` is a Bash command router invoked through `just`; use the `justfile` recipes as the public command interface.

```bash
pnpm --filter @hominem/api dev
pnpm test --filter=@hominem/api...
pnpm test --filter=@hominem/omiro...
pnpm format
just db backup
just db migrate
```

## Code style

- Linter: **oxlint** — `typescript/no-explicit-any` is an **error**, not a warning
- Formatter: **oxfmt** — single quotes, imports sorted ascending case-insensitively
- Run `pnpm format` to apply formatting before any edit is considered done
- If a function only calls a function use `() => <function name>(<args>)` style instead of unnecessary curly braces

## Git conventions

- Branch naming: `feature/<name>`
- PR merge: squash commit
- Every commit must follow the Conventional Commits standard. Load the globally installed `conventional-commit` skill before staging, committing, or pushing, and follow its workflow exactly.

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

## Performance

### Build / CI

- The `.github/actions/setup-pnpm-workspace/action.yml` caches turbo's local `.turbo/cache` directory via `actions/cache`, shared across all validate workflows on a branch — this is what stops every workflow from redundantly rebuilding the same core packages.
- `assumeChangesOnlyAffectDirectDependencies` is set in `tsconfig.base.json` for tsserver editor responsiveness in this project-reference graph (ignored by `tsc`/CI, editor-only). Anything that doesn't go through the shared `tsconfig.profiles/*` chain — like `apps/omiro`, which extends `expo/tsconfig.base` directly — needs the same flag set explicitly in its own `tsconfig.json`.
- `turbo.json`'s `typecheck` task `dependsOn: ["^build"]` — a package's composite dependencies get built (and turbo-cached) before it typechecks, so referenced projects have real declaration output to resolve against.

## Monorepo

- This root file is the primary agent instruction authority for the repository. Nested `AGENTS.md` files in [apps/omiro/](apps/omiro/AGENTS.md), [services/api/](services/api/AGENTS.md), and [packages/db/](packages/db/AGENTS.md) add directory-scoped detail for agents working in those trees; they must not duplicate or contradict these root rules.
- The work tracker owns temporary execution.

## Directory-scoped agent instructions

- [apps/omiro/AGENTS.md](apps/omiro/AGENTS.md) — Expo/EAS, navigation, mobile commands, Maestro/simulator evidence.
- [services/api/AGENTS.md](services/api/AGENTS.md) — Hono/BullMQ implementation rules, production authentication.
- [packages/db/AGENTS.md](packages/db/AGENTS.md) — migrations, generated types, repository boundary.
