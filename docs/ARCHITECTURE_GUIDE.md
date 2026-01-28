# Architecture Documentation Guide

Welcome to the Hominem architecture documentation. This guide explains how the three core architecture documents work together and how to navigate them.

## The Three Pillars of Modern API Architecture

The Hominem monorepo has evolved through three architectural optimizations, each addressing a different layer:

### 1. **API Response Architecture** — [API_ARCHITECTURE.md](API_ARCHITECTURE.md)

**What it addresses:** The *shape* of API responses and error handling patterns

**Key Insight:** Direct REST responses are simpler and more maintainable than wrapper types.

**Journey:**
- Phases 1-3: Built sophisticated `ApiResult<T>` discriminated union pattern
- Phase 4: Applied to real code, discovered wrapper checks were creating friction
- Decision: Pivoted to direct REST responses with HTTP status codes for error semantics

**Who should read this:**
- Architects making API design decisions
- Backend engineers building new endpoints
- Anyone wanting to understand why our API responses look the way they do

**Main takeaway:** REST is simpler. Start with industry standards, add abstraction only when needed.

---

### 2. **Framework Implementation** — [HONO_RPC_IMPLEMENTATION.md](HONO_RPC_IMPLEMENTATION.md)

**What it addresses:** The *framework* and *routing* used to build the API

**Key Insight:** Explicit types and lightweight frameworks enable better performance than complex type inference systems.

**Journey:**
- Evaluated tRPC for type safety
- Migrated to Hono RPC for better performance (6s → <1s type-checking)
- Established patterns for direct types without wrapper overhead

**Who should read this:**
- Backend engineers implementing API routes
- Frontend engineers consuming API endpoints
- Anyone building new features that need API integration
- Developers wanting practical examples of route implementation

**Main takeaway:** Use Hono RPC with explicit types. Type inference is expensive; explicit types are fast.

**Code Examples:** Full working examples for hooks, components, error handling, and migrations.

---

### 3. **Type System Architecture** — [TYPES_FIRST_ARCHITECTURE.md](TYPES_FIRST_ARCHITECTURE.md)

**What it addresses:** The *type definitions* and their *computation* strategy

**Key Insight:** Types should be explicit contracts, not derived from code.

**Journey:**
- Current system: TypeScript infers types from route handlers (expensive)
- Problem: Each app re-computes the same types independently
- Solution: Define types once, reference everywhere

**Who should read this:**
- TypeScript experts optimizing build performance
- Architects planning scalable type systems
- Anyone interested in type system performance

**Main takeaway:** Make types the source of truth. Routes consume types; types aren't inferred from routes.

**Performance Impact:** 75s type-checking → 1.4s (98% improvement)

---

## How They Work Together

```
┌────────────────────────────────────────────────────────┐
│ Application Developer (rocco, notes, finance)          │
│                                                         │
│ "I want to call an API endpoint and get typed data"   │
└────────────────┬─────────────────────────────────────┘
                 │
        ┌────────┴─────────┐
        ▼                  ▼
┌──────────────────┐ ┌──────────────────────┐
│ 1. API Response  │ │ 2. Route Handler     │
│    Structure     │ │    Implementation    │
│                  │ │                      │
│ Uses: Direct     │ │ Uses: Hono RPC       │
│ REST, no         │ │ framework with       │
│ wrappers         │ │ explicit types       │
│                  │ │                      │
│ Result: Clean    │ │ Result: Fast         │
│ data shapes      │ │ routing, clear       │
│                  │ │ contracts            │
└────────┬─────────┘ └──────────┬───────────┘
         │                      │
         └────────────┬─────────┘
                      ▼
         ┌──────────────────────────┐
         │ 3. Type System           │
         │                          │
         │ Uses: Explicit types,    │
         │ centralized definitions  │
         │                          │
         │ Result: Sub-second type  │
         │ checking, great DX       │
         └──────────────────────────┘
                      │
         ┌────────────┴─────────────┐
         ▼                          ▼
    ┌─────────────┐          ┌──────────────┐
    │ Fast Build  │          │ Type Safety  │
    │ Process     │          │ Everywhere   │
    └─────────────┘          └──────────────┘
```

## Navigation Guide

### By Role

