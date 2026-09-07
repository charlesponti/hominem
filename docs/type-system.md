# Type System

The monorepo resolves TypeScript types through **compiled declaration contracts** (`build/*.d.ts`), never source files. That one fact drives everything below.

This doc has two parts. **Rules** is the whole set of current instructions — read only this if you're about to touch a `tsconfig.json`, an `exports` map, or anything performance-sensitive in the type graph. **Why** is background: mechanism, measured evidence, and specifically-rejected alternatives, kept separate so it's never mistaken for an instruction. If something below reads like "we tried X" or shows old code, that thing is rejected — the Rules section above it is what's current.

## Rules

**Type resolution**

- A package's `exports` `types` condition points at its compiled `build/*.d.ts` — never at `src/`. `default` (the runtime condition) always stays on `src/` or the bundle; declaration emit must never move a runtime path.
- A new `paths` alias targets another package's emitted `.d.ts`, never its source.
- Generated `.d.ts` files live only in `build/`/`.cache`/other ignored output dirs. Hand-written declaration files are tracked normally.

**Inference-boundary packages** (anything doing Hono's `typeof app` RPC pattern — currently `services/api`, `packages/rpc`)

- Zero `references` entries. Not one, not even to a small stable package. Resolve every dependency via `paths` to `build/*.d.ts` instead.
- Emit declarations through a dedicated `tsconfig.emit.json` (`emitDeclarationOnly`, `composite: false`, hardcoded `outDir`) — never assemble `outDir` via CLI flags or a `rootDir` dance.
- If the package's emitted `.d.ts` re-exports another package's types by literal `import("pkg").Type` reference (it will, unless you flatten it), every consumer of that `.d.ts` needs the same `paths` override this package needed — the trap doesn't stop at your own build.

**The `injectWorkspacePackages` trap**

- Any package with a `react` peer dependency loses its `build/` output in pnpm's injected copy. If you're adding a `paths` override to work around this, put it in a type-check-only config (e.g. `tsconfig.emit.json`) — never in a `tsconfig.json` a bundler also reads for runtime resolution.

**General**

- Never add a `workspace:*` dependency for a type-only (`import type`-only) import — use a `paths` alias instead.
- Give your own callback passed into a generic higher-order function an explicit return-type annotation once a trace shows it's expensive.
- Prefer a narrow, domain-scoped route export (e.g. `@hominem/api/finance`) over a root aggregate type when a consumer only needs one domain.
- Clear `.cache`/`tsbuildinfo` before `typecheck` on any package using the shared composite profile.
- Verify any claimed speedup with `--generateTrace` or a real tsserver session before writing it down or acting on it.

**Don't bother — already tried, didn't work**

- Splitting a large Hono route chain into `.route()`-composed sub-routers for speed. Split for file-size/organization reasons only.
- An explicit return-type annotation at a call site into a *third-party* factory (`ReturnType<...>`, heavy overloads, deep generics). It doesn't reach that cost — the expensive part lives in a declaration you don't own.
- Restructuring a file to dodge a one-time structural-comparison cost (e.g. a large union type). The cost just relocates to whichever file triggers it first.
- Hand-writing return-type annotations for Kysely query-builder chains. The generated types are impractical to write safely by hand.
- Relying on `assumeChangesOnlyAffectDirectDependencies` for a measurable incremental-recheck speedup. Kept as a deliberate editor tradeoff, not because it was proven.

## Why (background — not instructions)

Everything below explains and evidences the rules above. Nothing here overrides them, including any code shown as an example of what was tried and rejected.

### Why this exists

Two incidents in August 2026: a stale `.tsbuildinfo` cache let `services/api` keep failing on a `packages/db` export that had already been fixed, and a scratch declaration-emit run scattered 167 `.d.ts` files into `services/api/src/` (briefly clobbering a real, hand-written one). Root cause for both: the repo resolved dependency *source*, never dependency *declarations*.

### How the model works

Composite packages flip `exports.types` to `build/index.d.ts` while `default` stays on `src/index.ts` — types-only change, bundlers untouched. `services/api` and `packages/rpc` can't be composite (see TS2883 below), so each gets a standalone `tsconfig.emit.json` doing `emitDeclarationOnly`. Everything downstream retargets its `@hominem/api/*` `paths` aliases from api source to the emitted `.d.ts`. Turbo's `typecheck`/`test` → `^build` ordering guarantees declarations are fresh before a consumer typechecks.

**Trade accepted:** an editor only sees a dependency's type change after that dependency rebuilds. `pnpm dev:types` runs the watcher (`scripts/watch-types.sh`) that keeps declarations fresh; restart tsserver if a change ripples further than one hop.

**Phase 0 proof it works:** a scratch `emitDeclarationOnly` build of `services/api` produced 176 self-contained `.d.ts`. `packages/rpc`, `apps/omiro`, and `apps/career` all typechecked clean against them, with zero `services/api/src` files in `apps/omiro`'s program and cold typecheck dropping 9.1s → 6.4s.

### Why zero `references`, not "usually fine"

TS2883 ("portable type") blocks inferring an exported type like Hono's `AppType` across a **composite** project boundary without an explicit annotation — and that annotation would defeat the whole RPC-inference pattern. Tested finding: TS2883 fires because the package itself is `composite`, not because it merely has a `references` entry — a bare `references` entry with `composite: false` passed cleanly in isolation.

That's exactly why the rule isn't "avoid `references` unless you've checked it's fine today": `packages/rpc` had exactly such a bare reference (added straight to `main`, undetected for over a week) and it worked, right up until it was the kind of drift that could silently break the moment `AppType`'s shape changed. It's since been replaced with a plain `paths` override. The rule holds for the type's *future* shape, not just what happens to pass now.

### Why the `injectWorkspacePackages` override goes in `tsconfig.emit.json`, specifically

pnpm hard-copies any `react`-peer-dependent package into an isolated `.pnpm` variant at install time, before `build/` exists — so the copy's `types` condition 404s and TypeScript silently falls back to raw `src/*.ts`, forcing a full structural check of real source (Kysely query builders, in `packages/db`'s case) instead of a cheap `.d.ts` read. Putting the `paths` fix in `tsconfig.json` once broke `pnpm build` in CI (`MISSING_EXPORT`), because rolldown reads that same file for real runtime bundling and needs the exports-map's runtime condition, not a types-only path. `tsconfig.emit.json` is read only for type-checking, never by the bundler — that's the only reason it's safe there.

