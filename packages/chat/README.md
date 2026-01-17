# @hominem/chat-services

Chat and messaging services.

## Installation

```bash
bun add @hominem/chat-services
```

## Usage

```typescript
import { ChatService, MessageService } from '@hominem/chat-services'

const chatService = new ChatService()
const messageService = new MessageService()

// Create a chat
const chat = await chatService.create({ userId: 'user-id', title: 'New Chat' })

// Send a message
const message = await messageService.create({
  chatId: chat.id,
  role: 'user',
  content: 'Hello!'
})
```
