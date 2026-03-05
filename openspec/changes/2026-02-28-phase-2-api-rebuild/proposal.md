---
title: "Phase 2: API Layer Rebuild"
description: "Rebuild API routes and RPC handlers to use new database services from Phase 1"
date_created: 2025-03-04
status: superseded
---

> Superseded: This change is not the active implementation track. Follow `openspec/ACTIVE_CHANGE.md` (`update-db-schema-references`) unless explicitly re-activated.

## Implementation Status (2026-03-04)

- Completed: Sections 1-7 route/schema implementation across tasks, tags, calendar, people, bookmarks, and possessions.
- Completed: Domain route registration updates in `knowledge.ts`, `vital.ts`, and `economy.ts`.
- Completed: Service import alignment to package subpath exports using `@hominem/db/services/*.service`.
- Completed: Section 8 (error mapping verification), Section 9 (type export surface), Section 10 (integration tests).
- Validation: targeted tests in `packages/hono-rpc/tests/` pass for error mapping, task CRUD flow, and authorization checks.
- Current blocker: workspace-wide `@hominem/db` type/build issues unrelated to Phase 2 route wiring prevent clean monorepo typecheck.

## Executive Summary

Phase 1 delivered a solid service layer (Tasks, Tags, Calendar, Persons, Bookmarks, Possessions). Phase 2 rebuilds the API routes and RPC handlers to consume these new services, adding Zod validation at API boundaries and establishing the error-to-HTTP mapping contract.

## Objectives

1. **Create service-to-RPC adapters** - Map new service signatures to existing RPC client contracts
2. **Add Zod validation** - Validate all external inputs at HTTP boundaries before passing to services  
3. **Establish error mapping** - Services throw typed errors; middleware converts to HTTP status codes
4. **Update RPC types** - Export types from services for client contracts
5. **Validate API flow** - End-to-end from client request → RPC → service → response

## Scope

### In Scope (Phase 2)

- Tasks, Tags, Calendar, Persons, Bookmarks, Possessions domains
- CRUD routes mapped to service operations
- Zod input validation schemas per route
- Error mapping middleware (typed errors → HTTP status codes)
- RPC type definitions for domains above

### Out of Scope (Later)

- Finance domain (complex partitioning; Phase 3)
- Transactions and idempotency (complex multi-table in Phase 3)
- Full test coverage (Green phase; focus on contracts)
- Vector/search operations (separate phase)
- Authentication/authorization (already implemented)

## Architecture

### Error Mapping Pattern

```typescript
// Service throws typed error
throw new ForbiddenError('Not your task', 'ownership')

// API middleware catches and maps
export async function errorMiddleware(c: Context, next: Next) {
  try {
    await next()
  } catch (error) {
    if (isDbError(error)) {
      const { statusCode, code, message } = getErrorResponse(error)
      return c.json(
        { code, message, success: false },
        { status: statusCode }
      )
    }
    // Unknown errors -> 500
    return c.json(
      { code: 'INTERNAL', message: 'Server error', success: false },
      { status: 500 }
    )
  }
}
```

### RPC Routes Pattern

```typescript
// packages/hono-rpc/src/routes/tasks.new.ts

import { listTasks, getTask, createTask, updateTask, deleteTask } from '@hominem/db/services/tasks'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { authMiddleware, type AppContext } from '../middleware/auth'
import { TaskCreateSchema, TaskUpdateSchema } from '../schemas/tasks.schema'

export const tasksRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  
  // List
  .get('/', async (c) => {
    const userId = brandId('UserId', c.get('userId')!)
    const tasks = await listTasks(userId)
    return c.json({ data: tasks, success: true })
  })
  
  // Get
  .get('/:id', async (c) => {
    const userId = brandId('UserId', c.get('userId')!)
    const taskId = brandId('TaskId', c.req.param('id'))
    const task = await getTask(taskId, userId)
    if (!task) {
      return c.json({ error: 'Not found', success: false }, { status: 404 })
    }
    return c.json({ data: task, success: true })
  })
  
  // Create
  .post('/', zValidator('json', TaskCreateSchema), async (c) => {
    const userId = brandId('UserId', c.get('userId')!)
    const input = c.req.valid('json')
    
    const task = await createTask(userId, input)
    return c.json({ data: task, success: true }, { status: 201 })
  })
  
  // Update
  .patch('/:id', zValidator('json', TaskUpdateSchema), async (c) => {
    const userId = brandId('UserId', c.get('userId')!)
    const taskId = brandId('TaskId', c.req.param('id'))
    const input = c.req.valid('json')
    
    const task = await updateTask(taskId, userId, input)
    if (!task) {
      return c.json({ error: 'Not found', success: false }, { status: 404 })
    }
    return c.json({ data: task, success: true })
  })
  
  // Delete
  .delete('/:id', async (c) => {
    const userId = brandId('UserId', c.get('userId')!)
    const taskId = brandId('TaskId', c.req.param('id'))
    
    const deleted = await deleteTask(taskId, userId)
    if (!deleted) {
      return c.json({ error: 'Not found', success: false }, { status: 404 })
    }
    return c.json({ success: true })
  })
```

