# Legacy Replacement Inventory (Task 4.2)

This inventory locks deletion ownership and sequencing for the remaining module cutovers.

## Auth

| Legacy path | Replacement target | Owner | Deletion timeline |
|---|---|---|---|
| `packages/auth/src/account.service.ts` (legacy branches) | modernized `packages/auth/src/account.service.ts` contract-only surface | `@hominem/auth` | same phase as auth cutover |
| `packages/auth/src/user.ts` legacy shape branches | `packages/auth/src/types.ts` + `auth.types.ts` modern contracts | `@hominem/auth` | same phase as auth cutover |
| `services/api/src/routes/auth.ts` legacy compatibility handlers | modern typed handlers only | `services/api` | same phase as auth cutover |

## Chat

| Legacy path | Replacement target | Owner | Deletion timeline |
|---|---|---|---|
| `packages/chat/src/service/chat.service.ts` legacy compatibility branches | contract-driven chat service | `@hominem/chat-services` | same phase as chat cutover |
| `packages/chat/src/service/message.service.ts` legacy message branch paths | modern message contract methods | `@hominem/chat-services` | same phase as chat cutover |
| `packages/hono-rpc/src/routes/chats.ts` legacy request/response adapters | direct modern contract route handlers | `@hominem/hono-rpc` | same phase as chat cutover |

## Notes

| Legacy path | Replacement target | Owner | Deletion timeline |
|---|---|---|---|
| `packages/notes/src/notes.service.ts` legacy shape adapters | modern notes contracts + integration-first coverage | `@hominem/notes-services` | same phase as notes cutover |
| `packages/hono-rpc/src/types/notes.types.ts` compatibility types | canonical `packages/notes/src/contracts.ts` projections | `@hominem/hono-rpc` | same phase as notes cutover |
| `packages/hono-rpc/src/schemas/notes.schema.ts` legacy DTO compatibility fields | modern contract-only DTOs | `@hominem/hono-rpc` | same phase as notes cutover |

## Calendar

| Legacy path | Replacement target | Owner | Deletion timeline |
|---|---|---|---|
| `packages/events/src/events.service.ts` calendar-generic legacy surface | `packages/db/src/services/calendar.service.ts` + focused events domain services | `@hominem/events-services` | same phase as calendar cutover |
| `packages/hono-rpc/src/routes/events.ts` (legacy calendar synonym) | `packages/hono-rpc/src/routes/calendar.ts` | `@hominem/hono-rpc` | same phase as calendar cutover |
| `/vital/events` mounted legacy calendar surface | `/vital/calendar` | `services/api` | same phase as calendar cutover |

## Lists

| Legacy path | Replacement target | Owner | Deletion timeline |
|---|---|---|---|
| legacy list sharing adapters in list services | `task_list_invites` + `task_list_collaborators` modern services | `@hominem/lists-services` | same phase as lists cutover |
| `packages/hono-rpc/src/routes/lists.*` compatibility mutations/queries | direct modern list service route calls | `@hominem/hono-rpc` | same phase as lists cutover |
| old list schema-import-based DTO bridges | local contracts (`types.ts`) | `@hominem/lists-services` | same phase as lists cutover |

## Places

| Legacy path | Replacement target | Owner | Deletion timeline |
|---|---|---|---|
| legacy place/travel schema-type bridges | modern `places.service.ts` + `trips.service.ts` contracts | `@hominem/places-services` | same phase as places cutover |
| `packages/hono-rpc/src/routes/places.ts` compatibility mappers | direct modern places service outputs | `@hominem/hono-rpc` | same phase as places cutover |

## Finance (Last)

| Legacy path | Replacement target | Owner | Deletion timeline |
|---|---|---|---|
| `packages/finance/src/core/budget-categories.service.ts` and category surfaces | tag-driven taxonomy in `modern-finance.ts` + `finance.tags.ts` routes | `@hominem/finance-services` | same phase as finance cutover |
| `packages/hono-rpc/src/routes/finance.categories.ts` | `packages/hono-rpc/src/routes/finance.tags.ts` | `@hominem/hono-rpc` | same phase as finance cutover |
| `services/api/src/routes/finance/finance.categories.ts` | `services/api/src/routes/finance/finance.tags.ts` | `services/api` | same phase as finance cutover |
| legacy finance transaction/budget/category adapters | modern accounts/transactions/tags/analytics services | `@hominem/finance-services` | same phase as finance cutover |

## No-Shim Enforcement

- No alias exports for legacy symbol names
- No wrapper modules preserving legacy contracts
- No dual-path execution after each module cutover
