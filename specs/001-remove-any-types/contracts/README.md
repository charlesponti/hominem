# Contracts

This feature removes explicit `any` and `as any` usage across the monorepo.

No new API contracts are introduced or modified as part of this work. Existing
contracts in `@hominem/hono-rpc/types` remain the source of truth.

If new or changed APIs are required to complete the type cleanup, update this
directory with the relevant contract definitions and document the changes here.