## Phase 2 Tasks

### 1. Create Service Adapters (4 tasks)

- [ ] 1.1 Create `packages/hono-rpc/src/services-adapter.ts` - Exports service functions with db context
- [ ] 1.2 Add Zod schemas for Tasks CRUD inputs (create, update, list filters)
- [ ] 1.3 Add Zod schemas for Tags CRUD inputs
- [ ] 1.4 Add Zod schemas for Calendar, Persons, Bookmarks, Possessions CRUD inputs

### 2. Update Tasks Route (3 tasks)

- [ ] 2.1 Update `packages/hono-rpc/src/routes/tasks.ts` to import from new services
- [ ] 2.2 Add Zod validation to create/update endpoints
- [ ] 2.3 Verify error handling maps typed errors to HTTP status codes

### 3. Create Tags Route (3 tasks)

- [ ] 3.1 Create `packages/hono-rpc/src/routes/tags.ts` with CRUD operations
- [ ] 3.2 Add POST/DELETE for tagging entities
- [ ] 3.3 Test sync operations (replace all tags)

### 4. Create Calendar Route (2 tasks)

- [ ] 4.1 Create `packages/hono-rpc/src/routes/calendar.ts` with event + attendee operations
- [ ] 4.2 Test time-range filtering (startTime, endTime)

### 5. Create Persons Route (2 tasks)

- [ ] 5.1 Create `packages/hono-rpc/src/routes/persons.ts` with contact + relationship operations
- [ ] 5.2 Test relationship lookups

### 6. Create Bookmarks Route (1 task)

- [ ] 6.1 Create `packages/hono-rpc/src/routes/bookmarks.ts` with folder filtering

### 7. Create Possessions Route (2 tasks)

- [ ] 7.1 Create `packages/hono-rpc/src/routes/possessions.ts` with possession + container operations
- [ ] 7.2 Test category and container relationships

### 8. Error Handling (2 tasks)

- [ ] 8.1 Update error middleware to handle branded ID validation errors
- [ ] 8.2 Add error contract test (verify NotFoundError → 404, ForbiddenError → 403, etc.)

### 9. Export Types (1 task)

- [ ] 9.1 Export service types via `packages/hono-rpc/src/types/index.ts` for client contracts

### 10. Integration Tests (2 tasks)

- [ ] 10.1 Create end-to-end test: create task → get task → update task → delete task
- [ ] 10.2 Create ownership test: verify user can't access other user's resources

### 11. Documentation (2 tasks)

- [ ] 11.1 Update proposal.md with Phase 2 completion status
- [ ] 11.2 Document error handling pattern for Phase 3 developers

**Total: 24 tasks**

## Key Decisions

### Decision 1: Branded IDs in RPC

**Choice:** Validate and brand IDs in route handlers, pass branded types to services

**Rationale:**
- API handlers are the trust boundary (external input)
- Validation happens at HTTP layer, not in service layer
- Services can safely assume IDs are valid (already proven)

**Pattern:**
```typescript
const taskId = brandId('TaskId', c.req.param('id'))
```

### Decision 2: Direct Service Import vs Wrapper

**Choice:** RPC routes import functions directly from `@hominem/db/services/*`

**Rationale:**
- Simpler than wrapper pattern
- Service signatures are already stable
- No need for service classes in RPC layer

**Pattern:**
```typescript
import { listTasks, createTask } from '@hominem/db/services/tasks'
```

### Decision 3: Error Handling at API Layer

**Choice:** Services throw typed errors; API middleware converts to HTTP

**Rationale:**
- Services are framework-agnostic
- API layer owns HTTP semantics
- Single point of error mapping (middleware)

### Decision 4: Response Envelope

**Choice:** All responses include `success` boolean and optional `data`/`error` fields

**Rationale:**
- Consistent client experience
- Discriminated union for TS safety
- Matches existing error contract pattern

## Success Criteria

1. ✅ All 6 domain routes (Tasks, Tags, Calendar, Persons, Bookmarks, Possessions) created
2. ✅ Zod validation on all create/update endpoints
3. ✅ Error mapping test passes (typed errors → HTTP status codes)
4. ✅ Types exported for RPC clients
5. ✅ End-to-end flow works: client request → validation → service → response
6. ✅ No breaking changes to client contracts (backward compatible types)

## Known Limitations & Trade-offs

1. **Finance domain deferred** - Complex partitioning logic is Phase 3
2. **Transactions not in Phase 2** - API-level orchestration is Phase 3
3. **Validation only at HTTP boundary** - Not in service layer (services assume valid input)
4. **No request/response logging yet** - Will be added in Phase 3
5. **Pagination cursor not yet exposed in API** - Will add pagination schemas in Phase 3
