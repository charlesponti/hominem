## Rules

- Follow YAGNI (You Aren't Gonna Need It) principle and one-liner solutions whenever possible.
- Agents may commit code, but every commit must follow the Conventional Commits standard. Load the globally installed `conventional-commit` skill before staging, committing, or pushing.
- `apps/omiro` should only support Apple devices. Do not add fallbacks for other platforms such as Android.
- Agents may start local dev services (Expo/Metro, `pnpm dev`, the API, workers, databases, Docker containers, etc.) when needed to test or verify a change. `api`/`web`/`career`/`finance` run through the [portless](https://github.com/vercel-labs/portless) proxy under `pnpm dev` (each gets a stable `https://<name>.lvh.me:4200` URL instead of a fixed port, which is what lets the same app run from multiple worktrees at once without a port collision — `lvh.me`, not `.localhost`, because cross-subdomain login cookies require a real domain), and a fresh worktree needs its git-ignored `.env` files bootstrapped first. See the `hominem-development` skill for that setup and how to run services — read it before telling the user a service "won't start" in a new worktree.
- **`packages/db` work (schema/migration changes, or any repository method) loads the `hominem-database` skill first.** It covers migration/codegen mechanics, the repository/DTO boundary, and the ownership-scoped-mutation convention. After any schema/migration change, run it yourself: `just db migrate` (and `just db migrate test` if a test DB is running) then `just db codegen`, against the already-running local dev/test databases — do not leave this as a follow-up for the user.
- **Evidence**: A change is not complete until it meets that standard. Validation and evidence standards are documented in [docs/evidence.md](docs/evidence.md); run the `hominem-evidence` skill's checklist before reporting a change complete.
- **Web auth**: Career and Finance redirect unauthenticated browsers to the API hosted login. Browser traffic uses the public API, while server auth/data calls require the private API URL (Railway-internal in production). Development and production use the same cookie mechanism with different env values. See [docs/authentication.md](docs/authentication.md). After changing auth config or deployment topology, run the `hominem-auth-production-verify` skill.
- **Runbook skills**: `.agents/skills/` holds operational runbooks alongside app skills. A runbook skill that has a companion decision doc names that doc inside its own `SKILL.md` — the doc holds the "why", the skill holds the "how". Look there rather than expecting a list of pairings here; a list like that only goes stale.
- After merging dependency or catalog updates, run `pnpm install --frozen-lockfile` and restart any SSR app before browser verification. A stale running process can load mismatched React versions and fail during SSR even when the installed workspace is correct.
- For local smoke checks, distinguish fixed-port services (`http://localhost:4040` / `:4445`) from Portless services (`https://api.lvh.me:4200` / `https://web.lvh.me:4200`). Do not treat an unauthenticated Web `302` to hosted login as a service failure.

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
- `packages/db` — PostgreSQL + Kysely + Goose migrations. See the `hominem-database` skill.
- `packages/auth` — Better-auth (passkeys + OTP)
- `packages/ai` — OpenRouter integration
- `justfile` and `just/*.just` — the repository command interface and its domain modules

## Commands

Use `just` for its domain modules (`db`, `career`, `mcp`, `mobile`, `ui` — run `just --list` for the current set); use `pnpm` for dev/lint/format/typecheck/build/test and the full pre-push gate. Scope any pnpm task with `--filter=@hominem/<package>...`. Package scripts are internal Turbo primitives. `scripts/command` is a Bash command router invoked through `just`; use the `justfile` recipes as the public command interface.

- `pnpm run check`: Runs full pre-push validation (lint → typecheck → build → test via turbo, with `DATABASE_URL` set)

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
- **Never hand-write a `packages/rpc/src/types/*.ts` output type and then cast a hook's `response.json()` to it with `as Promise<X>`.** Derive the type from the live route instead, with `InferResponseType`/`InferRequestType` from `hono/client` against `HonoClient` (`packages/rpc/src/core/api-client.ts`), e.g. `type _FooEndpoint = HonoClient['api']['foo']['$get']; export type FooOutput = InferResponseType<_FooEndpoint, 200>;` — see `packages/rpc/src/types/chat.types.ts` or `tasks.types.ts` for the pattern. This keeps the type wired to the actual route (renames/shape changes fail typecheck instead of silently drifting) and needs no cast at the call site, since `response.json()` is already correctly typed. A hand-written duplicate type is always the wrong fix here, no matter how closely it mirrors the zod schema.
- **After adding or changing a `services/api` route or schema, run `pnpm --filter @hominem/api build` — not just `typecheck` — before touching `apps/web`/`packages/rpc`.** `packages/rpc`'s `HonoClient`/`AppType` resolve against the committed `services/api/build/rpc/app.d.ts`, not live source, so `services/api` typechecking clean tells you nothing about whether the frontend can see your new route yet. Skipping this step surfaces as a confusing "property doesn't exist on client" error in the frontend that has nothing to do with the frontend code.

## Git conventions

- Branch naming: `feature/<name>`
- PR merge: squash commit
- Every commit must follow the Conventional Commits standard. Load the globally installed `conventional-commit` skill before staging, committing, or pushing, and follow its workflow exactly.

## Documentation

- The root `README.md` is the front door to Hominem documentation ([docs/](docs/)).
- Durable product, architecture, design, security, and operational decisions in the appropriate numbered documentation under the root `docs/` directory.
  - Do not create `docs/` directories inside apps, packages, or services.
- Keep package READMEs to setup and local entrypoint information; link to the root documentation for governing decisions.
- Write current rules and invariants, not incident narratives or temporary task lists. Git history preserves history; the work tracker owns temporary execution.
- `docs/incidents/` is the one sanctioned exception to that rule: it's where a postmortem's play-by-play actually belongs. But a postmortem is not where a durable rule gets to live — if an incident teaches you something worth keeping, fold it into the relevant subject doc or an ADR in the same change, then let the incident writeup just be the record of what happened.
- Update the relevant documentation in the same change when a durable implementation decision changes.

## Adding a new package, app, or service

**Never add a `workspace:*` dependency for a type-only import.** If you only `import type { X } from '@hominem/y'`, do not list `@hominem/y` in `package.json`. pnpm/turbo build their task graph from `package.json` edges with no idea an import is type-only — a single `import type` turned into a real dependency once dragged another package's entire build/test/lint/typecheck into every consumer's CI scope. Instead, add a `paths` alias directly in your own `tsconfig.json` pointing at the emitted declaration, never at source (see `docs/type-system.md`'s Rules section — resolving another package's source instead of its `.d.ts` is exactly the failure class that document exists to eliminate):

```json
"paths": { 
    "@hominem/api/types": [
        "../../services/api/build/rpc/app.d.ts"
    ] 
}
```

Keep it in sync with whatever `services/api/package.json`'s `exports` map says that subpath resolves to. `packages/rpc`, `apps/career`, `apps/omiro`, `apps/finance`, and `apps/web` all do this for `@hominem/api` — copy the pattern.

**New package used by other packages at runtime:**

1. `tsconfig.json`: `rootDir: "src"`, `outDir: "./build"`, `tsBuildInfoFile: "./.cache/tsconfig.tsbuildinfo"` — always package-local, never a shared cross-package `.cache/` path. Turbo can't safely cache outputs that escape a package's own directory.
2. Add a `"references"` array mirroring your real `package.json` dependencies exactly (only other composite library packages — see below).
3. Add a `"build": "tsc -p tsconfig.json"` script if you don't have one — required for your `references` (and anything referencing _you_) to resolve real declaration output instead of erroring with "Output file has not been built from source file" during `tsc --noEmit`.
4. Register yourself in the root `tsconfig.json`'s `references` array — but only if `outDir` is actually set. A referenced project with no `outDir` and `tsc -b` run from root will ignore `noEmit` and write generated `.js`/`.d.ts` straight into your `src/` tree (this happened while wiring this up — `packages/rpc` and `services/api` are deliberately excluded from the root graph for exactly this reason, since they're type-inference boundary packages, see below).

**Package that infers types across other packages (Hono `typeof app` RPC pattern, like `services/api`):** 
- DO NOT wire it into the composite `references` graph even if its dependencies are composite
- DO NOT add a `references` entry to the package at all — not even a single one to an otherwise-safe package. TS's "portable type" check (`TS2883`) refuses to infer an exported type like `AppType` across a real composite project boundary without an explicit annotation, which defeats Hono's RPC type-inference pattern. A bare `references` entry (package itself still `composite: false`) does _not_ trigger TS2883 today — verified empirically for `services/api` → `packages/chat` (full `tsc --noEmit` clean) — but the zero-references rule exists to hold as the `AppType` contract evolves, not just for today's shape, so keep resolving every dependency via plain source/paths (`composite: false`, no `references`) regardless. `services/api/tsconfig.json` follows this, and so does `packages/rpc/tsconfig.json` — it carried a `references: [{ path: "../chat" }]` entry from 2026-08-25 until this was reconciled: dropped in favor of a `paths` override straight to `packages/chat/build/*.d.ts`, the same pattern `services/api` uses. See `docs/type-system.md` for the full investigation and why declaration-contract resolution exists at all.

**New deployable app or service:**

1. `Dockerfile`, if it deploys via Railway/Docker: follow `services/api/Dockerfile` / `apps/career/Dockerfile` — `COPY` only `packages`, `services/api` (if you need its types), and your own app directory, never `COPY . .`, then `pnpm install --frozen-lockfile --filter @hominem/<name>...` (scoped install) before building. This keeps build time and context size flat as unrelated apps get added to the monorepo.
2. `.github/workflows/validate-<name>.yml`: model it on `validate-career.yml`. Set every env var your app _and its transitive dependencies_ actually require in the job's `env:` block with fake test values — including ones you don't obviously need yourself (e.g. `DATABASE_URL` if you depend on `@hominem/db`, `BETTER_AUTH_SECRET` if anything in your dependency chain imports `services/api` for real). Use `./.github/actions/setup-pnpm-workspace` for setup — it caches both the pnpm store and turbo's local cache directory (`.turbo/cache`), shared across all `validate-*.yml` workflows, so your new workflow reuses whatever core packages an earlier workflow already built/tested on this branch instead of rebuilding them from scratch. This is the main lever keeping CI time from growing linearly with app count — see "CI and build performance" below.
3. `deploy-<name>.yml`, if it deploys: trigger on `workflow_run: { workflows: [validate-<name>] }`. The workflow **name** (the `name:` field, not the filename) must match exactly — renaming a `validate-*.yml` workflow silently breaks its deploy trigger with no error.
4. A new deployable app's CI workflow must set every env var required by its own code _and_ its transitive `@hominem/*` dependencies — missing one silently breaks CI with an `EnvValidationError`, not an obviously-related error message.

## Performance

### Build / CI

- The `.github/actions/setup-pnpm-workspace/action.yml` caches turbo's local `.turbo/cache` directory via `actions/cache`, shared across all validate workflows on a branch — this is what stops every workflow from redundantly rebuilding the same core packages.
- `assumeChangesOnlyAffectDirectDependencies` is set in `tsconfig.base.json` for tsserver editor responsiveness in this project-reference graph (ignored by `tsc`/CI, editor-only). Anything that doesn't go through the shared `tsconfig.profiles/*` chain — like `apps/omiro`, which extends `expo/tsconfig.base` directly — needs the same flag set explicitly in its own `tsconfig.json`. A targeted incremental-recheck benchmark did not reproduce a measurable benefit from this flag (see `docs/type-system.md`); kept anyway since there's no evidence either way to justify reversing a documented, deliberate tradeoff.
- `turbo.json`'s `typecheck` task `dependsOn: ["^build"]` — a package's composite dependencies get built (and turbo-cached) before it typechecks, so referenced projects have real declaration output to resolve against.

### TypeScript type-checking
Documentation on type-checking in this monorepo can be found in `docs/type-system.md`.

## Monorepo

- This root file is the primary agent instruction authority for the repository. Nested `AGENTS.md` files in [apps/omiro/](apps/omiro/AGENTS.md) and [services/api/](services/api/AGENTS.md) add directory-scoped detail for agents working in those trees; they must not duplicate or contradict these root rules. `packages/db` has no nested `AGENTS.md` — its conventions live in the `hominem-database` skill instead, since that skill is already the required entry point for any schema/migration/repository work there (see the `packages/db` rule above).
- The work tracker owns temporary execution.
- **Execute task plans by dependency order, not by filename.** Use the Markdown files in `docs/tasks/` as the task source of truth; do not require a separate task index. A task's own `status` and `depends_on` frontmatter is the only ordering signal — pick any task that isn't `Implemented` and whose `depends_on` are all `Implemented`. If several qualify at once, they're genuinely independent; work one all the way through before starting another rather than interleaving. Treat a task blocked by an unfinished dependency as locked even when its code looks easy or useful as groundwork. Do not mark a task `Implemented` until its own observable evidence and all required validation are complete. If a task is `Blocked`, report the blocker and stop rather than working around it; only proceed past it after the user explicitly changes the plan. When earlier implementation already exists, reconcile its task record and evidence first, then resume with the next eligible task. A task's `docs/tasks/artifacts/` evidence is scratch, not durable record — it's gitignored, and once its parent task is `Implemented` there's no reason to keep it around.

## Directory-scoped agent instructions

- [apps/omiro/AGENTS.md](apps/omiro/AGENTS.md) — Expo/EAS, navigation, mobile commands, Maestro/simulator evidence.
- [services/api/AGENTS.md](services/api/AGENTS.md) — Hono/BullMQ implementation rules, production authentication.
- `packages/db` — migrations, generated types, repository boundary. Covered by the `hominem-database` skill, not a nested `AGENTS.md`.
