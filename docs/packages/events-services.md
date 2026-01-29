# @hominem/events-services (moved README)

This file consolidates the `packages/events/README.md` content.

---

# @hominem/events-services

Event tracking and visit management services.

## Installation

```bash
bun add @hominem/events-services
```

## Usage

```typescript
import { createEvent, getVisitsByUser, getVisitsByPlace } from '@hominem/events-services'

// Log a visit
const event = await createEvent({ userId: 'user-id', placeId: 'place-id' })

// Get user visits
const visits = await getVisitsByUser(userId)
```