**Measured, so this isn't a guess:** fixing this for `services/api` alone was ~13% faster on its own typecheck. But the emitted `app.d.ts` doesn't inline the types it references — it preserves them as literal `import("@hominem/career-services").X` queries — so every downstream consumer (`packages/rpc`, `apps/web`, `apps/omiro`) re-resolves the same broken specifier independently. Extending the same override to all of them is the fix that actually explains "`dev:types` feels slow": tsserver `open` time dropped 57% for `apps/web` (14.3s → 6.2s) and 31% for `apps/omiro` (7.0s → 4.9s).

### Why narrow domain exports beat the root `AppType`

`services/api`'s `rpcRoutes` mounts 15 domains into one Hono chain, and the root `@hominem/api/types` is `typeof rpcApp` over all of them — so a consumer needing one domain still forces tsserver to resolve all 15. `apps/finance` was rebuilt on the narrow `@hominem/api/finance` export instead of the root type: `open` dropped 13%, `geterr` (the cleaner signal, since it scales with graph size) dropped 46%. `apps/web` (6 of 15 domains used) and `apps/omiro` (8 of 15) have the same opportunity, unclaimed — composing several domain routers into one scoped client type is a bigger lift than `apps/finance`'s single-export swap was.

### Why callback annotations sometimes do nothing

An unannotated callback into a generic higher-order function forces bottom-up return-shape inference before it's checked against the HOF's signature — expensive, and fixed by an explicit return-type annotation. Confirmed: `upgradeWebSocket` callback cost dropped from ~780ms to ~6ms; a `runInTransaction` callback dropped ~765ms. But this only fixes inference of *your own* code. `better-auth`'s `mcp()` factory is typed as `ReturnType<typeof oauthProvider>` — wrapping the call site in `satisfies BetterAuthPlugin` measured marginally *worse* and was reverted, because the expensive part is baked into a declaration you don't control and can't annotate around.

### Why splitting the Hono route chain didn't help

