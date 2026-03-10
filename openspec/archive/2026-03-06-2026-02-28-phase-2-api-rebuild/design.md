# Phase 2 Design: API Layer Rebuild

## Goals

- Map Phase 1 service layer to RPC routes
- Add Zod validation at HTTP boundaries
- Establish error-to-HTTP mapping
- Create stable RPC types for clients

## Architecture Overview

```
Client Request
    ↓
[ HTTP Handler (authMiddleware) ]
    ↓
[ Zod Validator ]
    ↓
[ RPC Route Handler ]
    ↓
[ Service Import (e.g., listTasks, createTask) ]
    ↓
[ Service generates typed error if needed ]
    ↓
[ Error Middleware catches and maps ]
    ↓
Response: { success: boolean; data?: T; error?: string }
```

## Service-to-RPC Mapping

### Tasks
```
listTasks(userId) → GET /api/tasks
getTask(taskId, userId) → GET /api/tasks/:id
createTask(userId, input) → POST /api/tasks
updateTask(taskId, userId, input) → PATCH /api/tasks/:id
deleteTask(taskId, userId) → DELETE /api/tasks/:id
```

### Tags
```
listTags(userId) → GET /api/tags
getTag(tagId, userId) → GET /api/tags/:id
createTag(userId, input) → POST /api/tags
updateTag(tagId, userId, input) → PATCH /api/tags/:id
deleteTag(tagId, userId) → DELETE /api/tags/:id
tagEntity(tagId, entityId, entityType) → POST /api/tags/:id/tag
untagEntity(tagId, entityId, entityType) → DELETE /api/tags/:id/tag
syncEntityTags(entityId, entityType, tagIds) → POST /api/tags/sync
```

### Calendar
```
listEvents(userId, filters?) → GET /api/calendar/events
getEvent(eventId, userId) → GET /api/calendar/events/:id
createEvent(userId, input) → POST /api/calendar/events
updateEvent(eventId, userId, input) → PATCH /api/calendar/events/:id
deleteEvent(eventId, userId) → DELETE /api/calendar/events/:id
listEventAttendees(eventId, userId) → GET /api/calendar/events/:id/attendees
addEventAttendee(eventId, personId, userId) → POST /api/calendar/events/:id/attendees
removeEventAttendee(attendeeId, eventId, userId) → DELETE /api/calendar/events/:id/attendees/:attendeeId
```

### Persons
```
listPersons(userId) → GET /api/persons
getPerson(personId, userId) → GET /api/persons/:id
createPerson(userId, input) → POST /api/persons
updatePerson(personId, userId, input) → PATCH /api/persons/:id
deletePerson(personId, userId) → DELETE /api/persons/:id
listPersonRelations(personId, userId) → GET /api/persons/:id/relations
addPersonRelation(personId, relatedUserId, relationshipType, userId) → POST /api/persons/:id/relations
```

### Bookmarks
```
listBookmarks(userId, folder?) → GET /api/bookmarks
getBookmark(bookmarkId, userId) → GET /api/bookmarks/:id
createBookmark(userId, input) → POST /api/bookmarks
updateBookmark(bookmarkId, userId, input) → PATCH /api/bookmarks/:id
deleteBookmark(bookmarkId, userId) → DELETE /api/bookmarks/:id
```

### Possessions
```
listPossessions(userId, category?) → GET /api/possessions
getPossession(possessionId, userId) → GET /api/possessions/:id
createPossession(userId, input) → POST /api/possessions
updatePossession(possessionId, userId, input) → PATCH /api/possessions/:id
deletePossession(possessionId, userId) → DELETE /api/possessions/:id
listContainers(userId) → GET /api/possessions/containers
getContainer(containerId, userId) → GET /api/possessions/containers/:id
createContainer(userId, input) → POST /api/possessions/containers
updateContainer(containerId, userId, input) → PATCH /api/possessions/containers/:id
deleteContainer(containerId, userId) → DELETE /api/possessions/containers/:id
```

## Error Mapping Contract

| Service Error | HTTP Status | API Response |
|---|---|---|
| ForbiddenError (ownership) | 403 | `{ code: 'FORBIDDEN', message: '...', success: false }` |
| NotFoundError | 404 | `{ code: 'NOT_FOUND', message: '...', success: false }` |
| ConflictError (unique constraint) | 409 | `{ code: 'CONFLICT', message: '...', success: false }` |
| InternalError | 500 | `{ code: 'INTERNAL', message: '...', success: false }` |
| ValidationError (Zod) | 400 | `{ code: 'VALIDATION_ERROR', message: '...', issues: [...], success: false }` |

## Zod Validation Schemas

All create operations validate:
- Required fields present
- Type correctness (string, number, boolean, date, etc.)
- Min/max length constraints
- Enum values for status/priority/type fields

All update operations validate:
- Only known properties
- Types match expected
- Constraints on changed fields

## Type Exports

Service types flow through:
```
@hominem/db/services/tasks.ts (defines Task type via typeof tables)
  ↓
@hominem/db/src/services/tasks.service.ts (exports service functions)
  ↓
@hominem/hono-rpc/src/types/tasks.ts (re-exports for RPC clients)
  ↓
clients/apps import from @hominem/hono-rpc for types
```

## Error Handling Middleware

The error middleware that converts service errors to HTTP responses:

```typescript
export const errorMiddleware: MiddlewareHandler = async (c, next) => {
  try {
    await next()
  } catch (error) {
    // Typed DB service error
    if (error instanceof DbError) {
      return c.json(
        { 
          code: error.code, 
          message: error.message, 
          success: false 
        },
        { status: error.statusCode }
      )
    }
    
    // Zod validation error
    if (error instanceof ZodError) {
      return c.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          issues: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          })),
          success: false
        },
        { status: 400 }
      )
    }
    
    // Unknown error
    return c.json(
      { 
        code: 'INTERNAL', 
        message: 'Internal server error', 
        success: false 
      },
      { status: 500 }
    )
  }
}
```

## Response Contract

All API responses follow this discriminated union:

```typescript
type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; code: string; message: string; issues?: ValidationIssue[] }
```

This ensures:
- Type safety for clients (`if (response.success)`)
- Consistent error reporting
- Backward compatibility

## Testing Strategy

1. **Contract tests** - Verify service error → HTTP status mapping
2. **Integration tests** - Full request → response flow
3. **Authorization tests** - Verify ownership checks work
4. **Validation tests** - Zod schemas reject invalid inputs
5. **Compatibility tests** - Ensure RPC client types match API

## Assumptions

1. Services are stable and won't change mid-Phase-2
2. Error types in services are final (@hominem/db/services/_shared/errors.ts)
3. Authentication middleware is already in place (authMiddleware working)
4. Zod is preferred for HTTP validation (already in use)
5. TypeScript `typeof table.$inferSelect` for types is available

## Implementation Notes (2026-03-04)

- Route implementations now exist for all six target domains and are attached to domain routers.
- API route success payloads are standardized as `{ success: true, data: ... }`.
- Route-level input validation is implemented with `zValidator` and domain schemas.
- Service imports use explicit `.service` subpaths (example: `@hominem/db/services/tasks.service`) to align with package exports.
- Hono RPC public types now include service-derived domain aliases (Task, Tag, CalendarEvent, Person, Bookmark, Possession, container and list variants).
- Tests added under `packages/hono-rpc/tests/` cover error mapping, tasks CRUD flow, and authorization behavior.
- Monorepo typecheck remains blocked by pre-existing cross-package db schema/type mismatches outside the Phase 2 route files.
