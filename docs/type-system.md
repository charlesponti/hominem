# Type System

The monorepo resolves TypeScript types through **compiled declaration contracts**, not source files. This document is the whole story on that: why it moved to contracts, the model and the decisions that govern it, how fast it actually is, which speed fixes measured real and which didn't, and a correctness tradeoff we made on purpose. It used to be split across three files; it isn't anymore, because a reader chasing "why can't I add a `references` entry here" shouldn't have to hop between docs to get the full picture.

One rule held throughout the performance sections below: every number came from actually running the compiler with `--generateTrace`, or from driving a real `tsserver` session (the same protocol VS Code speaks) via the scripts in `scripts/`. Nothing here is "the docs say" or "this should help." A few fixes that sounded obviously right turned out to do nothing when measured — those are written up too, so nobody burns an afternoon re-discovering that.

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
- **D5 — Editors need rebuilt declarations.** The honest tradeoff of declarations-based resolution: a dependent's editor sees a dependency's change only after the dependency rebuilds. The root `pnpm dev:types` script runs the script-backed watcher: root `tsc -b --watch` for the composite graph, plus declaration-only watchers for `services/api` and `packages/rpc`. Turbo does not execute root package scripts, so runtime `pnpm dev` commands do not implicitly start it.

## Constraints (why not a simpler setup)

