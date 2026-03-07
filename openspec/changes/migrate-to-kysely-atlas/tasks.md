## 1. Atlas Setup

- [x] 1.1 Install Atlas CLI (run `curl -sSf https://atlasgo.sh | sh` or `brew install ariga/tap/atlas`)
- [x] 1.2 Create `packages/db/atlas.yaml` with PostgreSQL configuration
- [x] 1.3 Run `atlas schema inspect --url $DATABASE_URL > packages/db/schema.sql` to introspect production DB
- [x] 1.4 Run `atlas schema apply --dry-run` to verify schema matches
- [x] 1.5 Commit `packages/db/schema.sql` to repository

## 2. Kysely Setup

- [x] 2.1 Add dependencies: `bun add kysely pg`
- [x] 2.2 Add dev dependency: `bun add -d kysely-codegen`
- [x] 2.3 Run `kysely-codegen --dialect postgres --out-file packages/db/src/types/database.ts` to generate types
- [x] 2.4 Create `packages/db/src/db.ts` with Kysely instance (singleton, connection pool)
- [x] 2.5 Export Kysely instance from `packages/db/src/index.ts`
- [x] 2.6 Run `bun run build` to verify types compile
- [x] 2.7 Commit generated types to repository

## 3. Tasks Domain Migration

- [x] 3.1 Read existing `packages/db/src/services/tasks.service.ts`
- [x] 3.2 Read RPC contract in `packages/hono-rpc/src/routes/tasks.ts`
- [x] 3.3 Rewrite all 5 task handlers to use Kysely directly (list, get, create, update, delete)
- [x] 3.4 Verified handlers work with Kysely queries
- [x] 3.5 All handlers completed and committed

## 4. Bookmarks Domain Migration

- [x] 4.1 Read existing `packages/db/src/services/bookmarks.service.ts`
- [x] 4.2 Read RPC contract in `packages/hono-rpc/src/routes/bookmarks.ts`
- [x] 4.3 Rewrite all 5 bookmark handlers to use Kysely directly (list, get, create, update, delete)
- [x] 4.4 All handlers completed and committed

## 5. Calendar Domain Migration

- [x] 5.1 Read existing `packages/db/src/services/calendar.service.ts`
- [x] 5.2 Read RPC contract in `packages/hono-rpc/src/routes/calendar.ts`
- [x] 5.3 Rewrite all 11 calendar handlers to use Kysely directly
- [x] 5.4 All handlers completed and committed

## 6. Tags Domain Migration

- [x] 6.1 Read existing `packages/db/src/services/tags.service.ts`
- [x] 6.2 Read RPC contract in `packages/hono-rpc/src/routes/tags.ts`
- [x] 6.3 Rewrite all 8 tag handlers to use Kysely directly
- [x] 6.4 All handlers completed and committed

## 7. Authentication Services Migration

- [x] 7.1 Migrate `@hominem/auth` account.service.ts to Kysely
- [x] 7.2 Migrate `@hominem/auth` user-auth.service.ts to Kysely
- [x] 7.3 Update `@hominem/db` exports for Kysely table types
- [x] 7.4 All auth services completed and committed

## 8. Health Services Migration

- [x] 8.1 Migrate `@hominem/health-services` health.service.ts to Kysely
- [x] 8.2 All health service handlers completed and committed

## 9. Chat Domain Migration

- [x] 9.1 Create chat and chat_message tables in database with proper schema
- [x] 9.2 Set up foreign keys and indexes for chat tables
- [x] 9.3 Implement RLS policies for chat access control
- [x] 9.4 Regenerate Kysely types for new chat tables
- [x] 9.5 Rewrite all chats.ts handlers to use Kysely directly
- [x] 9.6 Rewrite all messages.ts handlers to use Kysely directly
- [x] 9.7 All chat handlers completed and committed

## 10. Notes Domain Migration

- [x] 10.1 Read RPC contract in `packages/hono-rpc/src/routes/notes.ts`
- [x] 10.2 Create helper functions: dbToNote(), getNoteWithOwnershipCheck(), hydrateNoteTags(), syncNoteTags()
- [x] 10.3 Rewrite all 10 note handlers (list, get, versions, create, update, delete, publish, archive, unpublish, expand/outline/rewrite)
- [x] 10.4 Handle tag relationships via tags + note_tags tables
- [x] 10.5 All note handlers completed and committed

## 11. Finance Accounts Domain Migration

