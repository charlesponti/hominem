# Type-Check Performance

This documents an investigation into why `pnpm dev:types` felt slow and how much of TypeScript's cost in this monorepo is fixable versus inherent. It assumes the declaration-contract model in [`docs/type-system.md`](type-system.md) as background — this document is about _speed and inference cost_ within that model, not the model itself.

Every number below came from actually running the compiler with `--generateTrace` or driving real `tsserver` (the same protocol VS Code speaks) via the scripts in `scripts/`, not from reading library docs or assuming. Several intuitive-sounding fixes were tested and found to do nothing; they're recorded here specifically so nobody spends time re-deriving that.

## Tooling

All of these are read-only or self-reverting; safe to run against a live checkout.

| Script                                                              | What it answers                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/lib/tsserver-client.mjs`                                   | Shared client: spawns real `tsserver`, speaks its actual protocol (newline-delimited JSON requests in, `Content-Length`-framed responses out). Everything below is built on this.                                                                    |
| `scripts/bench-tsserver.mjs`                                        | Timing (`open`/`geterr`/`references`) across every real consumer in the monorepo, plus a cross-project "Find All References" benchmark. `--label`, `--runs`, `--json`.                                                                               |
| `scripts/bench-incremental-recheck.mjs`                             | The one scenario `assumeChangesOnlyAffectDirectDependencies` actually affects: an already-warm tsserver session re-checking a downstream consumer after an _upstream_ file changes.                                                                  |
| `scripts/check-live-types.mjs` / `scripts/check-live-types-rpc.mjs` | Correctness sweep: edit a type without rebuilding, ask tsserver via `quickinfo` whether a given consumer sees it live or stale. Always reverts its own edit, including on failure.                                                                   |
| `scripts/find-duplicate-shapes.mjs`                                 | Uses the TypeScript Compiler API (`ts.createProgram` + `TypeChecker`) to walk every exported interface/object-type-alias under `packages/`, `services/`, `apps/` and group ones with an identical structural signature. `--min-members N`, `--json`. |

**Why two different tools for "is this fast" and "is this fresh":** tsserver's protocol is built for one-symbol-at-a-time interactive queries (hover, references, go-to-def) against a live session — there's no "list every type and compare shapes" command in it. A batch `ts.createProgram` walk is the right tool for whole-project structural analysis; tsserver is the right tool for anything that depends on editor-session state (what's "open", what's cached, what a real language-service redirect resolves to).

## The live-redirect model (recap)

A consumer with a `references` entry to a composite package gets tsserver's live project-reference source redirect **for free**, with zero dependency on that package's `build/*.d.ts` being fresh. Verified via `go-to-definition`, even from a completely clean checkout with no build output anywhere. This is why `scripts/watch-types.sh` only needs to keep `services/api` and `packages/rpc` fresh via an active watcher (see below) — every other composite-to-composite edge in the graph (`packages/db`, `packages/rpc`, `apps/web`, `apps/omiro`, ...) doesn't need one.

`disableReferencedProjectLoad` and `disableSolutionSearching` (already set in the root `tsconfig.json`) are tsserver-only flags (ignored by `tsc`/CI) that give a real, reproducible **2.35x speedup** on cross-project "Find All References" — 1518ms vs 3574ms average, 4 runs each, rooted at a type used across `packages/chat` → `packages/db`/`packages/rpc`. Confirmed this holds even though nothing literally `extends` the root `tsconfig.json`: tsserver's "solution search" auto-discovers sibling/ancestor tsconfigs independent of the `extends` chain.

`assumeChangesOnlyAffectDirectDependencies` — documented in `AGENTS.md` as a deliberate editor-responsiveness tradeoff — did **not** reproduce a measurable benefit in a targeted incremental-recheck benchmark (`scripts/bench-incremental-recheck.mjs`: warm session, edit the shallowest upstream file in the generation-event graph, re-check the deepest downstream consumer, time the round trip). Left as-is: no evidence either way to justify reversing a documented, deliberate decision on the strength of one benchmark that didn't happen to reproduce the claimed effect.

## `services/api`'s zero-references invariant, and a real inconsistency

`services/api` (and `packages/rpc`) infer an exported type across their own module boundary — Hono's `typeof rpcApp` RPC pattern. TS's "portable type" check (`TS2883`) refuses to infer an exported type like `AppType` across a real **composite** project boundary without an explicit annotation, which would defeat the whole point of the pattern. That part is well understood and documented in `AGENTS.md`.

What's less obvious, and got tested directly: **TS2883 is about the package itself being `composite`, not about merely having a bare `references` entry.** A `references: [{ path: "../../packages/chat" }]` entry with `composite: false` passes a full `tsc --noEmit` and a full `tsc -p tsconfig.emit.json` declaration-only build cleanly — including a variant specifically testing `composite: true` side-by-side to confirm _that_ is what actually triggers TS2883, not the reference itself.

This was tried, in this repo, on `services/api` — and then reverted, because a review caught that `AGENTS.md`'s rule is stricter than "avoid TS2883 today": it says zero `references` entries at all, specifically so the invariant holds as the `AppType` contract evolves, not just for its current shape. A bare reference to one small, stable package (`packages/chat`) passing today doesn't prove it'll keep passing after `AppType` picks up something structurally different. `services/api` was reverted to zero references.

**`packages/rpc/tsconfig.json` was not — reconciled here.** It had `references: [{ path: "../chat" }]` since 2026-08-25 (`git blame`; added directly to `main`, predates any of this investigation), a real, live discrepancy between `AGENTS.md`'s documented invariant and actual repo state that got flagged rather than silently resolved either direction while it was still open.

It's since been closed: the `references` entry is gone, replaced with a `paths` override pinning `@hominem/chat` and `@hominem/chat/types` straight to `packages/chat/build/{public,types-only}.d.ts` — the same pattern `services/api` uses for its own dependencies. Unlike `services/api`, `packages/rpc/tsconfig.json` has no separate bundler reading it (its `build` script is plain `tsc -p tsconfig.emit.json`), so the override lives directly in `tsconfig.json` rather than needing a split emit-only config.

One difference from `services/api`'s case worth recording: `packages/rpc`'s own `tsc --noEmit` didn't show a measurable speedup from this change (~2.9-3.1s before and after, 3 runs each) — `packages/rpc/node_modules/@hominem/chat` is a direct symlink to the real `packages/chat`, not an injected copy, so the `injectWorkspacePackages` trap described above never applied to `packages/rpc` checking itself. It *does* apply one hop out: `packages/chat` itself has a `react` peer dependency, so pnpm still hard-copies it into a peer-isolated `.pnpm` variant for `packages/rpc`'s own peer context (confirmed on disk: that copy has no `build/`) — verified with the paths target temporarily removed that fresh-checkout resolution still falls through cleanly (0 errors). The value of this fix is compliance with the zero-references invariant and closing the AGENTS.md discrepancy, not a proven speed win for `packages/rpc` in isolation.

**Practical rule:** if you're adding a `typeof app`-style inference boundary, give it zero `references` entries, full stop — resolve every dependency via plain paths to `build/*.d.ts`, same as `services/api` and now `packages/rpc`.

## The `pnpm-workspace.yaml` injected-package trap

`pnpm-workspace.yaml` sets `injectWorkspacePackages: true`. Whenever a react-peer-dependent package (`packages/career-services`, `packages/ai`) needs a workspace dependency, pnpm hard-copies (not symlinks) that dependency into a peer-isolated `.pnpm` virtual-store variant — a real, separate copy of the package's `src/`, frozen at `pnpm install` time, before `pnpm build` has ever run.

The problem: that frozen copy's `package.json` still has `"types": "./build/index.d.ts"` in its `exports` map, but `build/` doesn't exist in the copy (it was never part of the installed package content — it's a build artifact of the _real_ workspace location, and the copy is a point-in-time snapshot). So when e.g. `packages/career-services` imports `@hominem/db` from **inside** that injected copy, the `types` condition 404s and TS falls through to the `default` condition — real `src/*.ts`. That forces a full structural check of the actual repository source (Kysely query builders, in `packages/db`'s case — expensive) instead of a cheap pre-built `.d.ts`, for every package these react-peer-dependent packages import internally.

Measured impact for `services/api`'s own typecheck: 9 packages (`utils`, `env`, `services`, `queues`, `telemetry`, `ai`, `db`, `chat`, `career-services`), 80 files, ~1.6s of direct check time (before counting the downstream relation-checking ripple).

**Fix:** a `paths` override in `services/api/tsconfig.emit.json` pinning each of those specifiers straight to its real `build/*.d.ts`:

```json
"paths": {
  "@hominem/db": ["../../packages/db/build/index.d.ts"],
  "@hominem/ai": ["../../packages/ai/build/index.d.ts"],
  // ...
}
```

**Where you put this matters.** The first attempt put it in `services/api/tsconfig.json` — which `rolldown`'s `build.mjs` also reads (`tsconfig: './tsconfig.json'`) for its own _runtime_ bundling. `tsc` is fine resolving a bare `paths` target straight to a `.d.ts`; rolldown needs the exports-map runtime condition (the actual JS), not a types-only file — this broke `pnpm build` in CI with `MISSING_EXPORT` errors. Fixed by moving the override into `tsconfig.emit.json` (type-check/declaration-emit only, never read by the bundler) and leaving `tsconfig.json`'s `paths` as just the `@/*` alias rolldown expects.

**This is safe on a fresh checkout with no `build/` output anywhere.** A `paths` substitution whose target file doesn't exist on disk falls through to normal `node_modules`/package.json-exports resolution rather than hard-failing — verified directly: deleted `packages/db/build` entirely, ran `tsc -p services/api/tsconfig.emit.json --noEmit`, 0 errors, confirmed via `--traceResolution` that it fell through to the normal `node_modules` lookup. So this override is a fast path when `build/` is fresh, not a hard requirement.

**Measured win:** ~13% faster `tsc -p tsconfig.emit.json --noEmit` for `services/api` (11.6s → 10.1s average, A/B'd, 2 runs each).

## Explicit return types on generic callbacks: when it helps, when it doesn't

An unannotated callback passed to a generic higher-order function forces TS to infer the callback's full return shape bottom-up, _then_ check that inferred shape against the HOF's signature — often one of the single most expensive expressions in a file. Adding an explicit return-type annotation on the callback gives it a contextual type upfront and skips the bottom-up inference.

**Confirmed real fixes** (measured via `--generateTrace`, before/after):

- `upgradeWebSocket((c): WSEvents<WebSocketLike> => {...})` in `finance.import.websocket.ts` — the callback's own `checkExpression` cost dropped from ~780ms to ~6ms.
- `runInTransaction(async (trx): Promise<NoteRecord> => {...})` (×2) in `notes.service.ts` — `createNote`'s callback-inference cost dropped from ~765ms.

**This only fixes bottom-up inference of _your_ code.** It does not help when the expensive part is baked into a third-party library's own type declaration:

- `better-auth`'s `mcp()` plugin factory is typed `(options: McpOptions) => ReturnType<typeof oauthProvider>` — every call instantiates that computed return type regardless of what the caller does. Tested wrapping the call site in an explicit `satisfies BetterAuthPlugin` annotation: made the measured cost marginally _worse_, not better. Reverted.
- The `upgradeWebSocket` fix above only ate the callback's own inference cost. The _outer_ `.get('/ws', upgradeWebSocket(...))` call still costs ~980ms in `checkVariableDeclaration` — that's TS resolving `UpgradeWebSocket`'s overloaded call signature against Hono's own overloaded `.get()`, both libraries' own type declarations, not fixable from the call site.

**Rule of thumb:** if the expensive node is a call to _your own_ function whose return type TS has to infer, annotate it. If it's a call into a third-party factory whose _own_ declared return type is expensive (computed via `ReturnType<...>`, heavy overloads, deep generics), annotating the call site doesn't change what that factory's type declaration makes TS compute — verify with a trace before spending time on it.

## Splitting a large Hono route chain: tested, no compile-time win

`services/api/src/rpc/routes/career.ts` used to be one 554-line file chaining 48 `.get`/`.post`/`.patch`/`.delete` calls on a single `Hono` instance — the largest such chain in the codebase (`finance.ts`'s largest sub-router, `finance.accounts.ts`, has 21). The hypothesis, following `finance.ts`'s own precedent (an 11-way `.route()` composition of small sub-routers, with a comment claiming "type-checking is blazing fast, explicit types, no inference"): Hono's fluent builder re-checks the accumulated route type on every additional chained call, so splitting a large chain into smaller `.route()`-composed pieces should reduce total check time.

**Tested directly and it doesn't hold at this scale.** Rigorous 3-run A/B, git-restoring the original monolithic file between measurements:

|                                             | run 1 | run 2 | run 3 | avg    |
| ------------------------------------------- | ----- | ----- | ----- | ------ |
| monolithic (48 chained calls, 1 file)       | 12.0s | 11.9s | 11.4s | 11.76s |
| split (11 sub-routers, `.route()`-composed) | 12.2s | 11.9s | 11.7s | 11.96s |

Statistically indistinguishable — if anything the split is marginally slower. Confirmed why: the `.route()` composition/merge layer (`economy.ts`, which composes 15 domains, plus `app.ts`, the root) is cheap — **148ms + 116ms out of ~8000ms total, about 3.3%** of a full `services/api` typecheck. It was never the bottleneck. Total type-level work to arrive at the same merged `AppType` looks roughly conserved whether it's built from one long chain or several short ones composed together.

**The split still happened** (`career.ts` → `career.imports.ts`, `career.profile.ts`, `career.applications.ts`, ... mirroring `packages/db`'s own repository split) for file-organization and future-growth-ceiling reasons — genuinely pathological Hono chain-checking blowups reported in the wild are at 100–300+ routes in one file, well past today's 48, so this bounds that risk for later. Just don't expect a measurable compile-speed win from route-file splitting as a general technique; verify with a trace before promising one.

## The `DbHandle` union: a one-time, unavoidable cost

The single most expensive individual expression found in `services/api`'s typecheck (~994ms) was `NoteRepository.create(trx, {...})` in `notes.service.ts`. `NoteRepository.create`'s own signature is unremarkable (`create(handle: DbHandle, input: CreateNoteInput): Promise<NoteRecord>`, all concrete, already resolved via `packages/db`'s built `.d.ts`) — so this looked at first like something fixable.

It isn't. Every _other_ `NoteRepository.xxx(trx, ...)` call in the same file — `syncFiles`, right after `create`, passing the exact same `trx` through the exact same `DbHandle`-typed parameter — costs 0.3ms, not ~994ms. The only explanation: `DbHandle = Kysely<Database> | Transaction<Database>` is a union of two classes each wrapping `Database`, Kysely's full schema type (77 tables, 1399 lines of declarations). The _first_ time TS has to structurally compare two classes shaped like that within a single compilation, it's expensive; every later comparison in the same program reuses the cached result for free. `notes.service.ts` just happened to be an early file to trigger it.

**Not fixable by restructuring the triggering file** — the cost would simply relocate to whichever file becomes "first" instead. Would require changing `DbHandle`'s shape itself (e.g. splitting repository methods into overloads instead of a union parameter) across all of `packages/db`'s ~11 repositories to test — a materially bigger, riskier change than anything else in this document, not attempted.

## Kysely query-builder chains: real cost, impractical to hand-fix

A handful of `application/*.service.ts` files (`calendar.service.ts`, `finance-mcp.service.ts`, `media.service.ts`, `tags.service.ts`, ~50–100ms each) have the same _shape_ of issue as the HOF-callback case above: an unannotated helper function returns a raw `db.selectFrom(...).join(...).select([...]).where(...)` chain, then gets chained further at the call site, forcing bottom-up inference of the whole thing.

Unlike `runInTransaction`, this wasn't fixed. Kysely's `SelectQueryBuilder<...>` return types are enormous, effectively-generated-looking generics (table aliases × selected-column shape × join state) — hand-writing an accurate annotation is impractical and risks silently narrowing or breaking the type if it's wrong. Combined cost across all four files (~300–400ms) doesn't justify that risk. Left alone.

## Duplicate type shapes

`scripts/find-duplicate-shapes.mjs` walked 993 source files under `packages/`, `services/`, `apps/` and found 447 distinct structural shapes (≥2 members), 16 of them declared more than once under a different name and/or in a different file. Two categories came out of triaging them:

- **Coincidentally identical, not actually duplicates** — a db-internal record type and an RPC wire type that happen to match today (e.g. `AIUsageSummaryRecord`/`UsageSummary`, `AIUsageTimeseriesRecord`/`UsageTimeseriesPoint`, `MonthlyUsageStatus` declared twice). These should stay separate with an explicit mapper between them — merging a persistence type with a wire type because they're structurally identical today is exactly the kind of coupling that breaks silently the next time either side changes independently.
- **Genuine copy-paste, safe to consolidate** — `ProcessedFile`/`UploadedFile` declared identically in `apps/web` and `apps/omiro`. Both apps already mapped the real RPC wire type (`UploadedFileDto`) into this client-normalized shape via their own `toUploadedFile()`, so consolidating it into `packages/rpc/src/types/files.types.ts` (deliberately kept separate from `UploadedFileDto`) removed the duplicate without touching the wire/client boundary.

Rerun `scripts/find-duplicate-shapes.mjs` periodically (it's read-only, ~8s on the full tree) rather than trusting this list to stay current — it will drift as the codebase grows.

## Numbers, for reference

Full cold monorepo typecheck (before the fixes in this document): ~24.3s — composite `tsc -b` build ~7.7s, `services/api` alone ~11–14s, `packages/rpc` emit ~1.6s. `services/api`'s own `checkSourceFile` total dropped from ~8.29s to ~7.57s from the callback-annotation fixes alone, plus the ~13% win on `tsc -p tsconfig.emit.json` from the `paths`-override fix above. None of this makes the monorepo "under a second" — a project this size doing real structural inference across ~1000 files legitimately takes several seconds; the fixes here removed identifiable waste, not the inherent cost of the type system doing its job.