The hypothesis (following `finance.ts`'s own sub-router precedent) was that Hono's fluent builder re-checks the accumulated type on every chained call, so a 48-call chain split into 11 composed sub-routers should check faster. A 3-run A/B, restoring the monolithic file between runs, measured 11.76s vs. 11.96s average — statistically indistinguishable. The composition/merge layer was already only ~3.3% of the full typecheck; it was never the bottleneck. The split shipped anyway, for file-size and headroom against much larger chains, just not for speed.

### Why the `DbHandle` union cost can't be engineered away

The single most expensive expression found anywhere in `services/api`'s typecheck (~994ms, one call in `notes.service.ts`) wasn't from a complicated signature — every other call with the identical `DbHandle`-typed parameter in the same file cost 0.3ms. `DbHandle = Kysely<Database> | Transaction<Database>` is a union of two classes each wrapping a 77-table schema; the *first* structural comparison of that shape in a compilation is expensive, and every later one reuses the cached result for free. Whichever file happens to trigger it first pays the cost — moving code around just relocates which file that is. Actually removing it means reshaping `DbHandle` across all of `packages/db`'s repositories, a bigger and riskier change than anything else here; not attempted.

### Why Kysely chains were left alone

A handful of service files pay 50–100ms each for the same bottom-up-inference issue as the callback case, but Kysely's `SelectQueryBuilder<...>` return types are large, effectively-generated-looking generics. Hand-writing an accurate annotation risks silently narrowing or breaking the type, for a combined ~300–400ms — not worth the risk.

### Duplicate type shapes

`scripts/find-duplicate-shapes.mjs` found 16 structurally-duplicated shapes out of 447 across the repo. Most were coincidental (a persistence record and a wire type that happen to match today — kept separate, since merging them couples layers that should be able to change independently). One was genuine copy-paste (`ProcessedFile`/`UploadedFile` in both `apps/web` and `apps/omiro`) and got consolidated into `packages/rpc`. Worth re-running periodically; it's read-only and the actual duplicate set drifts as the codebase grows.

### Why the typecheck cache gets cleared every run

Every composite-profile package persists a `.tsbuildinfo` incremental cache. That cache produced a real false pass: after fixing a type error in `packages/db`, `pnpm -w typecheck` reported all 34 tasks green — including `packages/ai`, which had its own genuine, unrelated type error that `tsc` silently skipped re-checking because its cache believed `packages/ai` was unchanged. Turbo had correctly identified the task as a cache miss and re-invoked `tsc`; `tsc`'s own cache is what lied. A surgical fix (hash dependency `.d.ts` output, invalidate conditionally) was considered and rejected as not worth the ongoing maintenance for the benefit; clearing `.cache` before every `typecheck` invocation was chosen instead.

**Cost, measured** (cold vs. warm-unchanged `tsc --noEmit` — exactly the reuse given up):

| package | cold | warm (unchanged) | reuse lost |
| --- | --- | --- | --- |
| `services/api` | 5.30s | 5.08s | ~0% (noise) |
| `apps/omiro` | 5.10s | 4.63s | ~9% |
| `packages/rpc` | 1.79s | 0.95s | ~47% |
| `packages/db` | 1.46s | 0.57s | ~61% |
| `packages/utils` | 0.57s | 0.50s | ~12% |

Bounded cost: only paid on invocations Turbo already decided were necessary, never applies to CI (always cold anyway), and has zero effect on `pnpm dev:types`/tsserver — that path never touches these per-package cache files at all. `services/api` shows ~0 cost from this specific fix; its time is dominated by the `DbHandle` and Kysely costs above, not incremental reuse.

### Two flags worth knowing about, one that helped and one that didn't

`disableReferencedProjectLoad`/`disableSolutionSearching` (already set, tsserver-only) gave a real, reproducible 2.35x speedup on cross-project "Find All References." `assumeChangesOnlyAffectDirectDependencies` (also set, also tsserver-only) showed no measurable effect on a targeted incremental-recheck benchmark — kept anyway as a deliberate, already-documented tradeoff, not because the benchmark reproved it.

### How any of this was actually measured

Every number above came from `--generateTrace` or a real `tsserver` session via the scripts in `scripts/` (`bench-tsserver.mjs`, `bench-tsserver-minimal.mjs`, `bench-incremental-recheck.mjs`, `check-live-types.mjs`, `find-duplicate-shapes.mjs`) — never from assumption. All are read-only or self-reverting; safe to rerun any time you want to sanity-check a number here or add a new one.

### Current numbers

Numbers throughout this doc are historical, recorded at the fix that produced them — don't treat them as live. To check where things stand today:

```bash
node scripts/bench-tsserver.mjs --label current --runs 3
```

Latest recorded run (commit `08cb55de1`, 2026-09-06): `apps/web` 3178ms open / 431ms geterr, `apps/omiro` 2745ms / 71ms, `packages/db` 980ms / 580ms, `packages/rpc` 1644ms / 320ms, `services/api` 2218ms / 659ms. Older comparisons live in this file's git history, not as accumulating tables here.
