# @hominem/notes-services

Notes and content management services.

## Installation

```bash
bun add @hominem/notes-services
```

## Usage

```typescript
import { notesService, ContentService } from '@hominem/notes-services'

// Create a note
const note = await notesService.create({ 
  userId: 'user-id', 
  title: 'My Note',
  content: 'Note content'
})

// Manage content
const contentService = new ContentService()
const content = await contentService.create({
  userId: 'user-id',
  type: 'article',
  title: 'My Article'
})
```
