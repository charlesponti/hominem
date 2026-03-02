# AI Elements Full Implementation Plan

## Overview
Replace all custom chat/AI components with AI Elements library components to showcase the full capabilities of Vercel AI SDK and AI Elements.

## Current State

### Already Using (from AI Elements)
| Component | Location Used |
|-----------|---------------|
| Message, MessageContent, MessageAvatar | ChatMessage.tsx |
| Response | ChatMessages.tsx |
| Reasoning, ReasoningContent | ChatMessage.tsx, ReasoningPart.tsx |
| Tool, ToolHeader, ToolInput, ToolOutput | ChatMessage.tsx, ToolInvocationPart.tsx |
| Sources, Source | ChatMessage.tsx |
| Suggestions, Suggestion | ChatInput.tsx |
| PromptInput, PromptInputTextarea, PromptInputSubmit, PromptInputFooter, PromptInputTools | ChatInput.tsx |
| Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton, ConversationDownload | ChatMessages.tsx |
| SpeechInput | ChatModals.tsx |

### Custom Code to Replace
1. `AttachmentsPreview.tsx` → AI Elements Attachments
2. `FileUploader.tsx` → AI Elements Attachments + usePromptInputAttachments hook
3. `ChatMessage.tsx` → AI Elements Message, MessageContent, MessageResponse, Reasoning, Tool
4. Custom PromptInput → Full AI Elements PromptInput with attachments
5. Custom reasoning display → Use Reasoning, ReasoningContent
6. Custom tool display → Use Tool components

---

## Phase 1: Install AI Elements Full Components

### Step 1.1: Create Attachments Component
**File:** `packages/ui/src/components/ai-elements/attachments.tsx`

Create comprehensive Attachments component based on AI Elements docs:
- `Attachments` - Container with variant (grid/inline/list)
- `Attachment` - Individual file wrapper
- `AttachmentPreview` - Image/video preview
- `AttachmentInfo` - File name + type
- `AttachmentRemove` - Remove button
- `AttachmentHoverCard` - Hover preview
- `getMediaCategory()` - Utility function
- `getAttachmentLabel()` - Utility function

### Step 1.2: Create PromptInput Full Implementation
**File:** `packages/ui/src/components/ai-elements/prompt-input.tsx`

Replace current stub with full implementation:
- `PromptInput` - Main form wrapper with file drop support
- `PromptInputBody` - Textarea wrapper
- `PromptInputHeader` - For attachment display
- `PromptInputFooter` - Toolbar wrapper
- `PromptInputTools` - Tool buttons wrapper
- `PromptInputButton` - Button with tooltip support
- `PromptInputSubmit` - Submit with status icons
- `PromptInputActionMenu` - Dropdown for attachments
- `PromptInputActionAddAttachments` - Built-in add files action
- `usePromptInputAttachments` - Hook for attachment management
- `usePromptInputController` - Full input control hook
- `useProviderAttachments` - Context access hook

### Step 1.3: Create Message Full Implementation
**File:** `packages/ui/src/components/ai-elements/message.tsx`

Add:
- `MessageResponse` - AI response text display
- `MessageAction` - Message actions (copy, edit, etc.)
- `MessageAnnotations` - For inline citations

### Step 1.4: Update Index Exports
**File:** `packages/ui/src/components/ai-elements/index.ts`

Add all new exports.

---

## Phase 2: Update Chat Components

### Step 2.1: Replace ChatInput with Full PromptInput
**File:** `apps/notes/app/components/chat/ChatInput.tsx`

Replace:
- Use `PromptInput` with `globalDrop` and `multiple` props
- Use `PromptInputBody` + `PromptInputTextarea`
- Use `PromptInputFooter` + `PromptInputTools`
- Use `PromptInputActionMenu` + `PromptInputActionAddAttachments` for file upload
- Use `usePromptInputAttachments` hook instead of `useFileUpload`
- Remove custom file uploader modal - use AI Elements attachment flow
- Keep SpeechInput for voice input

### Step 2.2: Replace Attachments Preview
**Files:**
- `apps/notes/app/components/chat/ChatAttachments.tsx`
- `apps/notes/app/components/chat/AttachmentsPreview.tsx`

Replace with:
- `Attachments` component with `variant="grid"`
- `Attachment` for each file
- `AttachmentPreview` for images
- `AttachmentInfo` for file details
- `AttachmentRemove` for delete

### Step 2.3: Enhance ChatMessage
**File:** `apps/notes/app/components/chat/ChatMessage.tsx`

Replace custom message rendering with:
- `Message` component with full feature set
- `MessageContent` for content wrapper
- `MessageResponse` for AI text
- `Reasoning` for AI thinking display
- `Tool` for tool invocations
- `Sources` for citations
- Keep custom message actions (copy, edit, delete) - can wrap in `MessageAction`

---

## Phase 3: Add Advanced AI Elements

### Step 3.1: Implement Inline Citation
**New File:** `packages/ui/src/components/ai-elements/inline-citation.tsx`

Create components for inline citations:
- `InlineCitation` - Inline reference component
- `CitationMarker` - Clickable citation number

### Step 3.2: Implement Shimmer Loading
**New File:** `packages/ui/src/components/ai-elements/shimmer.tsx`

Create shimmer effect components:
- `Shimmer` - Loading shimmer wrapper
- `ShimmerText` - Loading text placeholder
- `ShimmerMessage` - Loading message placeholder

### Step 3.3: Implement Checkpoint
**New File:** `packages/ui/src/components/ai-elements/checkpoint.tsx`

Create checkpoint/step components:
- `Checkpoint` - Progress step indicator
- `CheckpointList` - Multi-step progress

