# Design

## Summary

This change stabilizes the mobile inbox startup path by tracing the exact RPC calls made during first render, correcting any server-side `500` causes, and tightening the mobile client’s handling of transient network failures.

## Scope

- mobile inbox startup data loads
- mobile chat session list loads used by the unified inbox
- any directly related Hono RPC route or client contract issue causing inbox startup failure

## Out of Scope

- broad design-system work
- unrelated mobile surface redesign
- unrelated API cleanup

## Root-Cause Strategy

1. identify the exact inbox startup queries
2. reproduce the failing request against the API
3. inspect server-side failure cause for any `internal_error`
4. fix the narrowest server/client contract problem
5. improve mobile-side handling for transient network failures so startup degrades cleanly

## Expected Behavior

- the mobile inbox loads without repeated `internal_error` logs when the API is healthy
- if one startup query fails, the mobile app surfaces a controlled empty/error state instead of noisy repeated failures
- transient network failures do not cascade into multiple confusing runtime errors