- [x] 11.1 Read RPC contract in `packages/hono-rpc/src/routes/finance.accounts.ts`
- [x] 11.2 Create helper functions: getAccountWithOwnershipCheck(), getTransactionsForAccount(), toAccountData(), toTransactionData()
- [x] 11.3 Rewrite all account handlers using Selectable<> types for type safety
- [x] 11.4 All account handlers completed (list, get with transactions, create, update, delete, with-plaid, connections, institution-accounts, all)
- [x] 11.5 Fix remaining type errors with optional returns from executeTakeFirst()

## 12. Finance Transactions Domain Migration

- [x] 12.1 Read RPC contract in `packages/hono-rpc/src/routes/finance.transactions.ts`
- [x] 12.2 Create helper functions for transaction queries
- [x] 12.3 Rewrite all transaction handlers to use Kysely directly
- [x] 12.4 All transaction handlers completed

## 13. Finance Institutions Domain Migration

- [x] 13.1 Read RPC contract in `packages/hono-rpc/src/routes/finance.institutions.ts`
- [x] 13.2 Create helper functions for institution queries
- [x] 13.3 Rewrite all institution handlers to use Kysely directly
- [x] 13.4 All institution handlers completed

## 14. Finance Tags Domain Migration

- [x] 14.1 Read RPC contract in `packages/hono-rpc/src/routes/finance.tags.ts`
- [x] 14.2 Create helper functions for finance tag queries
- [x] 14.3 Rewrite all finance tag handlers to use Kysely directly
- [x] 14.4 All finance tag handlers completed

## 15. Finance Budget Domain Migration

- [x] 15.1 Read RPC contract in `packages/hono-rpc/src/routes/finance.budget.ts`
- [x] 15.2 Create helper functions for budget queries
- [x] 15.3 Rewrite all budget handlers to use Kysely directly
- [x] 15.4 All budget handlers completed

## 16. Places Domain Migration

- [x] 16.1 Read RPC contract in `packages/hono-rpc/src/routes/places.ts`
- [x] 16.2 Create helper functions for place/visit queries
- [x] 16.3 Rewrite all place handlers to use Kysely directly
- [x] 16.4 All place handlers completed

## 17. Lists Domain Migration

- [x] 17.1 Read RPC contracts in `packages/hono-rpc/src/routes/lists.query.ts` and `lists.mutation.ts`
- [x] 17.2 Create helper functions for list/item queries
- [x] 17.3 Rewrite all list handlers to use Kysely directly
- [x] 17.4 All list handlers completed

## 18. Items Domain Migration

- [x] 18.1 Read RPC contract in `packages/hono-rpc/src/routes/items.ts`
- [x] 18.2 Create helper functions for item queries
- [x] 18.3 Rewrite all item handlers to use Kysely directly
- [x] 18.4 All item handlers completed

## 19. Invites Domain Migration

- [x] 19.1 Read RPC contract in `packages/hono-rpc/src/routes/invites.ts`
- [x] 19.2 Create helper functions for invite queries
- [x] 19.3 Rewrite all invite handlers to use Kysely directly
- [x] 19.4 All invite handlers completed

## 20. Goals & Habits Domain Migration

- [x] 20.1 Read RPC contracts for goals and habits
- [x] 20.2 Determine if events-services in-memory store can be replaced with Kysely
- [x] 20.3 Create helper functions for goal/habit/event queries
- [x] 20.4 Rewrite handlers to use Kysely directly

## 21. External API Integrations (Plaid, Twitter)

- [x] 21.1 Read RPC contracts: `finance.plaid.ts`, `finance.export.ts`, `finance.analyze.ts`, `twitter.ts`
- [x] 21.2 Assess integration patterns and refactor as needed
- [x] 21.3 Migrate handlers to use Kysely for database operations
- [x] 21.4 All integration handlers completed

## 22. Remove Drizzle

- [x] 22.1a Migrate `services/api` auth files to Kysely (session-store.ts, subjects.ts, better-auth.ts)
- [ ] 22.1 Remove dependencies: `bun remove drizzle-orm drizzle-zod drizzle-kit`
- [ ] 22.2 Delete schema files: `rm packages/db/src/schema/*.ts`
- [ ] 22.3 Delete migrations directory: `rm -rf packages/db/src/migrations/`
- [ ] 22.4 Delete service files: `rm packages/db/src/services/*.service.ts`
- [ ] 22.5 Clean up `packages/db/src/index.ts` exports (keep db instance, remove schema exports)
- [ ] 22.6 Update `packages/db/package.json` (remove drizzle scripts, add kysely scripts)

## 23. Final Verification

- [ ] 23.1 Run full build: `bun run build`
- [ ] 23.2 Run full test suite: `bun run test`
- [ ] 23.3 Run typecheck: `bun run typecheck`
- [ ] 23.4 Run lint: `bun run lint --parallel`
- [ ] 23.5 Verify staging deployment
- [ ] 23.6 Verify production deployment
