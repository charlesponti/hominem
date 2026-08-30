# Type System

The monorepo resolves TypeScript types through **compiled declaration contracts**, not source files. This document records why the system moved to contracts, the verified diagnosis of the failure class it replaces, the target model, the decisions that govern it, the Phase 0 evidence, and the remaining tasks.

For everything about _how fast_ type-checking is within this model — the live project-reference redirect, the `pnpm` injected-package staleness trap, which speed fixes actually measured out and which didn't, `services/api`'s zero-`references` invariant — see [`docs/type-performance.md`](type-performance.md). This document is the "why declarations, not source" record; that one is the "we tried N things, here's what was real" record.

## Why this exists

Two incidents in August 2026 exposed the cost of source-resolved typing:

1. **The phantom `NoteKind` error.** Adding a named export to `packages/db`'s barrel kept failing `tsc` in `services/api` with "no exported member" — the cause was a stale `tsconfig.tsbuildinfo` incremental cache serving pre-change dependency state. Three caches had to be deleted by hand to unstick a real type change. That failure class is architectural, not a one-off.
2. **Declarations in the source tree.** A scratch declaration-emit run materialized 167 `.d.ts` files inside `services/api/src/`, and a cleanup glob briefly deleted the tracked, hand-written `services/api/src/types/hono.d.ts`. Generated declarations have no business in `src/`.

Both failures trace to one root cause: **the repo resolves dependency _source_, never dependency _declarations_**.

## Current state (verified audit)

- Every `@hominem/*` `package.json` `exports` map points `types` at `./src/*.ts`. Verified: `packages/ai` (composite, `references: [db]`) resolves `@hominem/db` to `packages/db/src/index.ts` — source — not its compiled `.d.ts`.
- Consumers therefore recompile full dependency source trees into their own programs. `services/api`'s typecheck compiles all of `db`, `ai`, `telemetry`… source; `apps/finance` pulls `services/api` source in via path alias _and_ every package behind it. Cold typechecks are O(whole source graph).
- The composite `references` graph builds declaration outputs into `packages/*/build/`, but nobody consumes them — the machinery is decorative for resolution.
- `incremental: true` + `noEmit` + source-resolved deps = the stale-`tsbuildinfo` failure class. `skipLibCheck` and `assumeChangesOnlyAffectDirectDependencies` paper over but do not fix it.
- `services/api` and `packages/rpc` are deliberately **non-composite** boundary projects (see below), and apps alias `@hominem/api/*` to api _source_ files through tsconfig `paths`.

## Target model: compiled type contracts

Consumers should resolve small, deterministic `.d.ts` outputs — never another package's source — so their programs are their own source plus declarations, caches fingerprint reliably, and a type change ripples only across declaration boundaries.

Three moves:

1. **Composite packages: `exports.types` → `./build/index.d.ts`** (subpath patterns likewise → `build/*.d.ts`). The runtime `default` condition stays `./src/index.ts` — bundlers/tsx/rolldown are untouched; this is a types-only change.
2. **`services/api` and `packages/rpc`: declaration-emitting but non-composite.** Each gets a dedicated emit project (`tsconfig.emit.json`) running `emitDeclarationOnly` with a **hardcoded `outDir: build`**. Emitting without `composite` sidesteps the TS2883 portable-type limitation, so Hono's `typeof app` RPC pattern survives with no annotation ceremony.
3. **Retarget the `paths` aliases** (`apps/omiro`, `apps/career`, `apps/finance`, `packages/rpc`) from api source files to the emitted `.d.ts`. Their programs stop compiling api source entirely.

Turbo's existing `typecheck`/`test` → `^build` ordering already guarantees declarations are fresh before consumers typecheck; CI and dev-turbo get correct invalidation for free.

## Decisions

- **D1 — Types come from `build/`, runtime from `src/`.** `exports` `types` conditions move to compiled declarations; `default` never changes. A package whose runtime is bundle-built (`services/api` via rolldown, apps via vite/expo) keeps deploying from source or bundle — declaration emit must never alter runtime paths.
- **D2 — `services/api` + `packages/rpc` emit declarations without being composite.** TS2883 only constrains composite `references`; non-composite `emitDeclarationOnly` produces self-contained `.d.ts` (proven: `AppType = typeof rpcApp` inlines the entire Hono graph, one relative import total). This preserves the RPC type-inference pattern the codebase depends on.
- **D3 — Path aliases target declarations.** The type-only alias pattern (`@hominem/api/types` → `app.d.ts`) stays; it points at built output instead of source.
- **D4 — Generated declarations live only in ignored output dirs; hand-written `.d.ts` stay versioned.** No blanket `*.d.ts` gitignore — six hand-written declaration files (`env.d.ts` × 3, `hono.d.ts`, `packages/db/typed/index.d.ts`, `services/ori/types/runtime.d.ts`) are source and must be tracked. The existing ignores (`build`, `dist`, `.cache`) already cover all compiler output.
- **D5 — Editors need rebuilt declarations.** The honest tradeoff of declarations-based resolution: a dependent's editor sees a dependency's change only after the dependency rebuilds. A watch-build recipe (`turbo watch build` scoped to changed packages) ships with the exports flip, not after.