**I'm a Backend Engineer**
1. Start with [HONO_RPC_IMPLEMENTATION.md](HONO_RPC_IMPLEMENTATION.md#best-practices-for-new-routes) — "Best Practices for New Routes" section
2. Review [API_ARCHITECTURE.md](API_ARCHITECTURE.md#working-with-hono-rpc) — "Working with Hono RPC" for patterns
3. Reference [TYPES_FIRST_ARCHITECTURE.md](TYPES_FIRST_ARCHITECTURE.md#type-definition-pattern) for type definition patterns

**I'm a Frontend Engineer**
1. Start with [HONO_RPC_IMPLEMENTATION.md](HONO_RPC_IMPLEMENTATION.md#migration-reference-trpc-to-hono-rpc) — shows how to use hooks
2. Review [API_ARCHITECTURE.md](API_ARCHITECTURE.md#frontend-migration-path) — "Frontend Migration Path"
3. Check [TYPES_FIRST_ARCHITECTURE.md](TYPES_FIRST_ARCHITECTURE.md#application-usage-no-inference) — consuming types directly

**I'm an Architect**
1. Start with [API_ARCHITECTURE.md](API_ARCHITECTURE.md#executive-summary) — strategic decisions
2. Review [HONO_RPC_IMPLEMENTATION.md](HONO_RPC_IMPLEMENTATION.md#overview) — understand framework choices
3. Deep dive into [TYPES_FIRST_ARCHITECTURE.md](TYPES_FIRST_ARCHITECTURE.md) — long-term scalability

**I'm Onboarding & Want to Understand Everything**
1. Read [API_ARCHITECTURE.md](API_ARCHITECTURE.md) — 15 min, big picture
2. Read [HONO_RPC_IMPLEMENTATION.md](HONO_RPC_IMPLEMENTATION.md) — 20 min, practical patterns
3. Skim [TYPES_FIRST_ARCHITECTURE.md](TYPES_FIRST_ARCHITECTURE.md) — reference as needed

### By Question

**"Why does our API look the way it does?"**
→ [API_ARCHITECTURE.md](API_ARCHITECTURE.md#part-4-the-pivot---phase-4-execution) — The Pivot

**"How do I build a new endpoint?"**
→ [HONO_RPC_IMPLEMENTATION.md](HONO_RPC_IMPLEMENTATION.md#best-practices-for-new-routes) — Best Practices

**"How do I call the API from React?"**
→ [HONO_RPC_IMPLEMENTATION.md](HONO_RPC_IMPLEMENTATION.md#migration-reference-trpc-to-hono-rpc) — Code Examples

**"Why is type-checking slow?"**
→ [TYPES_FIRST_ARCHITECTURE.md](TYPES_FIRST_ARCHITECTURE.md#part-1-the-problem) — The Problem

**"How do I define types for a new domain?"**
→ [TYPES_FIRST_ARCHITECTURE.md](TYPES_FIRST_ARCHITECTURE.md#type-definition-pattern) — Type Definition Pattern

**"Where's the implementation guide?"**
→ [TYPES_FIRST_ARCHITECTURE.md](TYPES_FIRST_ARCHITECTURE.md#part-4-implementation-plan) — Implementation Plan

---

## Document Sizes & Read Time

| Document | Size | Read Time | Depth |
|----------|------|-----------|-------|
| [API_ARCHITECTURE.md](API_ARCHITECTURE.md) | 39 KB | 20-30 min | Deep (12 parts) |
| [HONO_RPC_IMPLEMENTATION.md](HONO_RPC_IMPLEMENTATION.md) | 23 KB | 15-20 min | Practical (patterns + examples) |
| [TYPES_FIRST_ARCHITECTURE.md](TYPES_FIRST_ARCHITECTURE.md) | 38 KB | 25-35 min | Comprehensive (12 parts) |

---

## Key Principles Across All Documents

1. **Explicit > Inferred**
   - Explicit types are faster than inferred
   - Explicit patterns are clearer than hidden conventions

2. **Simple > Perfect**
   - REST is simpler than wrapper abstractions
   - Direct implementations are simpler than complex frameworks
   - Explicit types are simpler than computed ones

3. **Pragmatism > Purity**
   - When theory meets practice, listen to practice
   - The API_ARCHITECTURE pivot shows willingness to change based on evidence
   - Better to ship working code than pursue perfect architecture

4. **Type Safety Everywhere**
   - Zero `any` types in API boundaries
   - 100% type coverage for success and error paths
   - Types as contracts, not suggestions

5. **Performance Matters**
   - Every millisecond of type-checking adds up in a monorepo
   - Fast local development enables rapid iteration
   - Type-checking performance is part of developer experience

---

## Quick Reference

### Common Patterns

**Define an Input Type:**
```typescript
// types/places.types.ts
export type PlaceCreateInput = {
  name: string;
  location: { lat: number; lng: number };
};
```

**Define an Output Type:**
```typescript
export type PlaceCreateOutput = {
  id: string;
  name: string;
  location: { lat: number; lng: number };
};
```

**Create a Route:**
```typescript
// routes/places.ts
.post('/create', async (c) => {
  const input = await c.req.json<PlaceCreateInput>();
  const result = await service(input);
  return c.json<PlaceCreateOutput>(result);
})
```

**Use in React:**
```typescript
// hooks/use-places.ts
export function usePlaceCreate() {
  return useMutation<PlaceCreateOutput, Error, PlaceCreateInput>({
    mutationFn: (input) => client.places.$post({ json: input }),
  });
}
```

---

## Updates & Maintenance

These documents are **living documentation**. As the architecture evolves:

- **When adding new endpoints:** Update examples in [HONO_RPC_IMPLEMENTATION.md](HONO_RPC_IMPLEMENTATION.md)
- **When changing response patterns:** Update [API_ARCHITECTURE.md](API_ARCHITECTURE.md)
- **When optimizing types:** Update [TYPES_FIRST_ARCHITECTURE.md](TYPES_FIRST_ARCHITECTURE.md)
- **When there are major changes:** Update this guide to reflect new navigation paths

---

---

## Performance & Optimization Documentation

Beyond the core architecture, Hominem has dedicated performance optimization resources:

### **PERFORMANCE_ROADMAP.md** — Strategic Vision

The path to achieving <1s type-checking (95% improvement):

- **Current state**: 6.41s type-checking, 1GB memory
- **Target state**: <1s type-checking, <100MB memory
- **Phases**: Quick wins (30 min) → Architecture (1 week) → Nuclear (2 weeks)
- **Options**: Ranked from immediate wins to fundamental changes
- **Recommendations**: Detailed migration plan for Hono RPC

**Who should read**: Architects planning performance improvements, team leads evaluating options

### **PERFORMANCE_GUIDE.md** — Current Best Practices

How to optimize TypeScript performance today:

- **Internal Packages Pattern**: No path mappings, workspace resolution via Bun
- **Compiler Settings**: Incremental builds, skipLibCheck, project references
- **IDE Optimization**: VS Code settings for reduced memory and faster type-checking
- **Type-Level Patterns**: Extracting named types, simplifying unions, explicit annotations
- **Monitoring**: @ark/attest for tracking type instantiations

**Who should read**: Backend/frontend engineers writing code, developers optimizing builds

### **Connection to Architecture**

- **TYPES_FIRST_ARCHITECTURE.md** implements the type-system design that PERFORMANCE_ROADMAP recommends
- **PERFORMANCE_GUIDE.md** shows how to use optimizations available today
- Together, they create a path: current state → future optimizations → architectural transformation

---

## See Also

### Architecture & Design
- **HONO_RPC_IMPLEMENTATION.md** — Detailed patterns for building routes with Hono RPC
- **RPC_TYPE_SYSTEM_COMPLETE_GUIDE.md** — Type system reference and patterns
- **ROCCO_HONO_MIGRATION_COMPREHENSIVE.md** — Specific migration example for Rocco app
- **INVITES_RPC_REFACTOR.md** — Detailed refactoring walkthrough

### Performance & Optimization
- **PERFORMANCE_ROADMAP.md** — Strategic vision for achieving <1s type-checking
- **PERFORMANCE_GUIDE.md** — Current best practices and optimization techniques
- **TYPES_FIRST_ARCHITECTURE.md** — Type system design for maximum performance

### Case Studies & Examples
- **ROCCO_HONO_MIGRATION_COMPREHENSIVE.md** — Real-world migration of the Rocco application
- **INVITES_RPC_REFACTOR.md** — Detailed example of refactoring invites domain
