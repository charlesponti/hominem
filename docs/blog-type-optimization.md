# How We Made TypeScript Compilation 49% Faster — and We're Not Done Yet

Type safety is a feature. But poorly structured types are a tax — paid on every build, every save, every CI run. This is the story of how we set out to clean up our type architecture in `hono-rpc`, and what we've measured so far.

## The Problem: Duplicated Types Everywhere

Before we started, our API layer had a familiar but expensive pattern: types defined in the database schema, then manually re-declared in API response types, then mapped through serialization functions that bridged the two. We had 13 of these serialization functions, roughly 182 explicit type definitions (many with near-identical shapes), and `any` annotations scattered across the codebase — 13 in total.

The cost wasn't just maintainability. TypeScript was paying for the duplication too. Every redundant type definition is extra work for the compiler, and it adds up.

## Phase 1: Type Deduplication

Our first goal was straightforward: stop defining the same shape twice. Instead of maintaining parallel type hierarchies, we wanted to have one source of truth — the database schema — and let the API layer derive its types from that directly.

We started with two modules: Chats and Events.

The results after those two modules alone were significant:

- **Compilation speed (warm cache): 49% faster**
- **126 lines of code removed**
- **3 serialization functions deleted**
- **`any` usage reduced from 13 to 1**

That last number matters. One remaining `any` exists for external library compatibility — everything else has been properly typed.

## What "Deduplication" Actually Means in Practice

The pattern we eliminated looks like this:

```typescript
// Before: manual bridge between DB and API
function serializeChat(obj: any): ChatResponse {
  return {
    id: obj.id,
    title: obj.title,
    createdAt: obj.created_at.toISOString(),
    // ...17 more fields
  }
}
```

The problem isn't just verbosity. Every field mapping is a potential bug. Every `any` parameter is a type hole. And the compiler has to reason about two separate type definitions where one would do.

After deduplication, routes return database results directly, with types inferred from the schema. One definition. Zero drift.

## Where We're Headed

Phase 1 currently covers 40% of our modules — 2 of 5. When we complete Notes, Finance, and Goals, we project:

- **67% faster warm-cache compilation**
- **300 total lines removed**
- **12 serialization functions eliminated**

After that, Phase 2 targets complete elimination of any remaining serialization functions, and Phase 3 will leverage Hono RPC's automatic type inference to further reduce the amount of type code we maintain manually.

Our target end state: warm cache builds under 4 seconds, zero serialization functions, and `any` usage limited to a single external library boundary.

## Why This Matters

Faster TypeScript builds aren't just a developer comfort improvement — they're a feedback loop improvement. The faster the compiler responds, the tighter the iteration cycle. At 67% faster compilation, what was a 12-second cold build becomes 4 seconds. That's the difference between waiting and flowing.

Beyond speed, the structural simplification pays ongoing dividends. Fewer type definitions means fewer places for types to diverge. Fewer serialization functions means fewer mapping bugs. And eliminating `any` means the type system is actually doing its job everywhere it should.

We'll publish updated numbers as we complete the remaining modules. The benchmark tooling is in place — all that's left is the work.
