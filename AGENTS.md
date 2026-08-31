## Rules

- Follow YAGNI (You Aren't Gonna Need It) principle and one-liner solutions whenever possible.
- Agents may commit code, but every commit must follow the Conventional Commits standard. Load the globally installed `conventional-commit` skill before staging, committing, or pushing.
- `apps/omiro` should only support Apple devices. Do not add fallbacks for other platforms such as Android.
- Never start long-running services (Expo/Metro, `pnpm dev`, the API, workers, databases, Docker containers, etc.) on your own. The user starts services for you. If a service is needed and not running, say so and ask the user to start it.
- **After any `packages/db` schema/migration change, run it yourself**: `just db migrate` (and `just db migrate test` if a test DB is running) then `just db codegen`, against the already-running local dev/test databases — do not leave this as a follow-up for the user. This is a one-shot command against an already-running database, not starting a new service, so it is not covered by the rule above. See [packages/db/AGENTS.md](packages/db/AGENTS.md).
- **Evidence**: A change is not complete until it meets that standard. Validation and evidence standards are documented in [docs/evidence.md](docs/evidence.md); run the `hominem-evidence` skill's checklist before reporting a change complete.
- **Web auth**: Career and Finance redirect unauthenticated browsers to the API hosted login. Browser traffic uses the public API, while server auth/data calls require the private API URL (Railway-internal in production). Development and production use the same cookie mechanism with different env values. See [docs/authentication.md](docs/authentication.md). After changing auth config or deployment topology, run the `hominem-auth-production-verify` skill.
- **Runbook skills**: `.agents/skills/` holds operational runbooks alongside app skills — `hominem-evidence`, `hominem-auth-production-verify`, `hominem-observability`, `hominem-dev-loop`, and `chatgpt-plugin-submission` pair with their `docs/*.md` decision records; the doc holds the "why", the skill holds the "how".

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

Use `just` for its domain modules (`db`, `career`, `mcp`, `mobile`, `ui` — run `just --list` for the current set); use `pnpm` for dev/lint/format/typecheck/build/test and the full pre-push gate. Scope any pnpm task with `--filter=@hominem/<package>...`. Package scripts are internal Turbo primitives. `scripts/command` is a Bash command router invoked through `just`; use the `justfile` recipes as the public command interface.

The full pre-push validation gate is `pnpm run check` (lint → typecheck → build → test via turbo, with `DATABASE_URL`/`AUTH_E2E_SECRET` set) — there is no `just check` or `just setup` recipe.

```bash
pnpm --filter @hominem/api dev
pnpm test --filter=@hominem/api...
pnpm test --filter=@hominem/omiro...
pnpm format
pnpm run check
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

**Never add a `workspace:*` dependency for a type-only import.** If you only `import type { X } from '@hominem/y'`, do not list `@hominem/y` in `package.json`. pnpm/turbo build their task graph from `package.json` edges with no idea an import is type-only — a single `import type` turned into a real dependency once dragged another package's entire build/test/lint/typecheck into every consumer's CI scope. Instead, add a `paths` alias directly in your own `tsconfig.json` pointing at the emitted declaration, never at source (see `docs/type-system.md` D1/D3 — resolving another package's source instead of its `.d.ts` is exactly the failure class that document exists to eliminate):

```json
"paths": { "@hominem/api/types": ["../../services/api/build/rpc/app.d.ts"] }
```

Keep it in sync with whatever `services/api/package.json`'s `exports` map says that subpath resolves to. `packages/rpc`, `apps/career`, `apps/omiro`, `apps/finance`, and `apps/web` all do this for `@hominem/api` — copy the pattern.

**New library package (something other packages depend on at runtime):**

1. `tsconfig.json`: `rootDir: "src"`, `outDir: "./build"`, `tsBuildInfoFile: "./.cache/tsconfig.tsbuildinfo"` — always package-local, never a shared cross-package `.cache/` path. Turbo can't safely cache outputs that escape a package's own directory.
2. Add a `"references"` array mirroring your real `package.json` dependencies exactly (only other composite library packages — see below).
3. Add a `"build": "tsc -p tsconfig.json"` script if you don't have one — required for your `references` (and anything referencing _you_) to resolve real declaration output instead of erroring with "Output file has not been built from source file" during `tsc --noEmit`.
4. Register yourself in the root `tsconfig.json`'s `references` array — but only if `outDir` is actually set. A referenced project with no `outDir` and `tsc -b` run from root will ignore `noEmit` and write generated `.js`/`.d.ts` straight into your `src/` tree (this happened while wiring this up — `packages/rpc` and `services/api` are deliberately excluded from the root graph for exactly this reason, since they're type-inference boundary packages, see below).

**Package that infers types across other packages (Hono `typeof app` RPC pattern, like `services/api`):** do NOT wire it into the composite `references` graph even if its dependencies are composite, and do not add a `references` entry to it at all — not even a single one to an otherwise-safe package. TS's "portable type" check (`TS2883`) refuses to infer an exported type like `AppType` across a real composite project boundary without an explicit annotation, which defeats Hono's RPC type-inference pattern. A bare `references` entry (package itself still `composite: false`) does _not_ trigger TS2883 today — verified empirically for `services/api` → `packages/chat` (full `tsc --noEmit` clean) — but the zero-references rule exists to hold as the `AppType` contract evolves, not just for today's shape, so keep resolving every dependency via plain source/paths (`composite: false`, no `references`) regardless. `services/api/tsconfig.json` follows this, and so does `packages/rpc/tsconfig.json` — it carried a `references: [{ path: "../chat" }]` entry from 2026-08-25 until this was reconciled: dropped in favor of a `paths` override straight to `packages/chat/build/*.d.ts`, the same pattern `services/api` uses. See `docs/type-performance.md` for the full investigation and `docs/type-system.md` for why declaration-contract resolution exists at all.

**New deployable app or service:**

1. `Dockerfile`, if it deploys via Railway/Docker: follow `services/api/Dockerfile` / `apps/career/Dockerfile` — `COPY` only `packages`, `services/api` (if you need its types), and your own app directory, never `COPY . .`, then `pnpm install --frozen-lockfile --filter @hominem/<name>...` (scoped install) before building. This keeps build time and context size flat as unrelated apps get added to the monorepo.
2. `.github/workflows/validate-<name>.yml`: model it on `validate-career.yml`. Set every env var your app _and its transitive dependencies_ actually require in the job's `env:` block with fake test values — including ones you don't obviously need yourself (e.g. `DATABASE_URL` if you depend on `@hominem/db`, `BETTER_AUTH_SECRET` if anything in your dependency chain imports `services/api` for real). Use `./.github/actions/setup-pnpm-workspace` for setup — it caches both the pnpm store and turbo's local cache directory (`.turbo/cache`), shared across all `validate-*.yml` workflows, so your new workflow reuses whatever core packages an earlier workflow already built/tested on this branch instead of rebuilding them from scratch. This is the main lever keeping CI time from growing linearly with app count — see "CI and build performance" below.
3. `deploy-<name>.yml`, if it deploys: trigger on `workflow_run: { workflows: [validate-<name>] }`. The workflow **name** (the `name:` field, not the filename) must match exactly — renaming a `validate-*.yml` workflow silently breaks its deploy trigger with no error.
4. A new deployable app's CI workflow must set every env var required by its own code _and_ its transitive `@hominem/*` dependencies — missing one silently breaks CI with an `EnvValidationError`, not an obviously-related error message.

## Performance

### Build / CI

- The `.github/actions/setup-pnpm-workspace/action.yml` caches turbo's local `.turbo/cache` directory via `actions/cache`, shared across all validate workflows on a branch — this is what stops every workflow from redundantly rebuilding the same core packages.
- `assumeChangesOnlyAffectDirectDependencies` is set in `tsconfig.base.json` for tsserver editor responsiveness in this project-reference graph (ignored by `tsc`/CI, editor-only). Anything that doesn't go through the shared `tsconfig.profiles/*` chain — like `apps/omiro`, which extends `expo/tsconfig.base` directly — needs the same flag set explicitly in its own `tsconfig.json`. A targeted incremental-recheck benchmark did not reproduce a measurable benefit from this flag (see `docs/type-performance.md`); kept anyway since there's no evidence either way to justify reversing a documented, deliberate tradeoff.
- `turbo.json`'s `typecheck` task `dependsOn: ["^build"]` — a package's composite dependencies get built (and turbo-cached) before it typechecks, so referenced projects have real declaration output to resolve against.

### TypeScript type-checking

Full details, methodology, and numbers: `docs/type-performance.md`. Headline findings, so they don't get silently re-litigated:

- **Consumers with a `references` entry get tsserver's live project-reference source redirect for free**, independent of `build/*.d.ts` freshness — verified even from a completely clean clone. `disableReferencedProjectLoad`/`disableSolutionSearching` (already set) give a real, reproducible ~2.35x speedup on cross-project "Find All References."
- **`pnpm-workspace.yaml`'s `injectWorkspacePackages: true` can silently make TS check real (slow) source instead of a package's `build/*.d.ts`.** It hard-copies a workspace package into a peer-isolated `.pnpm` virtual-store variant wherever a react-peer-dependent package needs one, frozen at install time before `build/` exists — so an internal cross-package import inside that copy 404s on the `types` export condition and falls through to raw `src/*.ts`. Fix: a `paths` override pinning the import straight to `build/*.d.ts` — but put it in the type-check-only config (e.g. `tsconfig.emit.json`), never in a `tsconfig.json` a bundler also reads for real runtime resolution (rolldown needs the exports-map runtime condition, not a types-only file — this broke `services/api`'s build once already). A `paths` target that doesn't exist on disk falls through to normal resolution rather than hard-failing, so this is safe on a fresh checkout with no `build/` output yet. **This trap re-appears at every consumer of an emitted `.d.ts` that preserves `import("pkg").Type` references literally instead of inlining them** — `services/api/build/rpc/app.d.ts` does exactly that for `@hominem/career-services`/`@hominem/ai`/`@hominem/db`/`@hominem/finance-services`, so fixing `services/api`'s own config wasn't enough; the same override had to be duplicated into `packages/rpc`, `apps/web`, `apps/omiro`, and `apps/finance`. This is the largest measured win in the investigation: tsserver `open` time (the number that governs how the editor/`dev:types` actually feels) dropped 57% for `apps/web` (14.3s → 6.2s) and 31% for `apps/omiro` (7.0s → 4.9s).
- **Splitting a large Hono route chain into `.route()`-composed sub-routers does not reduce total typecheck time.** Tested directly (`services/api/src/rpc/routes/career.ts`, 48 chained calls → 11 sub-routers): no measurable difference over a rigorous 3-run A/B. The `.route()` composition/merge layer is cheap (~3% of a full `services/api` typecheck) — it was never the bottleneck. Splitting is still worth doing for file-size/organization reasons; don't expect a compile-speed win from it.
- **An unannotated callback passed to a generic higher-order function can be one of the most expensive single expressions in a file** (TS infers its full return shape bottom-up before checking it against the HOF's signature) — an explicit return-type annotation on the callback fixes this. Confirmed real wins on `upgradeWebSocket((c): WSEvents<T> => ...)` and `runInTransaction(async (trx): Promise<T> => ...)`. This does **not** apply when the expensive part is baked into a third-party library's own type declaration (e.g. a plugin factory typed as `ReturnType<typeof someGenericThing>`, or overload resolution between two libraries) — no caller-side annotation reduces that; verified by testing one and finding no improvement.

## Monorepo

- This root file is the primary agent instruction authority for the repository. Nested `AGENTS.md` files in [apps/omiro/](apps/omiro/AGENTS.md), [services/api/](services/api/AGENTS.md), and [packages/db/](packages/db/AGENTS.md) add directory-scoped detail for agents working in those trees; they must not duplicate or contradict these root rules.
- The work tracker owns temporary execution.

## Directory-scoped agent instructions

- [apps/omiro/AGENTS.md](apps/omiro/AGENTS.md) — Expo/EAS, navigation, mobile commands, Maestro/simulator evidence.
- [services/api/AGENTS.md](services/api/AGENTS.md) — Hono/BullMQ implementation rules, production authentication.
- [packages/db/AGENTS.md](packages/db/AGENTS.md) — migrations, generated types, repository boundary.