## Constraints (why not a simpler setup)

- **TS2883** forbids inferring exported types (Hono's `typeof app` `AppType`) across composite project boundaries without explicit annotations that defeat the RPC pattern. Hence `services/api` and `packages/rpc` stay out of the composite graph — but they can still emit declarations.
- **Runtime is source/bundle based.** Dev runs `tsx watch` from `src`; production bundles with rolldown. Declaration emit is a types-only artifact, never a runtime dependency.
- **`assumeChangesOnlyAffectDirectDependencies` stays** (editor-only responsiveness flag), and the standard caveat — restart tsserver when a change ripples beyond one hop — continues to apply.

## Evidence (Phase 0 spike)

A scratch `emitDeclarationOnly` build of `services/api` produced 176 self-contained `.d.ts`. Consumers pointed at the emitted declarations, cold-cached:

| Consumer       | Alias target                 | Typecheck | Program content                                                                        |
| -------------- | ---------------------------- | --------- | -------------------------------------------------------------------------------------- |
| `packages/rpc` | emitted `app.d.ts`           | ✅ exit 0 | Hono client-inference chain (`client.api.notes[':id'].$get`) survives declaration emit |
| `apps/omiro`   | emitted `app.d.ts`           | ✅ exit 0 | **0 `services/api/src` files in program**; cold 9.1s (source) → 6.4s (declarations)    |
| `apps/career`  | emitted `routes/career.d.ts` | ✅ exit 0 | per-route alias pattern works too                                                      |

`apps/finance` uses the same `app.ts` alias as rpc/omiro and is covered by that proof.

## Guards

- A dedicated `services/api/tsconfig.emit.json` with a **hardcoded `outDir: build`** — declaration emit is never configured via CLI flags or a `rootDir` dance.
- A guard script (modeled on `just db lint`) that **fails if any `*.d.ts` appears under a package's `src/`** — the stray-declarations incident becomes a loud CI error, not a quiet git-status surprise.
- `pnpm run check` (or the per-package typecheck gates) is the evidence standard for every phase below.

## Tasks

Temporary execution belongs to the work tracker; promote these to `docs/tasks/` tickets when picked up. Each lands with `pnpm run check` green as evidence.

### Task 1 — Composite packages flip `exports.types` to `build/` — COMPLETE (2026-08-27)

- **Objective:** composite packages serve declarations, not source.
- **Done:** all 11 composite packages flipped (`db`, `env`, `telemetry`, `utils` then `ai`, `chat`, `queues`, `storage`, `career`, `finance`, `services`; `auth` was already flipped). `career`/`finance` string-shorthand exports were converted to structured `types`/`default` form.
- **Evidence:** `--traceResolution` shows composite (`packages/ai`), source (`services/api`), and app (`apps/career`) consumers resolving `build/*.d.ts` (incl. subpaths `env/base`, `env/api`, `env/brand`, `telemetry/node`); runtime smoke test from `services/api` confirms `default` still loads `src`; full `pnpm run check` green (lint 17, typecheck 32, build 16, test 23). One transient gate failure was a load-induced 15s timeout in `auth.e2e-login.test.ts`; isolated rerun passed 220/220 and the final gate run exited 0.
- **Steps:** flip `exports` `types` conditions (`"."` and subpath patterns) to `./build/*.d.ts` for the core packages first (`db`, `env`, `telemetry`, `utils`), run the full gate, then the remaining composite packages, gate again.
- **Acceptance:** consumers resolve `packages/*/build/*.d.ts` (verify via `--traceResolution` on one composite and one app consumer); no runtime behavior change; `pnpm run check` green after each batch.

### Task 2 — `services/api` + `packages/rpc` emit declarations; aliases retarget — COMPLETE (2026-08-27)

- **Objective:** api/rpc expose compiled contracts; consumers stop compiling api source.
- **Done:** `services/api/tsconfig.emit.json` and `packages/rpc/tsconfig.emit.json` (hardcoded `outDir: build`, `emitDeclarationOnly`, tests excluded); `build:types` chained into `services/api`'s `build`; `packages/rpc` gained a `build` script and its exports `types` flipped to `build/*.d.ts`; the `@hominem/api/*` path aliases in `apps/omiro`, `apps/career`, `apps/finance`, and `packages/rpc` now target the emitted declarations; `scripts/check-src-declarations.sh` fails on any untracked `.d.ts` under `src/` and runs first in `check:all`; `check:all` reordered to build before typecheck so consumer checks never race the api emit. **`apps/web` was missed in the original pass** — its `@hominem/api/types` alias still pointed at `services/api/src/rpc/app.ts` (source), reintroducing the exact failure class this task exists to eliminate; retargeted to `services/api/build/rpc/app.d.ts` and given a `references` array mirroring its `package.json` dependencies (matching the `apps/omiro`/`apps/career` convention), which it also lacked.
- **Evidence:** api emits 135 declarations (tests excluded), rpc 21; `--listFiles` shows **zero `services/api/src` and zero `packages/rpc/src` files** in the `omiro`, `career`, and `finance` programs (declarations exclusively); rpc/omiro/career/finance typecheck clean against the emitted `AppType`; full `pnpm run check` green (guard → lint 17 → build 17 → typecheck 33 → test 24). `apps/web` fix verified separately: `turbo typecheck --filter @hominem/web` and `--filter @hominem/finance` both pass clean after the retarget, and `scripts/check-src-declarations.sh` still reports no stray declarations.
- **Steps:** add `tsconfig.emit.json` (hardcoded `outDir: build`, `emitDeclarationOnly`) + `build:types` scripts; retarget `@hominem/api/*` path aliases in `apps/omiro`, `apps/career`, `apps/finance`, `packages/rpc` to the emitted declarations; add the `*.d.ts`-under-`src/` guard script; verify rpc/omiro/career/finance typechecks resolve declarations exclusively.
- **Acceptance:** zero `services/api/src` or `packages/rpc/src` files in consumer programs; `AppType` and client inference intact; guard script wired into the gate.

### Task 3 — Editor watch-builds and dev hygiene — COMPLETE (2026-08-27)

- **Objective:** tsserver always sees fresh declarations during development.
- **Done:** `scripts/watch-types.sh` runs three watchers (root `tsc -b` for the composite graph + `tsc -p tsconfig.emit.json` for `services/api` and `packages/rpc`); exposed as `just types watch` and as the persistent turbo task `dev:types`, wired into `pnpm dev` and the `dev:*` variants so it runs automatically in the background; documented in `docs/development.md` with the tsserver-restart caveat for ripples beyond one hop.
- **Evidence:** with the watcher running, appending a probe type to `packages/utils/src/text.ts` produced the updated `WatchTypesProbe` export in `packages/utils/build/text.d.ts` within seconds and `services/api` typecheck stayed clean; probe removed afterward and build state verified clean. Runtime (tsx, metro, vite) resolves `default` → src so the declaration rebuilds never touch the running apps.
- **Steps:** add a `just`/pnpm recipe running turbo watch builds for packages whose types changed; document the tsserver-restart caveat; confirm dev loop (tsx watch, metro) is unaffected by declaration-only changes.
- **Acceptance:** editing a package's types is reflected in dependents' editors within the watch rebuild time; documented in `docs/development.md`.
- **Note (2026-08-30):** the root `tsc -b --watch` leg was briefly removed on the theory that every consumer gets tsserver's live redirect and doesn't need it — true for consumers _with_ a `references` entry (`packages/db`, `packages/rpc`, `apps/web`, `apps/omiro`), false for `services/api`, which by design has none and resolves `packages/chat` and 8 other composite packages purely via `paths` to `build/*.d.ts`. Restored. See `docs/type-performance.md` for the full investigation.

### Task 4 — Remove the residual write-only cruft — COMPLETE (2026-08-27)

- **Objective:** no package writes declarations it doesn't ship.
- **Done:** audited every `tsc` invocation and tsconfig (package.json scripts, watch mode, orphan configs, CI). All 12 composite packages have `outDir: build`; api/rpc emits target `build`; `deepeval` and api `dev` configs are `noEmit`. Two flat-flagged configs resolve safe via extends (`auth/tsconfig.build.json` → outDir build; `services/api/tsconfig.dev.json` → inherited noEmit). The one true hazard, orphan `packages/services/ts-test-rel/tsconfig.json` (no noEmit/outDir/composite), got `noEmit: true`. CI: `_validate-app.yml` now runs `check:dts` first, builds **before** typechecking (consumer checks resolve api's emitted declarations, unreachable via package.json edges), and includes `@hominem/api` in the build filter.
- **Evidence:** `find` acceptance — no `.d.ts` outside `build/`/`.cache`/output dirs beyond the six tracked hand-written declarations; full `pnpm run check` green (guard → lint 17 → build 17 → typecheck 33 → test 24).
- **Steps:** audit for any remaining `tsc` invocation that could emit without an explicit `outDir` (the incident root cause); enforce the guard from Task 2 across all packages.
- **Acceptance:** `find . -name '*.d.ts' -not -path '*/build/*' -not -path '*/.cache/*'` (excluding the six tracked hand-written files) is empty after a full `pnpm run check`.