### Step 3.4: Implement Queue
**New File:** `packages/ui/src/components/ai-elements/queue.tsx`

Create queue management:
- `Queue` - Queue container
- `QueueItem` - Individual queued item

### Step 3.5: Implement Task
**New File:** `packages/ui/src/components/ai-elements/task.tsx`

Create task management:
- `Task` - Task item
- `TaskList` - Task list
- `TaskStatus` - Status indicator

### Step 3.6: Implement Confirmation
**New File:** `packages/ui/src/components/ai-elements/confirmation.tsx`

Create confirmation dialog:
- `Confirmation` - Confirmation wrapper
- `ConfirmationTrigger` - Trigger button
- `ConfirmationContent` - Dialog content

### Step 3.7: Implement Context
**New File:** `packages/ui/src/components/ai-elements/context.tsx`

Create context display:
- `Context` - Context wrapper
- `ContextItem` - Context piece

### Step 3.8: Implement Plan Display
**New File:** `packages/ui/src/components/ai-elements/plan.tsx`

Create plan/step components:
- `Plan` - Plan container
- `PlanStep` - Individual step

---

## Phase 4: Voice & Audio (Enhanced)

### Step 4.1: Enhance SpeechInput
**File:** `packages/ui/src/components/ai-elements/speech-input.tsx`

Replace stub with full implementation using Web Speech API:
- Real speech recognition
- `onTranscriptionChange` callback
- Visual recording indicator
- Status management

### Step 4.2: Create Audio Player
**New File:** `packages/ui/src/components/ai-elements/audio-player.tsx`

Create audio playback:
- `AudioPlayer` - Audio playback component
- `AudioPlayerPlayButton` - Play/pause
- `AudioPlayerProgress` - Progress bar

### Step 4.3: Create Transcription Display
**New File:** `packages/ui/src/components/ai-elements/transcription.tsx`

Create transcription display:
- `Transcription` - Transcript container
- `TranscriptionSegment` - Individual segment

---

## Phase 5: Update App Integration

### Step 5.1: Update Chat Route
**File:** `apps/notes/app/routes/chat/chat.$chatId.tsx`

Update to use:
- Full `Conversation` component
- `ConversationScrollButton`
- `ConversationDownload`

### Step 5.2: Update Notes Chat
**File:** `apps/notes/app/routes/notes/$noteId.tsx`

Update split view to use new components.

### Step 5.3: Clean Up Custom Hooks
After migration, evaluate removing:
- `use-file-upload.ts` - Replaced by `usePromptInputAttachments`
- Potentially simplify `use-send-message.ts`

---

## Phase 6: Testing & Verification

### Step 6.1: Typecheck
```bash
bun run typecheck
```

### Step 6.2: Lint
```bash
bun run lint --parallel
```

### Step 6.3: Test Features
- [ ] File attachments work (upload, preview, remove)
- [ ] Drag and drop files
- [ ] Voice input records and transcribes
- [ ] Messages display with reasoning, tools, sources
- [ ] Conversation scrolls and exports
- [ ] All new components render correctly

---

## Files to Create

| File | Description |
|------|-------------|
| `packages/ui/src/components/ai-elements/attachments.tsx` | Full Attachments component |
| `packages/ui/src/components/ai-elements/inline-citation.tsx` | Inline citations |
| `packages/ui/src/components/ai-elements/shimmer.tsx` | Loading shimmer |
| `packages/ui/src/components/ai-elements/checkpoint.tsx` | Progress checkpoints |
| `packages/ui/src/components/ai-elements/queue.tsx` | Queue display |
| `packages/ui/src/components/ai-elements/task.tsx` | Task items |
| `packages/ui/src/components/ai-elements/confirmation.tsx` | Confirmation dialog |
| `packages/ui/src/components/ai-elements/context.tsx` | Context display |
| `packages/ui/src/components/ai-elements/plan.tsx` | Plan display |
| `packages/ui/src/components/ai-elements/audio-player.tsx` | Audio playback |
| `packages/ui/src/components/ai-elements/transcription.tsx` | Transcription display |

## Files to Modify

| File | Changes |
|------|---------|
| `packages/ui/src/components/ai-elements/prompt-input.tsx` | Full implementation with attachments |
| `packages/ui/src/components/ai-elements/message.tsx` | Add MessageResponse, etc. |
| `packages/ui/src/components/ai-elements/speech-input.tsx` | Full Web Speech API implementation |
| `packages/ui/src/components/ai-elements/index.ts` | Export all new components |
| `apps/notes/app/components/chat/ChatInput.tsx` | Use full PromptInput |
| `apps/notes/app/components/chat/ChatMessage.tsx` | Use Message components |
| `apps/notes/app/components/chat/ChatAttachments.tsx` | Use Attachments |
| `apps/notes/app/components/chat/AttachmentsPreview.tsx` | DELETE - replaced by AI Elements |
| `apps/notes/app/components/chat/FileUploader.tsx` | DELETE - replaced by AI Elements |

## Not Implementing

Based on user requirements:
- **Model Selector** - Only supporting one model (no model selection UI)
- Agent category (Artifact, CodeBlock, etc.) - Not relevant for notes app
- Workflow category (Canvas, Node, etc.) - Not relevant for notes app

---

## Implementation Order

1. **Phase 1**: Create core AI Elements components (Attachments, full PromptInput, Message enhancements)
2. **Phase 2**: Update chat components to use new AI Elements
3. **Phase 3**: Add advanced components (Inline Citation, Shimmer, etc.)
4. **Phase 4**: Enhance voice features
5. **Phase 5**: Update app integration
6. **Phase 6**: Test and verify
