## Why

The Notes chat route currently behaves like a generic document page inside the shared app shell instead of a focused conversation surface. That makes the layout fight its parent container, splits secondary actions across persistent bands, and weakens the product boundary between quick thought capture and ongoing dialogue.

## What Changes

- Redesign the Notes `chat/:chatId` route as an immersive responsive conversation surface that cooperates with, but does not inherit, the default document-page constraints of the app shell.
- Define the redesign as a shared cross-platform chat presentation contract so web Notes and the mobile app render the same transcript, composer, search, and debug behaviors.
- Replace the dedicated in-page action strip with a chat-local header that contains navigation, session context, and a single dropdown for secondary actions.
- Move message search to an overlay that preserves scroll and conversation state when dismissed.
- Refactor the shared chat presentation primitives so assistant turns render as transcript rows and user turns render as compact aligned bubbles instead of forcing bubble chrome for all roles.
- Add a `Show debug` action that reveals deeper per-message metadata without cluttering the default reading experience.
- Refine the classification review overlay so it remains compatible with the new chat layout on mobile and desktop.

## Capabilities

### New Capabilities
- `notes-chat-surface`: Notes chat sessions render as a responsive single-column conversation interface with overlay search, dropdown-based secondary actions, optional inline debug metadata, and a shared cross-platform transcript/composer presentation model.

### Modified Capabilities

## Impact

- `apps/notes/app/routes/chat/chat.$chatId.tsx`
- `apps/notes/app/routes/chat/layout.tsx`
- `apps/notes/app/components/chat/ChatMessages.tsx`
- `apps/notes/app/components/chat/ChatMessage.tsx`
- `apps/notes/app/components/chat/ChatInput.tsx`
- `apps/notes/app/components/chat/*`
- `apps/mobile/components/chat/chat.tsx`
- `apps/mobile/components/chat/chat-message.tsx`
- `apps/mobile/components/chat/chat-input.tsx`
- `apps/notes/app/components/classification-review.tsx`
- `packages/ui/src/components/ai-elements/message.tsx`
- `packages/ui/src/components/ai-elements/prompt-input.tsx`
- `packages/ui/src/tokens/*`
- `packages/ui/src/components/layout/header.tsx`
- Notes and mobile chat presentation semantics, shared transcript/composer primitives, route-level shell behavior, search interaction model, and message diagnostics presentation
