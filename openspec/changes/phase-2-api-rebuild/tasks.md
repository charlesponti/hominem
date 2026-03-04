# Phase 2 Tasks: API Layer Rebuild

## Section 1: Zod Schemas (4 tasks)

- [ ] 1.1 Create `packages/hono-rpc/src/schemas/tasks.schema.ts` with TaskCreateInput, TaskUpdateInput, TaskListFilters Zod schemas
- [ ] 1.2 Create `packages/hono-rpc/src/schemas/tags.schema.ts` with TagCreateInput, TagUpdateInput, TaggingInput Zod schemas  
- [ ] 1.3 Create `packages/hono-rpc/src/schemas/calendar.schema.ts` with EventCreateInput, EventUpdateInput, AttendeeInput Zod schemas
- [ ] 1.4 Create `packages/hono-rpc/src/schemas/{persons,bookmarks,possessions}.schema.ts` Zod schemas

## Section 2: Tasks Route Update (3 tasks)

- [ ] 2.1 Update `packages/hono-rpc/src/routes/tasks.ts` to import from `@hominem/db/services/tasks` (not TasksService class)
- [ ] 2.2 Add Zod validation via zValidator middleware on POST/PATCH endpoints
- [ ] 2.3 Verify all error paths throw typed errors that middleware catches

## Section 3: Tags Route (3 tasks)

- [ ] 3.1 Create `packages/hono-rpc/src/routes/tags.ts` with listTags, getTag, createTag, updateTag, deleteTag endpoints
- [ ] 3.2 Add POST endpoint for tagEntity, DELETE endpoint for untagEntity  
- [ ] 3.3 Add POST endpoint for syncEntityTags (replace all tags)

## Section 4: Calendar Route (2 tasks)

- [ ] 4.1 Create `packages/hono-rpc/src/routes/calendar.ts` with listEvents, getEvent, createEvent, updateEvent, deleteEvent
- [ ] 4.2 Add attendee management: listEventAttendees, addEventAttendee, removeEventAttendee

## Section 5: Persons Route (2 tasks)

- [ ] 5.1 Create `packages/hono-rpc/src/routes/persons.ts` with listPersons, getPerson, createPerson, updatePerson, deletePerson
- [ ] 5.2 Add relationship management: listPersonRelations, addPersonRelation

## Section 6: Bookmarks Route (1 task)

- [ ] 6.1 Create `packages/hono-rpc/src/routes/bookmarks.ts` with listBookmarks, getBookmark, createBookmark, updateBookmark, deleteBookmark

## Section 7: Possessions Route (2 tasks)

- [ ] 7.1 Create `packages/hono-rpc/src/routes/possessions.ts` with possession CRUD (listPossessions, getPossession, createPossession, updatePossession, deletePossession)
- [ ] 7.2 Add container management: listContainers, getContainer, createContainer, updateContainer, deleteContainer

## Section 8: Error Handling (2 tasks)

- [ ] 8.1 Verify/update `packages/hono-rpc/src/middleware/error.ts` handles DbError with proper status code mapping
- [ ] 8.2 Create `packages/hono-rpc/src/test/error-mapping.test.ts` verifying error type → HTTP status mapping

## Section 9: Type Exports (1 task)

- [ ] 9.1 Create/update `packages/hono-rpc/src/types/index.ts` to export service types (Task, Tag, CalendarEvent, Person, Bookmark, Possession types)

## Section 10: Integration Tests (2 tasks)

- [ ] 10.1 Create `packages/hono-rpc/src/test/integration/tasks.e2e.test.ts` (create → get → update → delete flow)
- [ ] 10.2 Create `packages/hono-rpc/src/test/authorization.test.ts` (verify user can't access other user's data)

## Section 11: Documentation (2 tasks)

- [ ] 11.1 Update proposal.md with Phase 2 completion and deployment readiness assessment
- [ ] 11.2 Document service-to-RPC adapter pattern for Phase 3 developers

**Total: 24 tasks**
