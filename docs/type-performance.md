# Type-Check Performance

`pnpm dev:types` felt slow, so this document is the writeup of actually digging into why — and, just as important, how much of that slowness is fixable versus just the cost of TypeScript doing real structural inference over a monorepo this size. It assumes the declaration-contract model in [`docs/type-system.md`](type-system.md) as background; this document is only about _speed and inference cost_ within that model, not the model itself.

One rule we held ourselves to: every number below came from actually running the compiler with `--generateTrace`, or from driving a real `tsserver` session (the same protocol VS Code speaks) via the scripts in `scripts/`. Nothing here is "the docs say" or "this should help." A few fixes that sounded obviously right turned out to do nothing when we measured them — those are written up here too, specifically so nobody burns an afternoon re-discovering that.

## Tooling

All of these are read-only or self-reverting, so they're safe to run against a live checkout whenever you want to sanity-check something below.

| Script                                                              | What it answers                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/lib/tsserver-client.mjs`                                   | The shared client everything else is built on: it spawns a real `tsserver` and speaks its actual protocol (newline-delimited JSON requests in, `Content-Length`-framed responses out).                                                              |
| `scripts/bench-tsserver.mjs`                                        | Timing (`open`/`geterr`/`references`) across every real consumer in the monorepo, plus a cross-project "Find All References" benchmark. `--label`, `--runs`, `--json`.                                                                               |
| `scripts/bench-incremental-recheck.mjs`                             | The one scenario `assumeChangesOnlyAffectDirectDependencies` actually affects: an already-warm tsserver session re-checking a downstream consumer after an _upstream_ file changes.                                                                  |
| `scripts/check-live-types.mjs` / `scripts/check-live-types-rpc.mjs` | A correctness sweep, not a speed one: edit a type without rebuilding, then ask tsserver via `quickinfo` whether a given consumer sees the change live or is looking at something stale. Always reverts its own edit, including if it fails partway. |
| `scripts/find-duplicate-shapes.mjs`                                 | Uses the TypeScript Compiler API (`ts.createProgram` + `TypeChecker`) to walk every exported interface/object-type-alias under `packages/`, `services/`, `apps/` and group the ones that share an identical structural signature. `--min-members N`, `--json`. |

Why two different tools instead of one? "Is this fast" and "is this fresh" are genuinely different questions. tsserver's protocol is built for one-symbol-at-a-time interactive queries — hover, references, go-to-def — against a live session, and there's no "list every type in the project and compare shapes" command in that protocol. For that, a batch `ts.createProgram` walk is just the right tool. tsserver, on the other hand, is the right tool for anything that depends on editor-session state: what's currently "open," what's cached, what a real language-service redirect actually resolves to.

## The live-redirect model (recap)

Worth recapping before anything else, since a few of the fixes below lean on it: a consumer with a `references` entry to a composite package gets tsserver's live project-reference source redirect for free — and that redirect doesn't depend on the referenced package's `build/*.d.ts` being fresh at all. We verified this directly via go-to-definition, even starting from a completely clean checkout with no build output anywhere. That's why `scripts/watch-types.sh` only bothers keeping `services/api` and `packages/rpc` fresh via an active watcher (more on that below) — every other composite-to-composite edge in the graph (`packages/db`, `packages/rpc`, `apps/web`, `apps/omiro`, ...) doesn't need one.

Two flags already set in the root `tsconfig.json` — `disableReferencedProjectLoad` and `disableSolutionSearching` — are tsserver-only (meaning `tsc`/CI ignore them entirely). We measured a real, reproducible 2.35x speedup from them on cross-project "Find All References": 1518ms versus 3574ms average, 4 runs each, rooted at a type used across `packages/chat` → `packages/db`/`packages/rpc`. One thing that surprised us: this held even though nothing literally `extends` the root `tsconfig.json`. Turns out tsserver's "solution search" auto-discovers sibling and ancestor tsconfigs on its own, independent of the `extends` chain.

We also went looking for a win from `assumeChangesOnlyAffectDirectDependencies`, which `AGENTS.md` documents as a deliberate editor-responsiveness tradeoff — but a targeted incremental-recheck benchmark didn't show one. The benchmark (`scripts/bench-incremental-recheck.mjs`) works like this: warm up a session, edit the shallowest upstream file in the generation-event graph, then time how long it takes a downstream consumer to re-check. No measurable benefit showed up. We left the flag as-is regardless — one benchmark not reproducing a claimed effect isn't enough evidence to reverse a deliberate, documented decision.

## `services/api`'s zero-references invariant, and a real inconsistency we found

`services/api` (and `packages/rpc`) both infer an exported type across their own module boundary — this is Hono's `typeof rpcApp` RPC pattern. TypeScript's "portable type" check (`TS2883`) won't infer an exported type like `AppType` across a real **composite** project boundary without an explicit annotation, and adding that annotation would defeat the entire point of the pattern. That part is already well understood and written up in `AGENTS.md`.

What wasn't obvious going in, and what we tested directly, is more specific: **TS2883 fires because the package itself is `composite`, not because it merely has a bare `references` entry.** We confirmed this by adding a `references: [{ path: "../../packages/chat" }]` entry with `composite: false` and running both a full `tsc --noEmit` and a full `tsc -p tsconfig.emit.json` declaration-only build — both passed cleanly. We also ran the same experiment with `composite: true` side by side, specifically to confirm that flag (and not the reference itself) is what actually triggers TS2883.

We actually tried this on `services/api` — and then reverted it, because review caught something important: `AGENTS.md`'s rule is stricter than "avoid TS2883 today." It says zero `references` entries, period, specifically so the invariant keeps holding as `AppType`'s shape evolves, not just for its current shape. A bare reference to one small, stable package (`packages/chat`) passing today doesn't tell you it'll still pass once `AppType` picks up something structurally different down the line. So `services/api` went back to zero references.

`packages/rpc/tsconfig.json` was a different story — we found it, but hadn't reverted it, so we reconciled it here instead. It had carried a `references: [{ path: "../chat" }]` entry since 2026-08-25 (per `git blame` — added directly to `main`, predating any of this investigation), which meant `AGENTS.md`'s documented invariant and the actual state of the repo genuinely disagreed with each other. We flagged that discrepancy rather than silently resolving it one way or the other while it was still an open question.

It's closed now: the `references` entry is gone, replaced with a `paths` override that pins `@hominem/chat` and `@hominem/chat/types` straight to `packages/chat/build/{public,types-only}.d.ts` — the same pattern `services/api` already uses for its own dependencies. One small difference in how it's wired: `packages/rpc/tsconfig.json` has no separate bundler reading it (its `build` script is just plain `tsc -p tsconfig.emit.json`), so the override lives directly in `tsconfig.json` rather than needing a split emit-only config the way `services/api` does.

One thing worth flagging honestly: `packages/rpc`'s own `tsc --noEmit` didn't get measurably faster from *this specific* change in isolation (~2.9–3.1s before and after, 3 runs each). The reason is that `packages/rpc/node_modules/@hominem/chat` is a direct symlink to the real `packages/chat`, not an injected copy — so the `injectWorkspacePackages` trap described in the next section never actually applied to `packages/rpc` checking itself through that particular import path. It does apply one hop further out, though: `packages/chat` itself has a `react` peer dependency, so pnpm still hard-copies it into a peer-isolated `.pnpm` variant for `packages/rpc`'s own peer context (we confirmed this on disk — that copy has no `build/` directory). With the `paths` target temporarily removed, fresh-checkout resolution still fell through cleanly with 0 errors, which is the behavior we want. So taken completely on its own, this fix's value is compliance with the zero-references invariant and closing the `AGENTS.md` discrepancy — not a proven speed win for `packages/rpc` in isolation. But keep reading: the "trap re-appears at every `@hominem/api/types` consumer" section below adds three more `paths` entries to this same `packages/rpc/tsconfig.json`, and *those* do produce a large, measured win — including for `packages/rpc` itself.

**Practical rule to take away from this:** if you're adding a new `typeof app`-style inference boundary anywhere in the repo, give it zero `references` entries from the start. Resolve every dependency via plain `paths` to `build/*.d.ts`, the same way `services/api` and now `packages/rpc` do.

## The `pnpm-workspace.yaml` injected-package trap

Here's a subtle one. Normally pnpm links a workspace package into `node_modules` with a symlink — cheap, and it always points at the live source. But `pnpm-workspace.yaml` has `injectWorkspacePackages: true` set, and that changes things for any package with a `react` peer dependency, like `packages/career-services` or `packages/ai`: a plain symlink can't give each consumer its own version-compatible copy, so pnpm actually copies the package's files into a separate, peer-isolated spot in `.pnpm`'s virtual store instead. It does this once, at `pnpm install` time — before anyone has run `pnpm build`.

That timing is exactly the problem. The copy's `package.json` still points `types` at `./build/index.d.ts` in its `exports` map, but there's no `build/` folder in the copy — it was never part of the installed package's content in the first place, since it's a build artifact that only exists at the real workspace location, and the copy is just a point-in-time snapshot. So when, say, `packages/career-services` imports `@hominem/db` from *inside* that injected copy, the `types` condition 404s, and TypeScript falls through to the `default` condition instead — the real `src/*.ts` source. That means a full structural check of the actual repository source (Kysely query builders, in `packages/db`'s case, which is not cheap) instead of a quick read of a pre-built `.d.ts` — and it happens for every package these react-peer-dependent packages import internally.

For `services/api`'s own typecheck, this added up to a real cost: 9 packages (`utils`, `env`, `services`, `queues`, `telemetry`, `ai`, `db`, `chat`, `career-services`), 80 files, and roughly 1.6s of direct check time — before even counting the downstream relation-checking ripple that follows from it.

**The fix** is a `paths` override in `services/api/tsconfig.emit.json` that pins each of those specifiers straight to its real `build/*.d.ts`, skipping the injected copy's broken `exports` map entirely:

```json
"paths": {
  "@hominem/db": ["../../packages/db/build/index.d.ts"],
  "@hominem/ai": ["../../packages/ai/build/index.d.ts"],
  // ...
}
```

Where you actually put this override matters more than you'd expect. Our first attempt put it in `services/api/tsconfig.json` — which turned out to be a mistake, because `rolldown`'s `build.mjs` also reads that same file (`tsconfig: './tsconfig.json'`) for its own *runtime* bundling. `tsc` is perfectly happy resolving a bare `paths` target straight to a `.d.ts`, but rolldown needs the exports-map's runtime condition — the actual JS, not a types-only file — so this broke `pnpm build` in CI with `MISSING_EXPORT` errors. The fix for the fix: move the override into `tsconfig.emit.json` (used only for type-checking and declaration emit, never read by the bundler) and leave `tsconfig.json`'s `paths` as just the `@/*` alias rolldown actually expects.

One more thing worth confirming explicitly: this is safe on a completely fresh checkout with no `build/` output anywhere. A `paths` substitution whose target file doesn't exist on disk just falls through to normal `node_modules`/package.json-exports resolution instead of hard-failing — we verified this directly by deleting `packages/db/build` entirely, running `tsc -p services/api/tsconfig.emit.json --noEmit`, getting 0 errors, and confirming via `--traceResolution` that it fell through to the normal `node_modules` lookup as expected. So think of this override as a fast path that kicks in when `build/` happens to be fresh, not a hard requirement for the build to work at all.

**The measured win:** about 13% faster on `tsc -p tsconfig.emit.json --noEmit` for `services/api` — 11.6s down to 10.1s average, A/B'd, 2 runs each.

### The trap re-appears at every `@hominem/api/types` consumer, and this is the fix that actually explains "`dev:types` feels slow"

The `services/api/tsconfig.emit.json` override above only fixes the trap for `services/api`'s *own* compile. It doesn't do anything for anyone consuming `@hominem/api/types` (the Hono `AppType`) downstream — and that list is `packages/rpc`, `apps/web`, `apps/omiro`, and, at the time this was originally written, `apps/finance` too. The reason it doesn't help them: the emitted `services/api/build/rpc/app.d.ts` doesn't inline the types it references. It preserves them as literal `import("@hominem/career-services").JobImportErrorCode`-style type queries instead. TypeScript re-resolves that module specifier independently for *every* program that loads the `.d.ts`, using that program's own module resolution rules — so each downstream consumer walks straight into the exact same `injectWorkspacePackages` trap all over again, this time for `@hominem/career-services`, `@hominem/ai`, `@hominem/db`, and `@hominem/finance-services`. We confirmed this with `--generateTrace`: `apps/web`'s trace, for instance, showed `findSourceFile` on the injected, `build/`-less copies of `career-services/src/index.ts` and `career-services/src/resume.ts` costing about 560ms each — and that cascaded further, into the injected copy of `packages/chat` too, since the injected `career-services` copy needs its own peer-isolated `chat` to resolve its own internal import.

**The fix** is the same `paths` override as before, just duplicated into every consumer of `@hominem/api/types`: `packages/rpc/tsconfig.json`, `apps/web/tsconfig.json`, `apps/omiro/tsconfig.json` — each pinning `@hominem/db`, `@hominem/career-services`, `@hominem/ai`, and `@hominem/finance-services` straight to their `build/*.d.ts`. (`packages/rpc` already had a `@hominem/chat` override from the zero-references reconciliation above, so it didn't need a fifth entry. The apps don't need a `@hominem/chat` override at all, since `packages/chat` is composite and already in their `references` graph — the `career-services` fix is what removes the cascade into its injected copy.) It's worth being clear that none of these four packages is a real dependency of the apps, or of `packages/rpc` — the override exists purely because their types leak in through the `AppType` boundary, not because anyone actually imports them. Same "where you put this matters" caveat as `services/api` applies here too, though with a happier outcome: none of `apps/web`/`apps/omiro`'s bundlers (Vite, Metro) read these `tsconfig.json` files for runtime module resolution of a package that has no real `import` statement anywhere in the app's source, so there's no bundler-breakage risk the way there was for `services/api`'s rolldown build. We confirmed that by running each app's typecheck clean and checking for new errors — there weren't any.

`apps/finance` used to be on this list too, needing all four overrides. It no longer is — see "Per-domain route splitting" below, where `apps/finance` stopped consuming `@hominem/api/types` at all and dropped down to needing just the one override its own narrower domain type actually embeds (`@hominem/finance-services`).

**This next measured win is the one that actually matters for "`pnpm dev:types` feels slow,"** since it's tsserver's `open` cost we're measuring, not a one-off `tsc --noEmit` run. Via `scripts/bench-tsserver.mjs` (3 runs each, `openToProjectLoad`):

| consumer       | before  | after  | change                                     |
| -------------- | ------- | ------ | ------------------------------------------ |
| `apps/web`     | 14287ms | 6207ms | -57%                                       |
| `apps/omiro`   | 7033ms  | 4864ms | -31%                                       |
| `packages/rpc` | 3814ms  | 3434ms | -10%                                       |
| `services/api` | 4917ms  | 4149ms | -16% (residual noise; already fixed above) |

`packages/rpc`'s own `tsc --noEmit` (not tsserver `open` this time) also dropped, from roughly 2.9s to 2.1s (0 errors, 3 runs each), once these four specifiers were added on top of the `@hominem/chat` fix from the zero-references reconciliation earlier. Which means that earlier "no measurable speedup" note about the `@hominem/chat` fix was accurate as far as it went, but incomplete — the `@hominem/chat` override alone couldn't move `packages/rpc`'s number, because `@hominem/api/types`' *other* embedded imports (`db`, `career-services`, `ai`, `finance-services`) were still hitting the trap, unfixed, the whole time.

## Per-domain route splitting: avoiding the root `AppType` entirely

Everything above is about fixing the `injectWorkspacePackages` trap for consumers that genuinely need the root `@hominem/api/types` — but where it's possible, the cheaper fix is to just not depend on the root type at all. Here's the shape of the problem: `rpcRoutes` (`services/api/src/rpc/app.ts` — this composition used to live in a separate `routes/economy.ts`, since folded directly into `app.ts`) mounts 15 different domains — career, chats, collections, enhance, files, finance, inbox, memory, notes, people, personal, tasks, telemetry, usage, voice — into one big Hono chain, and `@hominem/api/types` is `typeof rpcApp` over that entire thing. So a consumer that only ever calls one domain's endpoints still forces tsserver to structurally resolve all 15 domains, just to confirm that the one it cares about exists on the object.

The good news is `services/api/package.json` already exports each domain's router individually — `./finance` maps to `financeRoutes`, `./career` maps to `careerRoutes`, one export per domain file under `services/api/src/rpc/routes/` — each with its own scoped `AppType`. `apps/career`'s `app/lib/api.server.ts` was already built on the narrow `@hominem/api/career` export, `hc<typeof careerRoutes>`, rather than the root type. `apps/finance` wasn't so lucky: both its SSR client (`app/lib/api.server.ts`) and its browser client (`app/lib/api/client.ts`, via `@hominem/rpc`'s shared `HonoClient`) were built on the root `@hominem/api/types`, even though the app only ever calls `.api.finance`.

**We fixed this for `apps/finance`**, on both the SSR and browser paths:

- `app/lib/api.server.ts` used to do `hc<AppType>(HOMINEM_INTERNAL_API_URL)` and then index into `.api.finance`. It's now `hc<typeof financeRoutes>(new URL('/api/finance', HOMINEM_INTERNAL_API_URL))`, importing `financeRoutes` directly from `@hominem/api/finance`.
- The browser client needed something more than a type swap — a real structural split. `packages/rpc`'s shared `HonoClient`/`useApiClient()`/`HonoProvider`, which is built on the root `AppType`, is genuinely needed by `apps/web` and `apps/omiro`, since those two really do call multiple domains through one shared client. So that shared infrastructure was left alone, and instead:
  - `packages/rpc/src/finance.ts`'s `FinanceClient` type changed from `HonoClient['api']['finance']` (derived from the root type) to `ReturnType<typeof hc<typeof financeRoutes>>` (derived directly from `@hominem/api/finance`), with a new `createFinanceApiClient()` factory added alongside it. Both stay framework-agnostic, and both still live at the same export path, `@hominem/rpc/finance`.
  - The React Context/Provider/hook that wraps the client — `FinanceClientContext`, `useFinanceApiClient()`, `FinanceHonoProvider` — moved out of `packages/rpc` entirely and into `apps/finance/app/lib/api/provider.tsx`. `apps/finance` was the only consumer of the finance-scoped client, so that binding has exactly one caller, and it makes more sense living next to that caller than in shared package space.
- `apps/finance/tsconfig.json` dropped the `@hominem/api/types`, `@hominem/db`, `@hominem/career-services`, and `@hominem/ai` `paths` overrides entirely, since nothing in the app references the root type anymore. It kept `@hominem/api/finance` (the narrow type) and `@hominem/finance-services` (the one package `finance.d.ts` itself embeds by literal reference — the same `injectWorkspacePackages` trap as above, just down to one specifier instead of four).

**The measured win** (via `scripts/lib/tsserver-client.mjs`, opening `apps/finance/app/lib/api/client.ts`, 3 runs each, git-stashed for the "before" state):

| metric                | before  | after   | change |
| --------------------- | ------- | ------- | ------ |
| `open`→`projectLoad`  | ~2869ms | ~2505ms | -13%   |
| `geterr`              | ~331ms  | ~177ms  | -46%   |

`geterr` — the diagnostics pass, which scales with how much of the type graph actually needs checking — is the cleaner signal of the two here, and it lines up with what we'd expect: the file's dependency footprint shrank from all 15 `rpcRoutes` domains down to just `finance`. We also checked for regressions on `apps/career`, `apps/web`, and `apps/omiro`'s typecheck and found none — unsurprising, since `packages/rpc`'s changes were purely additive and nothing was removed from the shared root-`AppType` path they still rely on.

**Worth calling out as unfinished business, not a guess:** `apps/web` and `apps/omiro` don't need the root type's full 15 domains either. `apps/web` only calls `chats`, `collections`, `memory`, `notes`, `tasks`, and `usage` — 6 of 15. `apps/omiro` calls `chats`, `enhance`, `files`, `inbox`, `notes`, `people`, `tasks`, and `voice` — 8 of 15. Neither touches `career` or `finance` at all. We confirmed both of those domain lists by grepping each app's actual `client.api.*` call sites against `rpcRoutes`'s full domain list, so this isn't speculation — it's a real, quantified opportunity. It's just a bigger lift than `apps/finance`'s fix was (composing several domain routers into one app-scoped client type, rather than pointing at a single existing narrow export), and we didn't attempt it in this pass. Flagged here as a follow-up.

## Explicit return types on generic callbacks: when it helps, when it doesn't

Here's a pattern that's cheap to fix once you know to look for it: an unannotated callback passed to a generic higher-order function forces TypeScript to infer the callback's full return shape bottom-up first, and only then check that inferred shape against the HOF's own signature. That two-step process is often one of the single most expensive expressions in a file. Give the callback an explicit return-type annotation, though, and it gets a contextual type upfront — skipping the bottom-up inference step entirely.

**We confirmed real fixes from this** (measured via `--generateTrace`, before and after):

- `upgradeWebSocket((c): WSEvents<WebSocketLike> => {...})` in `finance.import.websocket.ts` — the callback's own `checkExpression` cost dropped from ~780ms to ~6ms.
- `runInTransaction(async (trx): Promise<NoteRecord> => {...})` (×2) in `notes.service.ts` — `createNote`'s callback-inference cost dropped by about 765ms.

But this trick only fixes bottom-up inference of *your own* code — it doesn't help when the expensive part is baked into a third-party library's own type declaration instead:

- `better-auth`'s `mcp()` plugin factory is typed as `(options: McpOptions) => ReturnType<typeof oauthProvider>` — every call instantiates that computed return type regardless of what the caller does with it. We tried wrapping the call site in an explicit `satisfies BetterAuthPlugin` annotation anyway, just to check, and it actually made the measured cost marginally *worse*. Reverted.
- Even the `upgradeWebSocket` fix above only ate the callback's own inference cost — the *outer* `.get('/ws', upgradeWebSocket(...))` call still costs about 980ms in `checkVariableDeclaration`. That's TypeScript resolving `UpgradeWebSocket`'s overloaded call signature against Hono's own overloaded `.get()` — both libraries' own type declarations doing their thing, and nothing fixable from the call site.

**The rule of thumb we'd take away from this:** if the expensive node is a call to *your own* function whose return type TypeScript has to infer, go ahead and annotate it. But if it's a call into a third-party factory whose *own* declared return type is what's expensive — computed via `ReturnType<...>`, heavy overloads, deep generics — annotating the call site won't change what that factory's type declaration is already making TypeScript compute. Worth verifying with a trace before spending time on it either way.

## Splitting a large Hono route chain: we tested it, no compile-time win

`services/api/src/rpc/routes/career.ts` used to be one 554-line file chaining 48 `.get`/`.post`/`.patch`/`.delete` calls onto a single `Hono` instance — the largest such chain anywhere in the codebase (for comparison, `finance.ts`'s largest sub-router, `finance.accounts.ts`, tops out at 21). We had a reasonable-sounding hypothesis here, following `finance.ts`'s own precedent — it's an 11-way `.route()` composition of small sub-routers, with a comment claiming "type-checking is blazing fast, explicit types, no inference." The theory: Hono's fluent builder re-checks the accumulated route type on every chained call, so splitting a large chain into smaller `.route()`-composed pieces should cut down total check time.

**We tested it directly, and it doesn't hold at this scale.** A rigorous 3-run A/B, git-restoring the original monolithic file between measurements, gave us:

|                                             | run 1 | run 2 | run 3 | avg    |
| ------------------------------------------- | ----- | ----- | ----- | ------ |
| monolithic (48 chained calls, 1 file)       | 12.0s | 11.9s | 11.4s | 11.76s |
| split (11 sub-routers, `.route()`-composed) | 12.2s | 11.9s | 11.7s | 11.96s |

That's statistically indistinguishable — if anything the split came out marginally slower. We dug into why, and it turns out the `.route()` composition/merge layer (`app.ts`, which composes all 15 domains into `rpcRoutes` and then wraps that as the root `rpcApp` — originally split across a separate `routes/economy.ts` plus `app.ts`, since consolidated into one file) is cheap to begin with — 148ms + 116ms out of roughly 8000ms total, about 3.3% of a full `services/api` typecheck. It was never the bottleneck to begin with, so splitting it couldn't have moved the number much either way. The total type-level work needed to arrive at the same merged `AppType` looks roughly conserved whether it comes from one long chain or several short ones composed together.

**We kept the split anyway** (`career.ts` → `career.imports.ts`, `career.profile.ts`, `career.applications.ts`, and so on, mirroring `packages/db`'s own repository split) — just not for a speed reason. It's better for file organization, and it raises the ceiling before things get genuinely bad: the pathological Hono chain-checking blowups reported in the wild show up around 100–300+ routes in one file, well past today's 48, so this split buys headroom against that scenario later. Just don't go into a route-file split expecting a measurable compile-speed win as a general technique — verify with a trace first if that's the goal.

## The `DbHandle` union: a one-time, unavoidable cost

The single most expensive individual expression we found anywhere in `services/api`'s typecheck — about 994ms — was `NoteRepository.create(trx, {...})` in `notes.service.ts`. That was surprising at first glance, because `NoteRepository.create`'s own signature is completely unremarkable: `create(handle: DbHandle, input: CreateNoteInput): Promise<NoteRecord>`, all concrete types, already resolved through `packages/db`'s built `.d.ts`. Nothing about it screams "expensive."

It isn't fixable the way it looks, though. Every *other* `NoteRepository.xxx(trx, ...)` call in that same file — `syncFiles`, sitting right after `create`, passing the exact same `trx` through the exact same `DbHandle`-typed parameter — costs 0.3ms, not ~994ms. The only explanation that fits: `DbHandle = Kysely<Database> | Transaction<Database>` is a union of two classes, each one wrapping `Database`, which is Kysely's full schema type — 77 tables, 1399 lines of declarations. The *first* time TypeScript has to structurally compare two classes shaped like that within a single compilation, it's expensive. Every later comparison in the same program just reuses that cached result for free. `notes.service.ts` just happened to be the file that triggered it first.

That also means it's **not fixable by restructuring the triggering file** — the cost would just relocate to whichever file becomes "first" instead once you move things around. Actually eliminating it would mean changing `DbHandle`'s shape itself — splitting repository methods into overloads instead of a union parameter, say — across all ~11 of `packages/db`'s repositories, just to test whether it helps. That's a materially bigger, riskier change than anything else in this document, and we didn't attempt it.

## Kysely query-builder chains: real cost, impractical to hand-fix

A handful of `application/*.service.ts` files — `calendar.service.ts`, `finance-mcp.service.ts`, `media.service.ts`, `tags.service.ts`, each around 50–100ms — have the same *shape* of issue as the HOF-callback case above: an unannotated helper function returns a raw `db.selectFrom(...).join(...).select([...]).where(...)` chain, which then gets chained further at the call site, forcing bottom-up inference of the whole thing.

Unlike `runInTransaction` above, we didn't fix this one. Kysely's `SelectQueryBuilder<...>` return types are enormous, effectively-generated-looking generics — table aliases crossed with selected-column shape crossed with join state — and hand-writing an accurate annotation for that is genuinely impractical. Get it even slightly wrong and you risk silently narrowing or breaking the type. The combined cost across all four files (roughly 300–400ms total) just doesn't justify that risk, so we left it alone.

## Duplicate type shapes

`scripts/find-duplicate-shapes.mjs` walked all 993 source files under `packages/`, `services/`, and `apps/`, and found 447 distinct structural shapes with at least 2 members — 16 of which turned out to be declared more than once, either under a different name or in a different file. Once we triaged those 16, two categories fell out:

- **Coincidentally identical, not actually duplicates** — cases like a db-internal record type and an RPC wire type that just happen to match today (`AIUsageSummaryRecord`/`UsageSummary`, `AIUsageTimeseriesRecord`/`UsageTimeseriesPoint`, and `MonthlyUsageStatus` declared twice). These should stay separate, with an explicit mapper between them — merging a persistence type with a wire type just because they're structurally identical today is exactly the kind of coupling that breaks silently the moment either side changes independently of the other.
- **Genuine copy-paste, safe to consolidate** — `ProcessedFile`/`UploadedFile` were declared identically in both `apps/web` and `apps/omiro`. Both apps were already mapping the real RPC wire type (`UploadedFileDto`) into this same client-normalized shape via their own `toUploadedFile()`, so we consolidated it into `packages/rpc/src/types/files.types.ts` — deliberately kept separate from `UploadedFileDto` — which removed the duplicate without touching the wire/client boundary at all.

Worth rerunning `scripts/find-duplicate-shapes.mjs` periodically rather than trusting this list to stay accurate — it's read-only and takes about 8s on the full tree, and the actual set of duplicates will drift as the codebase grows.

## The `tsc --noEmit` incremental cache: a correctness bug we traded away on purpose

Everything above is about making real type-checks faster. This section is about a case where we found the opposite problem — `tsc`'s own incremental cache making a type-check *cheaper than it should be*, by silently skipping work it needed to do — and chose to give back some of that speed on purpose. See [ADR 0001](adr/0001-clear-tsbuildinfo-before-typecheck.md) for the full writeup; this is the summary in context.

Every package on the shared `tsconfig.profiles/package.json` profile (everything except `services/ori` and `services/deepeval`) sets `composite: true`, which forces `incremental: true` and a persisted `./.cache/tsconfig.tsbuildinfo` per package. We hit this directly: after fixing a real type error in `packages/db`, `pnpm -w typecheck` reported all 34 tasks green — including `packages/ai`, which had its own genuine, unrelated type error (`RecordAIUsageEventInput.metadata: Record<string, unknown>` isn't assignable to the `Json` type `packages/db`'s repositories actually expect). Turborepo correctly re-invoked `@hominem/ai`'s `tsc --noEmit` as a cache miss, but `tsc` itself consulted its own stale `.tsbuildinfo` and didn't re-check `ai-usage.ts` against `@hominem/db`'s freshly-rebuilt `build/index.d.ts`. Deleting `packages/ai/.cache` and rerunning surfaced the error immediately — and running `turbo run typecheck --force` after clearing every package's `.cache`/`*.tsbuildinfo` repo-wide reproduced the same result everywhere. That's a real, reproducible false-pass in a check whose entire job is to not do that.

**The fix:** every affected package's `typecheck` script now runs `rm -rf .cache && tsc --noEmit` (prefixes/suffixes like `react-router typegen &&` or `-p tsconfig.json` preserved). `build` scripts are untouched — a stale build-time cache doesn't produce this same silent-pass failure mode, since build output is still content-addressed and consumed downstream via the `paths` overrides described above.

**The cost, measured** (cold vs. warm-and-unchanged `tsc --noEmit`, i.e. exactly the reuse this fix gives up):

| package | cold | warm (unchanged) | reuse lost |
|---|---|---|---|
| `services/api` | 5.30s | 5.08s | ~0% (noise) |
| `apps/omiro` | 5.10s | 4.63s | ~9% |
| `packages/rpc` | 1.79s | 0.95s | ~47% |
| `packages/db` | 1.46s | 0.57s | ~61% |
| `packages/utils` | 0.57s | 0.50s | ~12% |

Worth noting for anyone reading this alongside the rest of the doc: `services/api`, the package everything else here spends the most effort on, shows essentially zero cost from this fix. Its time is dominated by the one-time `DbHandle` union comparison and the Kysely chains documented above — not by incremental reuse — so this fix and everything above it are complementary, not in tension.

This cost only lands on invocations Turborepo already decided were necessary (its own content-hash task cache still skips the script entirely, at zero cost, when nothing relevant changed), never applies to CI (which always starts cold anyway), and has zero effect on `pnpm dev:types`/tsserver/editor responsiveness — that path is `scripts/watch-types.sh`, a persistent process built on the live-redirect model described above, and it never touches these per-package `.tsbuildinfo` files at all.

We considered a more surgical fix — hash each package's direct workspace dependencies' `build/**/*.d.ts` output and only clear `.cache` when that hash actually changes, preserving `tsc`'s incremental reuse for pure same-package edits — but didn't build it. It's real, nontrivial cache-invalidation logic to get right and maintain, for a win bounded to a handful of `rpc`/`db`-sized packages. Flagged as a possible follow-up if that cost is ever actually felt during normal iteration, rather than just in this one-off benchmark.

## DO / DO NOT, distilled from the references

The findings above feed three other documents — `AGENTS.md`, `docs/type-system.md`, and [ADR 0001](adr/0001-clear-tsbuildinfo-before-typecheck.md) — which state the same conclusions as rules rather than investigation narrative. Collected here so they don't get silently re-litigated in either direction.

**DO**

- Resolve every dependency of a `typeof app`-style inference-boundary package (`services/api`, `packages/rpc`) via plain `paths` to `build/*.d.ts` — never `references`.
- Put an `injectWorkspacePackages` `paths` override in a type-check-only config (e.g. `tsconfig.emit.json`), never in a `tsconfig.json` a bundler also reads for runtime resolution.
- Point a new package's `paths` alias at another package's emitted `.d.ts`, never at its source (`docs/type-system.md` D1/D3).
- Give your own unannotated callback passed to a generic higher-order function an explicit return-type annotation when a trace shows it's expensive.
- Clear `.cache`/`tsbuildinfo` before `typecheck` on any package using the shared composite profile — `tsc`'s own incremental cache can silently mask a cross-package type error (ADR 0001).
- Hardcode declaration emit's `outDir` — never assemble it via CLI flags or a `rootDir` dance.
- Verify a claimed speedup with `--generateTrace` or a real tsserver session before writing it down. Several plausible-sounding fixes in this document measured to zero.

**DO NOT**

- Do not add a `references` entry — not even one, not even to a small, stable package — to a package that infers an exported type across its own module boundary (`services/api`, `packages/rpc`). The zero-references rule exists to hold as the type's shape evolves, not just for its shape today.
- Do not add a `workspace:*` dependency for a type-only import — pnpm/turbo build the task graph from `package.json` edges with no notion of `import type`, so it drags a whole extra package into every consumer's build/test/lint/typecheck scope.
- Do not expect splitting a large Hono route chain into `.route()`-composed sub-routers to speed up typechecking — measured statistically indistinguishable at 48-route scale. Split for file-size/organization reasons only.
- Do not expect an explicit return-type annotation at a call site to fix inference cost baked into a third-party library's own type declaration (`ReturnType<...>`, heavy overloads) — it doesn't reach that cost, and measured marginally *worse* once.
- Do not assume a `paths` override safe for `tsc` is safe for everything else that reads the same tsconfig — a bundler needing the runtime `exports` condition is a real, previously-hit breakage.
- Do not assume `assumeChangesOnlyAffectDirectDependencies` measurably speeds up incremental rechecks — a targeted benchmark showed no effect. It's kept as a deliberate, already-documented tradeoff, not because it was reproven.

## Numbers, for reference

Before any of the fixes in this document: a full cold monorepo typecheck took about 24.3s — the composite `tsc -b` build was ~7.7s, `services/api` alone was ~11–14s, and `packages/rpc`'s emit was ~1.6s. From the callback-annotation fixes alone, `services/api`'s own `checkSourceFile` total dropped from ~8.29s to ~7.57s, on top of the ~13% win on `tsc -p tsconfig.emit.json` from the `paths`-override fix described above. Separately — and this is the number that actually governs how `pnpm dev:types`/editor responsiveness *feels*, as opposed to any `tsc --noEmit` CI number — tsserver's `open` cost dropped 57% for `apps/web` (14287ms → 6207ms) and 31% for `apps/omiro` (7033ms → 4864ms) once the same `injectWorkspacePackages` `paths`-override fix got extended to every consumer of `@hominem/api/types`, not just `services/api` itself (see "the trap re-appears at every consumer" above). `apps/finance` ended up with a different, larger-in-kind fix on top of all that: dropping the root `@hominem/api/types` dependency entirely in favor of the narrow `@hominem/api/finance` export (see "Per-domain route splitting" above) — 13% faster `open`, 46% faster `geterr`. None of this makes the monorepo feel instantaneous, and it shouldn't — a project this size, doing real structural inference across roughly 1000 files, legitimately takes several seconds. What these fixes removed was identifiable waste, not the inherent cost of the type system doing its actual job.
