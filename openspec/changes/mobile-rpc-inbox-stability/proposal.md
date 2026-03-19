# Mobile RPC Inbox Stability

## Why

The mobile workspace currently shows repeated `internal_error` and intermittent `Network request failed` errors during startup and inbox rendering. This blocks manual QA of the mobile unified workspace and makes the app feel unreliable even when the API server is healthy.

## What Changes

- isolate the failing mobile startup and inbox RPC calls
- fix the server and client contract/runtime issues causing `500 internal_error` responses
- improve the mobile RPC handling for transient network failures during inbox startup
- ensure the mobile inbox degrades gracefully instead of spamming repeated runtime errors

## Impact

- restores reliable manual testing of the mobile unified workspace
- reduces noisy runtime errors in development
- gives the mobile app clearer behavior when the API is reachable but a specific route fails
- keeps the fix scoped away from the active design-system governance work
