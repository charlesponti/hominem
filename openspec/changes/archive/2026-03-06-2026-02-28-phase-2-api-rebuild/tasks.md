# Phase 2 Tasks: API Layer Rebuild

## Section 1: Zod Schemas (4 tasks)

- [x] 1.1 Create `packages/hono-rpc/src/schemas/tasks.schema.ts` with TaskCreateInput, TaskUpdateInput, TaskListFilters Zod schemas
- [x] 1.2 Create `packages/hono-rpc/src/schemas/tags.schema.ts` with TagCreateInput, TagUpdateInput, TaggingInput Zod schemas  
- [x] 1.3 Create `packages/hono-rpc/src/schemas/calendar.schema.ts` with EventCreateInput, EventUpdateInput, AttendeeInput Zod schemas
- [x] 1.4 Create `packages/hono-rpc/src/schemas/{persons,bookmarks,possessions}.schema.ts` Zod schemas

## Section 2: Tasks Route Update (3 tasks)

- [x] 2.1 Update `packages/hono-rpc/src/routes/tasks.ts` to import from `@hominem/db/services/tasks` (not TasksService class)
- [x] 2.2 Add Zod validation via zValidator middleware on POST/PATCH endpoints
- [x] 2.3 Verify all error paths throw typed errors that middleware catches

## Section 3: Tags Route (3 tasks)

- [x] 3.1 Create `packages/hono-rpc/src/routes/tags.ts` with listTags, getTag, createTag, updateTag, deleteTag endpoints
- [x] 3.2 Add POST endpoint for tagEntity, DELETE endpoint for untagEntity  
- [x] 3.3 Add POST endpoint for syncEntityTags (replace all tags)

## Section 4: Calendar Route (2 tasks)

- [x] 4.1 Create `packages/hono-rpc/src/routes/calendar.ts` with listEvents, getEvent, createEvent, updateEvent, deleteEvent
- [x] 4.2 Add attendee management: listEventAttendees, addEventAttendee, removeEventAttendee

## Section 5: Persons Route (2 tasks)

- [x] 5.1 Create `packages/hono-rpc/src/routes/persons.ts` with listPersons, getPerson, createPerson, updatePerson, deletePerson
- [x] 5.2 Add relationship management: listPersonRelations, addPersonRelation

## Section 6: Bookmarks Route (1 task)

- [x] 6.1 Create `packages/hono-rpc/src/routes/bookmarks.ts` with listBookmarks, getBookmark, createBookmark, updateBookmark, deleteBookmark

## Section 7: Possessions Route (2 tasks)

- [x] 7.1 Create `packages/hono-rpc/src/routes/possessions.ts` with possession CRUD (listPossessions, getPossession, createPossession, updatePossession, deletePossession)
- [x] 7.2 Add container management: listContainers, getContainer, createContainer, updateContainer, deleteContainer

## Section 8: Error Handling (2 tasks)

- [x] 8.1 Verify/update `packages/hono-rpc/src/middleware/error.ts` handles DbError with proper status code mapping
- [x] 8.2 Create `packages/hono-rpc/src/test/error-mapping.test.ts` verifying error type → HTTP status mapping

## Section 9: Type Exports (1 task)

- [x] 9.1 Create/update `packages/hono-rpc/src/types/index.ts` to export service types (Task, Tag, CalendarEvent, Person, Bookmark, Possession types)

## Section 10: Integration Tests (2 tasks)

- [x] 10.1 Create `packages/hono-rpc/src/test/integration/tasks.e2e.test.ts` (create → get → update → delete flow)
- [x] 10.2 Create `packages/hono-rpc/src/test/authorization.test.ts` (verify user can't access other user's data)

## Section 11: Documentation (2 tasks)

- [x] 11.1 Update proposal.md with Phase 2 completion and deployment readiness assessment
- [x] 11.2 Document service-to-RPC adapter pattern for Phase 3 developers

## Progress Notes (2026-03-04)

- Routes were also registered in domain aggregators: `knowledge.ts` (`/tags`), `vital.ts` (`/calendar`), `economy.ts` (`/possessions`).
- `bookmarks.ts` duplicate legacy route code was removed; file now contains only the Phase 2 route implementation.
- Service import paths were corrected to `@hominem/db/services/*.service` to match package export layout.
- Remaining work is concentrated in Sections 8-10 and unresolved monorepo type errors outside the Phase 2 route files.
- Added test coverage in `packages/hono-rpc/tests/` for error mapping, task CRUD flow, and authorization guards (all passing in targeted run).

**Total: 24 tasks**
