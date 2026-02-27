# ADR: CLI v2 Command Runtime

## Decision
Adopt a single, typed command graph runtime (`src/v2`) with lazy command module loading.

## Rationale
- Deterministic automation behavior with explicit error/output contracts
- Reduced cold-start overhead via deferred domain loading
- Elimination of mixed framework ambiguity

## Consequences
- Commands must be declared in `registry.ts`
- Command modules must use `createCommand(...)`
- Help rendering is generated from route metadata
