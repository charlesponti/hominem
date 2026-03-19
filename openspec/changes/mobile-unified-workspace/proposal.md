## Why

The mobile app still splits note capture, chat, and entry flows across separate surfaces (`focus`, `start`, `sherpa`) with separate input components. That fragmentation fights the intended product vision of one notes-first assistant workspace where notes and chats live in the same continuous stream and one context-aware composer works from anywhere.

## What Changes

- Introduce a unified mobile workspace shell with top-level contexts for `Inbox`, `Note`, `Chat`, `Search`, and `Settings`
- Make `Inbox` the canonical home surface that renders notes, chat activity, assistant output, and attachments in one chronological stream
- Replace `CaptureBar`, `InputDock`, and route-local `ChatInput` ownership with one shell-mounted mobile HyperForm
- Preserve draft text, attachments, and voice capture while users switch between workspace contexts
- Reframe focused note writing and active chat as context views of the same workspace instead of separate products

## Capabilities

### New Capabilities
- `mobile-unified-workspace`: The mobile app presents inbox, note writing, chat, search, and settings as contexts inside one shared workspace shell with a unified chronological stream

### Modified Capabilities
- `universal-composer`: Extend the single-composer contract to mobile so one context-aware HyperForm owns capture, note drafting, chat replies, attachments, and voice input
- `notes-chat-surface`: Align mobile chat with the unified workspace model so chat is a focused context view of the same shared stream rather than an isolated destination

## Impact

- `apps/mobile/app/(protected)` routing and layout ownership
- `apps/mobile/app/(protected)/(tabs)` information architecture and top navigation
- `apps/mobile/components/capture`, `apps/mobile/components/input`, and `apps/mobile/components/chat`
- Mobile React Query state and stream update behavior
- OpenSpec contracts for mobile workspace and universal composer behavior
