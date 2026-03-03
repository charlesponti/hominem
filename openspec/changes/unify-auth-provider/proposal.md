## Why

The repository contains two distinct authentication providers and contexts
("client" vs. "AuthContext") which leads to import mismatches and runtime
errors (`useAuthContext must be used within an AuthProvider`). This change
unifies the public API, tightens typings, and eliminates accidental imports of
the wrong provider.

## What Changes

- Consolidate exports so `@hominem/auth` exposes a single `AuthProvider` and
  shared `AuthContext` object.
- Rename and restrict the simple mock provider (`LocalMockAuthProvider`) and
  remove its accidental re-export.
- Tighten `AuthProviderProps` to only accept configuration needed by the
  client provider; remove legacy `initialSession`/`config` tolerance from
  mock context.
- Add `useSafeAuth` helper (nullable context) and document proper hook usage.
- Update all apps (notes, finance, rocco, mobile) to use the unified API.
- Refactor Hono providers and headers to avoid relying on `useAuthContext`
  throwing during SSR.

**BREAKING**: Apps must import `AuthProvider` only from `@hominem/auth` root
and may need to adjust prop names; tests using the old context helper should
import `LocalMockAuthProvider` or adjust accordingly.

## Capabilities

### New Capabilities
- `auth-unified-api`: Provide a single, type-safe authentication API for all
  apps and prevent context mismatches.

### Modified Capabilities
- `auth`: tighten requirements by enforcing a single provider export. No
  behavioral requirements change, only API shape.

## Impact

- `packages/auth` (exports, types, provider logic)
- all applications (`apps/notes`, `apps/finance`, `apps/rocco`, `apps/mobile`)
  will need minor import adjustments and prop updates
- tests across repo that use mock auth will import new mock provider names
- potential build/typecheck errors until apps are updated
- documentation and examples updated accordingly
