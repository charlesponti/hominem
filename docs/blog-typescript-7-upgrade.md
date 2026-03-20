# TypeScript 7 Cut Our Build Times by 78%

A few weeks ago we published a post about how deduplicating types in our `hono-rpc` package made warm-cache TypeScript compilation 49% faster. We ended that post with: "the benchmark tooling is in place — all that's left is the work." We didn't expect the next big win to come from outside our codebase entirely.

We upgraded to TypeScript 7. Here's what happened.

## The Numbers

Before the upgrade, after all our Phase 1 type deduplication work was complete, our benchmarks looked like this:

- Cold cache: **11.87s**
- Warm cache: **5.76s**
- Files compiled: **2,641**
- Identifiers: **2,033,115**
- Symbols: **1,047,040**

After upgrading to TypeScript 7:

- Cold cache: **5.02s** (−58%)
- Warm cache: **1.28s** (−78%)
- Files compiled: **1,486** (−44%)
- Identifiers: **240,857** (−88%)
- Symbols: **135,367** (−87%)
- `any` usage: **0** (down from 1)

Warm cache at 1.28 seconds. For a project of this size, that's effectively instant.

## What Changed in TypeScript 7

The headline feature in TypeScript 7 is `isolatedDeclarations` becoming the default — or rather, the infrastructure built to support it. When the compiler can reason about each file's public types in isolation, it can parallelize far more of its work. The cascading effect is visible in our numbers: 88% fewer identifiers and 87% fewer symbols means the checker is doing dramatically less internal bookkeeping.

The files compiled dropping from 2,641 to 1,486 is the other part of the story. TypeScript 7's module resolution changes and smarter graph pruning mean it no longer pulls in files it doesn't actually need. Nearly half the work just... went away.

## Why Our Phase 1 Work Made This Possible

The TypeScript 7 gains didn't arrive in a vacuum. Our Phase 1 type deduplication work — removing duplicated type definitions, eliminating serialization functions, and consolidating to single sources of truth — set the conditions for the compiler to work efficiently.

When types are deduplicated and properly derived from schema, the compiler's dependency graph is simpler. There are fewer cross-file type relationships to resolve. `isolatedDeclarations` becomes practical because each file's public surface is already clean and self-contained.

Had we upgraded to TypeScript 7 without doing Phase 1 first, we would have seen smaller gains — and we likely would have hit `isolatedDeclarations` violations that required cleanup before we could benefit fully. The structural work came first, the tooling payoff followed.

## The One Number That Didn't Move (Yet)

Serialization functions went from 5 to 6 between Phase 1 and the TypeScript 7 measurement. That's new code added since our optimization sprint that hasn't been cleaned up yet. It's a small regression, but it's a signal: as the codebase grows, the old patterns want to creep back in.

Phase 2 will address this directly — systematic elimination of the remaining serialization functions. With warm cache builds now at 1.28 seconds, the iteration cycle for that refactor is as tight as it's ever been.

## What 1.28 Seconds Means in Practice

There's a qualitative difference between a 6-second typecheck and a 1-second typecheck. Six seconds is enough time to context-switch. One second is fast enough to stay in the flow.

Across a team, across a day, this compounds. It's not just developer comfort — it's tighter feedback loops, faster CI, and a codebase that's more pleasant to refactor aggressively. When checking types is cheap, you check more often. When you check more often, you catch problems earlier.

We started this effort measuring compilation in the double digits. We're now measuring it in fractions of a second. There's still work left — Phase 2 serialization cleanup, Phase 3 Hono RPC type inference — but the foundation is solid.
