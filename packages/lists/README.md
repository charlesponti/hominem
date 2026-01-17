# @hominem/lists

List management and collaboration services.

## Installation

```bash
bun add @hominem/lists
```

## Usage

```typescript
import { createList, getUserLists, addItemToList } from '@hominem/lists-services'

// Create and manage lists
const list = await createList({ name: 'My List', userId: 'user-id' })
const items = await addItemToList({ listId: list.id, placeId: 'place-id' })
```