- **TS2883** forbids inferring exported types (Hono's `typeof app` `AppType`) across composite project boundaries without explicit annotations that defeat the RPC pattern. Hence `services/api` and `packages/rpc` stay out of the composite graph — but they can still emit declarations.
- **Runtime is source/bundle based.** Dev runs `tsx watch` from `src`; production bundles with rolldown. Declaration emit is a types-only artifact, never a runtime dependency.
- **`assumeChangesOnlyAffectDirectDependencies` stays** (editor-only responsiveness flag), and the standard caveat — restart tsserver when a change ripples beyond one hop — continues to apply. A targeted incremental-recheck benchmark (below) didn't reproduce a measurable benefit from this flag either way; it's kept as a deliberate tradeoff, not because it was reproven.

## Evidence (Phase 0 spike)

A scratch `emitDeclarationOnly` build of `services/api` produced 176 self-contained `.d.ts`. Consumers pointed at the emitted declarations, cold-cached:

| Consumer       | Alias target                 | Typecheck | Program content                                                                        |
| -------------- | ----------------------------- | --------- | --------------------------------------------------------------------------------------- |
| `packages/rpc` | emitted `app.d.ts`           | ✅ exit 0 | Hono client-inference chain (`client.api.notes[':id'].$get`) survives declaration emit |
| `apps/omiro`   | emitted `app.d.ts`           | ✅ exit 0 | **0 `services/api/src` files in program**; cold 9.1s (source) → 6.4s (declarations)    |
| `apps/career`  | emitted `routes/career.d.ts` | ✅ exit 0 | per-route alias pattern works too                                                      |

`apps/finance` uses the same `app.ts` alias as rpc/omiro and is covered by that proof. The four phases that landed this model — flipping composite exports to `build/`, api/rpc declaration-only emit with alias retargeting, the editor watch wiring, and removing residual write-only cruft — all shipped 2026-08-27; the detailed task-by-task record lives in git history, not here.

## How type-checking speed was actually measured

TypeScript has separate performance surfaces, so one number can't represent all of them: editor startup (a fresh `tsserver` opening a project), editor interaction (warm diagnostics/references/completion), compiler/build (a clean or cached `tsc`/Turbo CI run), and freshness (does a consumer see a new declaration or a stale one). Every finding below names which surface it's measuring.

| Script | What it answers |
| --- | --- |
| `scripts/lib/tsserver-client.mjs` | The shared client everything else is built on: spawns a real `tsserver` and speaks its actual protocol. |
| `scripts/bench-tsserver.mjs` | Timing (`open`/`geterr`/`references`) across every real consumer in the monorepo, plus cross-project "Find All References." `--label`, `--runs`, `--json`. |
| `scripts/bench-tsserver-minimal.mjs` | Smallest editor benchmark: cold project open, then warm diagnostics, for one real consumer. |
| `scripts/bench-incremental-recheck.mjs` | An already-warm tsserver session re-checking a downstream consumer after an upstream file changes — the one scenario `assumeChangesOnlyAffectDirectDependencies` could plausibly affect. |
| `scripts/check-live-types.mjs` / `scripts/check-live-types-rpc.mjs` | Correctness, not speed: edit a type without rebuilding, ask tsserver via `quickinfo` whether a consumer sees it live or stale. Always reverts its own edit. |
| `scripts/find-duplicate-shapes.mjs` | Walks every exported interface/object-type-alias under `packages/`, `services/`, `apps/` via the TS Compiler API and groups ones with an identical structural signature. |

All of these are read-only or self-reverting — safe to run against a live checkout any time.

## The live-redirect model

Worth knowing before the fixes below, since several lean on it: a consumer with a `references` entry to a composite package gets tsserver's live project-reference source redirect for free — and that redirect doesn't depend on the referenced package's `build/*.d.ts` being fresh at all. Verified directly via go-to-definition, even from a completely clean checkout with no build output anywhere. The exception is `services/api`: it deliberately has no `references` entries and resolves its composite dependencies through `paths` to `build/*.d.ts`, so the root `tsc -b --watch` leg must stay active. `scripts/watch-types.sh` separately watches the two non-composite declaration boundaries, `services/api` and `packages/rpc` — this is why the watcher stays a small script-backed adapter instead of a pure `turbo watch` graph; the required root `tsc -b --watch` project isn't a workspace package, so independent package watchers would change the project-reference behavior this document measures. Run `pnpm dev:types` alongside the relevant Turbo runtime dev task.

Two flags in the root `tsconfig.json` — `disableReferencedProjectLoad` and `disableSolutionSearching` — are tsserver-only (`tsc`/CI ignore them). Measured: a real, reproducible 2.35x speedup on cross-project "Find All References" (1518ms vs. 3574ms average, 4 runs each, rooted at a type used across `packages/chat` → `packages/db`/`packages/rpc`). This holds even though nothing literally `extends` the root `tsconfig.json` — tsserver's "solution search" auto-discovers sibling and ancestor tsconfigs on its own.

## Zero-references invariant for inference-boundary packages

`services/api` and `packages/rpc` both infer an exported type across their own module boundary — Hono's `typeof rpcApp` RPC pattern. TS2883 ("portable type") won't infer an exported type like `AppType` across a real **composite** project boundary without an explicit annotation, and adding that annotation would defeat the pattern entirely.

The specific, tested finding: **TS2883 fires because the package itself is `composite`, not because it merely has a bare `references` entry.** Confirmed by adding a `references: [{ path: "../../packages/chat" }]` entry with `composite: false` — both `tsc --noEmit` and `tsc -p tsconfig.emit.json` passed cleanly — and separately confirming `composite: true` does trigger TS2883, isolating which flag actually causes it.

That distinction was tried directly on `services/api`, then reverted: `services/api`'s rule is stricter than "avoid TS2883 today" — it's zero `references`, period, so the invariant holds as `AppType`'s shape evolves, not just for its shape today. A bare reference to one small, stable package passing today doesn't prove it'll still pass once `AppType` picks up something structurally different.

`packages/rpc/tsconfig.json` had drifted from this: it carried a `references: [{ path: "../chat" }]` entry since 2026-08-25 (added directly to `main`, predating this investigation) — a real disagreement between the documented invariant and the actual repo state. It's reconciled now: the `references` entry is gone, replaced with a `paths` override pinning `@hominem/chat` and `@hominem/chat/types` straight to `packages/chat/build/{public,types-only}.d.ts`, the same pattern `services/api` uses.

That specific fix didn't move `packages/rpc`'s own `tsc --noEmit` time in isolation (~2.9–3.1s before and after) — `packages/rpc/node_modules/@hominem/chat` is a direct symlink, not an injected copy, so the `injectWorkspacePackages` trap below never applied to that particular import path on its own. (It does apply one hop further out: `packages/chat` has a `react` peer dependency, so pnpm still hard-copies it into a peer-isolated variant for `packages/rpc`'s own peer context.) The real win for `packages/rpc` came from the broader `@hominem/api/types`-consumer fix described next.

**Practical rule:** any new `typeof app`-style inference boundary should get zero `references` entries from the start. Resolve every dependency via plain `paths` to `build/*.d.ts`, the way `services/api` and `packages/rpc` do.

## The `pnpm-workspace.yaml` injected-package trap

`pnpm-workspace.yaml` sets `injectWorkspacePackages: true`, which changes how pnpm links any package with a `react` peer dependency (like `packages/career-services` or `packages/ai`): instead of a cheap symlink to live source, pnpm copies the package's files into a peer-isolated spot in `.pnpm`'s virtual store — once, at `pnpm install` time, before anyone has run `pnpm build`.

That timing is the problem. The copy's `package.json` still points `types` at `./build/index.d.ts`, but there's no `build/` folder in the copy — it's a point-in-time snapshot taken before build output existed. So an internal cross-package import from inside that copy 404s on the `types` condition and falls through to the `default` condition — real `src/*.ts` source. That forces a full structural check of the real source (Kysely query builders, in `packages/db`'s case) instead of reading a pre-built `.d.ts`, for every package the react-peer-dependent package imports internally. For `services/api`'s own typecheck this cost about 1.6s of direct check time across 9 packages, 80 files — before counting the downstream ripple.

**The fix:** a `paths` override in `services/api/tsconfig.emit.json` pinning each affected specifier straight to its real `build/*.d.ts`, skipping the injected copy's broken `exports` map:

```json
"paths": {
  "@hominem/db": ["../../packages/db/build/index.d.ts"],
  "@hominem/ai": ["../../packages/ai/build/index.d.ts"]
}
```

Where this lives matters: putting it in `services/api/tsconfig.json` broke `pnpm build` in CI with `MISSING_EXPORT` errors, because `rolldown`'s `build.mjs` also reads that file for real runtime bundling, and it needs the exports-map runtime condition, not a types-only file. It has to live in `tsconfig.emit.json` instead (type-check/declaration-emit only, never read by the bundler), leaving `tsconfig.json`'s `paths` as just the `@/*` alias rolldown expects.

This is safe on a completely fresh checkout with no `build/` output anywhere — a `paths` target that doesn't exist on disk falls through to normal resolution instead of hard-failing. Verified directly by deleting `packages/db/build`, running the typecheck, and confirming via `--traceResolution` that it fell through cleanly.

**Measured win for `services/api` alone:** ~13% faster on `tsc -p tsconfig.emit.json --noEmit` (11.6s → 10.1s average, 2 runs each).

### The trap reappears at every consumer of `@hominem/api/types` — this is the fix that actually explains "`dev:types` feels slow"

The `services/api` override above only fixes the trap for `services/api`'s own compile. `services/api/build/rpc/app.d.ts` doesn't inline the types it references — it preserves them as literal `import("@hominem/career-services").JobImportErrorCode`-style queries, so every downstream program that loads it (`packages/rpc`, `apps/web`, `apps/omiro`, and formerly `apps/finance`) re-resolves that specifier independently and walks into the same trap for `@hominem/career-services`, `@hominem/ai`, `@hominem/db`, and `@hominem/finance-services`.

**The fix** is the same `paths` override duplicated into every consumer: `packages/rpc/tsconfig.json`, `apps/web/tsconfig.json`, `apps/omiro/tsconfig.json`. None of these four packages is a real dependency of the apps or of `packages/rpc` — the override exists purely because their types leak in through the `AppType` boundary. No bundler-breakage risk here (Vite/Metro don't read these tsconfig files for a package nothing actually imports).

**Measured win** (tsserver `open`→`projectLoad`, 3 runs each):

| consumer | before | after | change |
| --- | --- | --- | --- |
| `apps/web` | 14287ms | 6207ms | -57% |
| `apps/omiro` | 7033ms | 4864ms | -31% |
| `packages/rpc` | 3814ms | 3434ms | -10% |
| `services/api` | 4917ms | 4149ms | -16% |

`packages/rpc`'s own `tsc --noEmit` also dropped, from ~2.9s to ~2.1s, once these four specifiers were added on top of the zero-references fix above — the zero-references fix alone couldn't move that number, because `db`/`career-services`/`ai`/`finance-services` were still hitting the trap unfixed.

## Per-domain route splitting: avoiding the root `AppType` entirely

Where possible, the cheaper fix is to not depend on the root `@hominem/api/types` at all. `rpcRoutes` (`services/api/src/rpc/app.ts`) mounts 15 domains — career, chats, collections, enhance, files, finance, inbox, memory, notes, people, personal, tasks, telemetry, usage, voice — into one Hono chain, and `@hominem/api/types` is `typeof rpcApp` over the whole thing. A consumer that only calls one domain still forces tsserver to structurally resolve all 15.

`services/api/package.json` already exports each domain's router individually (`./finance`, `./career`, etc.), each with its own scoped `AppType`. `apps/career` was already built on the narrow `@hominem/api/career` export. `apps/finance` wasn't — both its SSR and browser clients were built on the root type despite only ever calling `.api.finance`.

**Fixed for `apps/finance`:** its SSR client now uses `hc<typeof financeRoutes>` directly against `@hominem/api/finance`. Its browser client needed a real structural split — `packages/rpc`'s shared `HonoClient` stays as-is (genuinely needed by `apps/web`/`apps/omiro`, which call multiple domains), but `packages/rpc/src/finance.ts`'s `FinanceClient` type now derives from `@hominem/api/finance` directly, and its React binding (`FinanceClientContext`, `useFinanceApiClient()`, `FinanceHonoProvider`) moved out of the shared package into `apps/finance` itself, since it had exactly one caller. `apps/finance/tsconfig.json` dropped the `@hominem/api/types`, `@hominem/db`, `@hominem/career-services`, and `@hominem/ai` overrides entirely — it kept only `@hominem/api/finance` and `@hominem/finance-services` (the one package the narrow type itself embeds).

**Measured win** (opening `apps/finance/app/lib/api/client.ts`, 3 runs each):

| metric | before | after | change |
| --- | --- | --- | --- |
| `open`→`projectLoad` | ~2869ms | ~2505ms | -13% |
| `geterr` | ~331ms | ~177ms | -46% |

`geterr` — which scales with how much of the type graph needs checking — is the cleaner signal: the file's dependency footprint shrank from all 15 domains to just `finance`. No regressions found on `apps/career`, `apps/web`, or `apps/omiro`.

**Unfinished, quantified opportunity:** `apps/web` only calls 6 of 15 domains (`chats`, `collections`, `memory`, `notes`, `tasks`, `usage`); `apps/omiro` calls 8 of 15 (`chats`, `enhance`, `files`, `inbox`, `notes`, `people`, `tasks`, `voice`). Neither touches `career` or `finance`. Confirmed by grepping each app's actual call sites against the full domain list. Not attempted — composing several domain routers into one app-scoped client type is a bigger lift than pointing at a single existing export was.

## Explicit return types on generic callbacks

An unannotated callback passed to a generic higher-order function forces TypeScript to infer the callback's full return shape bottom-up, then check that against the HOF's own signature — often one of the most expensive expressions in a file. An explicit return-type annotation skips the bottom-up inference step.

**Confirmed real fixes** (measured via `--generateTrace`):

- `upgradeWebSocket((c): WSEvents<WebSocketLike> => {...})` in `finance.import.websocket.ts` — callback's own check cost dropped from ~780ms to ~6ms.
- `runInTransaction(async (trx): Promise<NoteRecord> => {...})` (×2) in `notes.service.ts` — `createNote`'s callback-inference cost dropped by ~765ms.

This only fixes bottom-up inference of _your own_ code — it doesn't help when the expensive part is baked into a third-party library's own type declaration:

- `better-auth`'s `mcp()` plugin factory is typed as `(options: McpOptions) => ReturnType<typeof oauthProvider>` — every call instantiates that computed type regardless of the caller. Wrapping the call site in `satisfies BetterAuthPlugin` made the measured cost marginally _worse_. Reverted.
- Even the `upgradeWebSocket` fix above only ate the callback's own cost — the outer `.get('/ws', upgradeWebSocket(...))` call still costs ~980ms resolving Hono's own overloaded `.get()` against `UpgradeWebSocket`'s overloaded signature. Nothing fixable from the call site.

**Rule of thumb:** annotate a call to your own function whose return type TS has to infer. Don't expect an annotation at the call site to fix cost baked into a third-party factory's own declared return type (`ReturnType<...>`, heavy overloads, deep generics) — verify with a trace before spending time either way.

## Splitting a large Hono route chain: no compile-time win

`services/api/src/rpc/routes/career.ts` was one 554-line file chaining 48 `.get`/`.post`/`.patch`/`.delete` calls — the largest such chain in the codebase. The hypothesis, following `finance.ts`'s own 11-way `.route()`-composed precedent: Hono's fluent builder re-checks the accumulated route type on every chained call, so splitting into smaller composed sub-routers should cut total check time.

**Tested directly, doesn't hold at this scale.** A 3-run A/B, git-restoring the monolithic file between measurements:

| | run 1 | run 2 | run 3 | avg |
| --- | --- | --- | --- | --- |
| monolithic (48 chained calls) | 12.0s | 11.9s | 11.4s | 11.76s |
| split (11 sub-routers) | 12.2s | 11.9s | 11.7s | 11.96s |

Statistically indistinguishable — if anything, marginally slower split. The `.route()` composition/merge layer (`app.ts`, which composes all 15 domains) is cheap to begin with — ~3.3% of a full `services/api` typecheck — so it was never the bottleneck splitting could have moved.

**Kept the split anyway** (`career.ts` → `career.imports.ts`, `career.profile.ts`, `career.applications.ts`, etc.) — not for speed, for file organization and headroom: the pathological Hono chain-checking blowups reported in the wild show up around 100–300+ routes in one file, well past today's 48. Don't split a route file expecting a compile-speed win as a general technique; verify with a trace first if that's the actual goal.

## The `DbHandle` union: a one-time, unavoidable cost

The single most expensive individual expression found anywhere in `services/api`'s typecheck — ~994ms — was `NoteRepository.create(trx, {...})` in `notes.service.ts`, despite the method's own signature being completely unremarkable and already fully resolved through `packages/db`'s built `.d.ts`. Every _other_ `NoteRepository.xxx(trx, ...)` call in the same file, passing the exact same `trx`, costs 0.3ms.

The explanation: `DbHandle = Kysely<Database> | Transaction<Database>` is a union of two classes each wrapping `Database` — 77 tables, 1399 lines of declarations. The _first_ time TypeScript structurally compares two classes shaped like that within a compilation, it's expensive; every later comparison in the same program reuses the cached result for free. `notes.service.ts` just happened to trigger it first.

**Not fixable by restructuring the triggering file** — the cost would just relocate to whichever file becomes "first" instead. Actually eliminating it means changing `DbHandle`'s shape itself (overloads instead of a union parameter) across all ~11 of `packages/db`'s repositories — a materially bigger, riskier change than anything else here. Not attempted.

## Kysely query-builder chains: real cost, impractical to hand-fix

A handful of `application/*.service.ts` files (`calendar.service.ts`, `finance-mcp.service.ts`, `media.service.ts`, `tags.service.ts`, ~50–100ms each) have the same shape of issue as the callback case above: an unannotated helper returns a raw `db.selectFrom(...).join(...).select([...]).where(...)` chain that gets chained further at the call site.

Unlike `runInTransaction`, not fixed. Kysely's `SelectQueryBuilder<...>` return types are enormous, effectively-generated-looking generics — table aliases crossed with selected-column shape crossed with join state. Hand-writing an accurate annotation is genuinely impractical, and getting it slightly wrong risks silently narrowing or breaking the type. The combined cost across all four files (~300–400ms total) doesn't justify that risk.

## Duplicate type shapes

`scripts/find-duplicate-shapes.mjs` walked all 993 source files under `packages/`, `services/`, `apps/` and found 447 distinct structural shapes with at least 2 members, 16 declared more than once. Triaged into two categories:

- **Coincidentally identical, not actual duplicates** — a db-internal record type and an RPC wire type that just happen to match today (`AIUsageSummaryRecord`/`UsageSummary`, `AIUsageTimeseriesRecord`/`UsageTimeseriesPoint`, `MonthlyUsageStatus` declared twice). These stay separate with an explicit mapper — merging a persistence type with a wire type because they're structurally identical today is exactly the coupling that breaks silently the moment either side changes independently.
- **Genuine copy-paste, safe to consolidate** — `ProcessedFile`/`UploadedFile` were declared identically in both `apps/web` and `apps/omiro`, both already mapping the real RPC wire type into this same client-normalized shape. Consolidated into `packages/rpc/src/types/files.types.ts`, kept deliberately separate from the wire type, without touching the wire/client boundary.

Worth rerunning `scripts/find-duplicate-shapes.mjs` periodically rather than trusting this list to stay accurate (read-only, ~8s on the full tree) — the actual set of duplicates drifts as the codebase grows.

## Typecheck cache correctness tradeoff

**Status:** Accepted (2026-08-31)

Every package on the shared `tsconfig.profiles/package.json` profile (everything except `services/ori` and `services/deepeval`) sets `composite: true`, forcing `incremental: true` with a persisted `./.cache/tsconfig.tsbuildinfo` per package, and each package's `typecheck` script ran plain `tsc --noEmit` against it.

**The failure that forced this decision:** after fixing a real type error in `packages/db`, `pnpm -w typecheck` reported all 34 tasks green — including `packages/ai`, which had its own genuine, unrelated type error (`RecordAIUsageEventInput.metadata: Record<string, unknown>` not assignable to `Json`). Turborepo correctly re-invoked `@hominem/ai`'s `tsc --noEmit` as a cache miss, but `tsc` itself consulted its own stale `.tsbuildinfo` and never re-checked against `@hominem/db`'s freshly-rebuilt declarations. Deleting `packages/ai/.cache` and rerunning surfaced the error immediately; clearing every package's cache repo-wide and forcing a full re-run reproduced the same result everywhere. That's a real, reproducible false-pass in a check whose entire job is to not do that.

Three options were considered: do nothing (rejected — this is the bug itself); a surgical fix hashing each package's workspace-dependency `.d.ts` output to invalidate `.cache` conditionally (rejected for now — real, ongoing cache-invalidation logic for a benefit bounded to a few packages); or clear `.cache` before every `typecheck` invocation, forcing a full re-check every time (**chosen**).

**Decision:** every affected package's `typecheck` script now runs `rm -rf .cache && tsc --noEmit` (existing `-p`/prefix/suffix flags preserved). `build` scripts are untouched — a stale build-time cache doesn't produce this same silent-pass mode, since build output is content-addressed and consumed downstream via the `paths` overrides above.

**Cost, measured** (cold vs. warm-unchanged `tsc --noEmit`, i.e. exactly the reuse given up):

| package | cold | warm (unchanged) | reuse lost |
| --- | --- | --- | --- |
| `services/api` | 5.30s | 5.08s | ~0% (noise) |
| `apps/omiro` | 5.10s | 4.63s | ~9% |
| `packages/rpc` | 1.79s | 0.95s | ~47% |
| `packages/db` | 1.46s | 0.57s | ~61% |
| `packages/utils` | 0.57s | 0.50s | ~12% |

This cost is real but bounded: it's only paid on invocations Turborepo already decided were necessary (Turbo's own content-hash cache still skips the script entirely when nothing relevant changed); it never applies to CI, which always starts cold anyway; and it has zero effect on `pnpm dev:types`/tsserver/editor responsiveness, since that path (`scripts/watch-types.sh`) is a persistent process built on the live-redirect model above and never touches these per-package `.tsbuildinfo` files. `services/api` itself shows ~0 measured cost from this fix — its time is dominated by the one-time `DbHandle` comparison and Kysely chains above, not incremental reuse — so this fix and the speed fixes above are complementary, not in tension.

**Not done:** the surgical hash-based conditional-invalidation approach. Revisit if the blanket `rm -rf .cache` cost is ever actually felt in normal iteration, not just in this one-off benchmark.

## DO / DO NOT

These conclusions are stated as investigation narrative above; this is the same set of conclusions as rules, collected so they don't get silently re-litigated in either direction. `AGENTS.md` points here rather than restating them.

**DO**

- Resolve every dependency of a `typeof app`-style inference-boundary package (`services/api`, `packages/rpc`) via plain `paths` to `build/*.d.ts` — never `references`.
- Put an `injectWorkspacePackages` `paths` override in a type-check-only config (e.g. `tsconfig.emit.json`), never in a `tsconfig.json` a bundler also reads for runtime resolution.
- Point a new package's `paths` alias at another package's emitted `.d.ts`, never at its source (D1/D3 above).
- Give your own unannotated callback passed to a generic higher-order function an explicit return-type annotation when a trace shows it's expensive.
- Clear `.cache`/`tsbuildinfo` before `typecheck` on any package using the shared composite profile — `tsc`'s own incremental cache can silently mask a cross-package type error.
- Hardcode declaration emit's `outDir` — never assemble it via CLI flags or a `rootDir` dance.
- Verify a claimed speedup with `--generateTrace` or a real tsserver session before writing it down. Several plausible-sounding fixes above measured to zero.

**DO NOT**

- Do not add a `references` entry — not even one, not even to a small, stable package — to a package that infers an exported type across its own module boundary (`services/api`, `packages/rpc`). The zero-references rule exists to hold as the type's shape evolves, not just for its shape today.
- Do not add a `workspace:*` dependency for a type-only import — pnpm/turbo build the task graph from `package.json` edges with no notion of `import type`, so it drags a whole extra package into every consumer's build/test/lint/typecheck scope.
- Do not expect splitting a large Hono route chain into `.route()`-composed sub-routers to speed up typechecking — measured statistically indistinguishable at 48-route scale. Split for file-size/organization reasons only.
- Do not expect an explicit return-type annotation at a call site to fix inference cost baked into a third-party library's own type declaration (`ReturnType<...>`, heavy overloads) — it doesn't reach that cost, and measured marginally _worse_ once.
- Do not assume a `paths` override safe for `tsc` is safe for everything else that reads the same tsconfig — a bundler needing the runtime `exports` condition is a real, previously-hit breakage.
- Do not assume `assumeChangesOnlyAffectDirectDependencies` measurably speeds up incremental rechecks — a targeted benchmark showed no effect. It's kept as a deliberate, already-documented tradeoff, not because it was reproven.

## Current numbers

The numbers throughout this document are historical — recorded at the fix that produced them, and left as-is even though the tree has moved on since. For where things stand today, rerun the benchmark rather than trusting a stale table:

```bash
node scripts/bench-tsserver.mjs --label current --runs 3
node scripts/bench-incremental-recheck.mjs --label current --runs 3
```

Latest recorded run (commit `08cb55de1`, 2026-09-06):

| consumer | open | geterr | resolves? |
| --- | --- | --- | --- |
| `apps/web` | 3178ms | 431ms | yes |
| `apps/omiro` | 2745ms | 71ms | yes |
| `packages/db` | 980ms | 580ms | yes |
| `packages/rpc` | 1644ms | 320ms | yes |
| `services/api` | 2218ms | 659ms | yes |

Cross-project `references` (rooted at `packages/chat`): 1104ms, 10 results found. Incremental recheck after an upstream edit: 1008ms average across three runs. Prior-commit comparisons live in this file's git history, not as accumulating tables here.
