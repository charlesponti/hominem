# Omiro chat feature inventory

This is a client-side inventory of Omiro chat behavior. It records the user
entry point, client owner, state and cache boundary, and current verification
status. Server and database implementation are outside scope except where the
client contract identifies the transport boundary.

## Status legend

- **Implemented** — client behavior is wired and has focused automated or flow
  coverage.
- **Partial** — the client has a visible or structural seam, but the behavior
  is incomplete, only conditionally wired, or lacks acceptance coverage.
- **Unverified** — code or a client contract suggests the capability, but there
  is no confirmed Omiro acceptance path in the current inventory.

## User journeys and entry points

| Journey | User-facing behavior | Client ownership | State, cache, and handoff | Status |
| --- | --- | --- | --- | --- |
| Capture from All | The mixed composer accepts ordinary text, attachments, and voice input; the user can choose or infer chat versus note submission. | `components/home/HomeScreen.tsx`, `components/composer/Composer.tsx`, `components/composer/useComposerController.ts`, `components/composer/useComposerSubmission.ts` | Inbox data uses `inboxKeys`; draft text and chat-composer attachment handoff use `services/navigation/launch-state.ts`. | Implemented |
| Start a chat | A chat submission creates the conversation, waits for the accepted durable user message, clears the composer, invalidates the inbox, and navigates to chat detail. | `components/composer/useStartChatSubmission.ts`, `services/chat/use-start-chat.ts` | `chatKeys.activeChat(id)` and `chatKeys.messages(id)` are seeded from the SSE `accepted` event; `/api/chats/start-stream` is the transport boundary. | Implemented |
| Browse recent chats | All shows recent mixed chat/note items; a chat row opens its persisted route and supports a long-press archive action. | `services/inbox/use-inbox-stream-items.ts`, `components/inbox/InboxStreamItem.tsx` | `inboxKeys.page({ limit: 50 })` and the indexed inbox entity map provide list data; archive removes the item optimistically and rolls back on error. | Implemented |
| Open chat detail | Chat detail is reached at `/(protected)/inbox/chat/[id]`; the compatibility `/inbox` route redirects to All. | `app/(protected)/inbox/[kind]/[id].tsx`, `components/inbox/ChatScreen.tsx`, `services/navigation/routes.ts` | `useActiveChat(id)` and `useChatMessages({ chatId })` hydrate the screen; resume state is written and cleared by `launch-state.ts`. | Implemented |
| Resume/deep link | The current chat is remembered as a resume target and content routes preserve the `chat` kind and ID. Missing or deleted conversations offer a back-to-All recovery state. | `components/inbox/ChatScreen.tsx`, `services/navigation/launch-state.ts`, `services/navigation/routes.ts` | Resume target is local state; 404 handling derives `isConversationGone` from active-chat or message errors. | Implemented |
| Archived chats | Archived chats are available from Settings and are indexed separately from the active inbox. | `hooks/useArchivedChats.ts`, `services/chat/chat-lists.ts`, `app/(protected)/settings/archived-chats.tsx` | `chatKeys.archivedChats` stores IDs; archived chat details are seeded into `chatKeys.detail(id)`. | Implemented |

## Chat detail capabilities

| Capability | Entry point and behavior | Client owner | Loading/error/interaction states | Coverage | Status |
| --- | --- | --- | --- | --- | --- |
| Load message history | Fetch up to 50 messages, remove tool-role rows from the render model, preserve render keys, and support pull-to-refresh. | `services/chat/use-chat-messages.ts`, `hooks/use-chat-data.ts`, `components/chat/chat-message-list.tsx` | Initial loading, restored cached data, refresh, empty conversation, missing conversation, and retry are represented in the screen. | `tests/services/chat/use-chat-messages.test.tsx`, `tests/services/chat/chat-messages.test.ts`, restored-query tests | Implemented |
| Send a message | Chat composer submits text, uploaded file IDs, referenced note IDs, and optional response modality. | `components/composer/useComposerSubmission.ts`, `services/chat/use-send-message.ts`, `components/inbox/ChatScreen.tsx` | Optimistic user row, offline rejection, generation stages, committed assistant reply, cancellation, failure, and retry. | `tests/services/chat/use-send-message.test.tsx`, `tests/services/chat/stream-sse.test.ts` | Implemented |
| Start-chat streaming | Inbox start uses a separate stream that creates the chat and streams the first assistant response after acceptance. | `services/chat/use-start-chat.ts` | Navigation occurs only after accepted user-message state; incomplete starts are rejected without a route handoff. | `tests/services/chat/use-start-chat.test.tsx`, `tests/flows/chat-back-to-inbox.yaml`, `tests/flows/chatgpt-home-inbox.yaml` | Implemented |
| Cancel generation | The active generation can be stopped through the generation cancel endpoint and local `AbortController`. | `services/chat/use-send-message.ts`, `services/chat/use-regenerate-message.ts`, `components/chat/chat-message-list.tsx` | `preparing`, active status, `stopping`, `cancelled`, and cancel failure are modeled by `ChatGenerationState`. | Focused hook tests exist; no dedicated Maestro cancellation flow found. | Partial |
| Retry failed response | Failed user sends and interrupted assistant responses expose retry actions; last input or target message is retained locally. | `components/chat/chat-message.tsx`, `services/chat/use-send-message.ts`, `components/chat/chat-message-list.tsx` | Failed rows, interrupted rows, and retry callbacks are rendered; retry concurrency and recovery need flow verification. | Hook/service tests cover adjacent stream behavior; no dedicated acceptance flow found. | Partial |
| Regenerate assistant response | An assistant message can request a replacement response through the regeneration stream. | `services/chat/use-regenerate-message.ts`, `components/inbox/ChatScreen.tsx`, `components/chat/chat-message-actions.tsx` | Active generation, cancellation, failure, retry, and cache replacement are modeled. Ordering semantics are governed by the open regeneration task documents. | `tests/services/chat/*` includes stream and haptic coverage; no dedicated regeneration Maestro flow found. | Partial |
| Edit user message | A user message opens an edit modal, trims non-empty content, optimistically updates the message, and rolls back on failure. | `components/chat/chat-message.tsx`, `components/chat/chat-message-edit-modal.tsx`, `services/chat/use-edit-message.ts` | Edit is disabled while streaming; mutation invalidates the message query after settle. | `tests/services/chat/use-edit-message.test.tsx`, `docs/tasks/06-chat-message-edit/` | Implemented |
| Delete message | Message rows accept an optional delete callback and render a destructive action when supplied. | `components/chat/chat-message.tsx`, `components/chat/chat-message-actions.tsx`, `components/chat/chat-message-list.tsx` | `ChatScreen` currently passes edit/regenerate/retry but not `onDelete`; no Omiro client delete mutation was found. | No client delete acceptance coverage found. | Partial — UI seam only |
| Copy/share response | Assistant message actions copy text or create a temporary text file for the native share sheet. | `components/chat/chat-copy-button.tsx`, `components/chat/chat-share-button.tsx`, `hooks/use-message-actions.ts` | Only non-empty, non-streaming assistant content is eligible. | No focused chat share/copy flow found. | Partial |
| Speak response | Assistant messages with audio URLs can start/stop native playback keyed by message ID. | `components/chat/chat-speak-button.tsx`, `components/media/useAudioPlayback.ts`, `components/media/audio-playback.service.ts` | Playback is singleton-style; active message and playing state are externally observable. | Audio playback tests exist outside the chat flow; no dedicated chat speech acceptance flow found. | Partial |
| Message presentation | User/assistant bubbles render Markdown, timestamps, reasoning, referenced notes, tool calls, focus items, thinking state, interruption state, and debug details. | `components/chat/chat-message.tsx`, `chat-message-content.tsx`, `chat-message-tool-calls.tsx`, `chat-message-referenced-notes.tsx`, `chat-message-debug.tsx` | Streaming suppresses Markdown enhancement; reduced motion changes transitions; action controls activate per message. | `tests/components/chat/*` and message/action unit coverage are present, but broad visual state coverage is absent. | Implemented |
| Search messages | Toolbar search opens a modal, debounces input, queries message search, and swaps the displayed list for results. | `hooks/use-chat-search.ts`, `components/chat/chat-search-modal.tsx`, `components/chat/chat-message-list.tsx` | Empty query keeps the local list; search close clears query; empty results have dedicated copy. | `tests/hooks/use-chat-search.test.ts`, `tests/hooks/use-chat-search.render.test.tsx` | Implemented |
| Response length | Settings sheet persists short/medium/long response length for subsequent generation requests. | `components/chat/chat-settings-sheet.tsx`, `hooks/use-chat-response-length.ts` | Default medium; slider selection and dismiss/done behavior are local-persistence states. | `tests/hooks/use-chat-response-length.test.tsx` | Implemented |
| Conversation actions | Toolbar exposes search, settings, debug, chat-to-note/task transforms, and archive. | `components/chat/chat-actions-menu.tsx`, `components/chat/conversation-actions.model.ts`, `components/inbox/ChatScreen.tsx` | Actions disappear for missing conversations; archive optimistically removes inbox item and returns to All. | Archive unit tests and chat Maestro flows exist; menu-state acceptance coverage is incomplete. | Implemented |
| New chat from detail | Toolbar creates a blank chat and routes to its detail screen. | `components/inbox/ChatScreen.tsx`, `services/chat/use-create-chat.ts` | Creation disables the action while pending and invalidates inbox data on success. | No dedicated new-chat-from-detail flow found. | Partial |
| Auto-title | The first meaningful message can replace the default chat title while preserving an existing custom title. | `services/chat/use-auto-update-chat-title.ts`, `services/chat/chat-title.ts`, `components/composer/useComposerSubmission.ts` | Cache is updated optimistically; failed patch invalidates the active-chat query. | `tests/services/chat/use-auto-update-chat-title.test.tsx`, `tests/services/chat/chat-title.test.ts` | Implemented |
| Task extraction | Chat actions can extract tasks from the conversation and show a review overlay before content creation. | `hooks/use-task-extraction.ts`, `components/chat/chat-review-overlay.tsx`, `components/chat/chat-activity-timeline.tsx` | Pending review, accept, reject, loading, error, and inbox invalidation are modeled. | `tests/hooks/use-task-extraction*.test*`, `tests/flows/chat-to-note.yaml` | Partial |
| Chat to note | Conversation actions build a note draft from the transcript and navigate to the note draft sheet. | `components/chat/build-note-draft.ts`, `components/inbox/ChatScreen.tsx`, `app/(protected)/note-draft-sheet.tsx` | Empty transcript is rejected; truncation and title are carried in route params. | `tests/components/chat/build-note-draft.test.ts`, `tests/flows/chat-to-note.yaml` | Implemented |
| Tool-call approval | Message data supports tool calls and the client renders their details. | `components/chat/chat-message-tool-calls.tsx`, `services/chat/chatMessages.ts` | No client approval/rejection action was found in the inspected Omiro surface. | No Omiro acceptance coverage found. | Unverified |

## Composer capabilities used by chat

| Capability | Client ownership | Chat-specific behavior | Status |
| --- | --- | --- | --- |
| Text draft | `components/composer/ComposerInput.tsx`, `useComposerDraft.ts`, `ComposerContext.tsx` | Chat mode owns a draft per `chatId`; submission clears it after the send handoff. | Implemented |
| Chat/note kind selection | `ComposerKindToggle.tsx`, `ComposerKindSubmitPill.tsx`, `composerInference.ts` | Inbox mode can infer or manually select chat versus note; chat detail is fixed to chat mode. | Implemented |
| File/media attachments | `ComposerAttachButton.tsx`, `ComposerAttachmentRow.tsx`, `services/files/use-file-upload.ts` | Upload completion produces file IDs passed into start/send chat payloads; busy state disables conflicting actions. | Partial — no dedicated chat attachment flow found. |
| Voice capture and walkie-talkie | `useVoiceComposerInput.ts`, `useVoiceRecorder.ts`, `VoiceRecordingPanel.tsx` | Chat can auto-submit a cleaned transcript with `responseModality: 'audio'`; normal voice input inserts text into the draft. | Partial — client path exists, acceptance coverage is not chat-specific. |
| Inline enhance | `services/ai/use-inline-enhance.ts`, `components/composer/ComposerToolbar.tsx` | Composer can open enhancement while composing; this is shared with notes and not a chat transcript action. | Partial |
| Motion handoff | `useComposerToastHandoff.ts`, `components/chat/chat-motion-overlay.tsx` | Visible chat text can fly from the composer into the transcript without delaying send or navigation. | Implemented — motion unit coverage exists; simulator acceptance is incomplete. |

## Query and local-state boundaries

- `chatKeys.activeChat(id)` stores the active chat record.
- `chatKeys.messages(id)` stores mapped renderable messages and is used for
  optimistic sends, edit rollback, regeneration replacement, and restored
  query state.
- `chatKeys.archivedChats` stores the archived ID index; archived records are
  cached separately by detail ID.
- `inboxKeys.page(...)` is the mixed All list. Chat create, commit, archive,
  task extraction, and note transformation invalidate or patch inbox data.
- `services/navigation/launch-state.ts` owns resume targets, inbox drafts, and
  chat-composer attachment handoff state. Route params carry only deep-linkable
  content IDs and draft-sheet values.
- `services/chat/stream-sse.ts` is the shared transport parser for both the
  start-chat and existing-chat generation paths. The client consumes accepted,
  status, committed, cancelled, and error lifecycle events.

## Verification matrix

### Existing focused coverage

| Area | Current tests/flows |
| --- | --- |
| Chat services | `tests/services/chat/use-chat-messages.test.tsx`, `use-send-message.test.tsx`, `use-start-chat.test.tsx`, `use-edit-message.test.tsx`, `use-chat-archive.test.tsx`, `use-auto-update-chat-title.test.tsx`, `chat-title.test.ts`, `chat-messages.test.ts`, `stream-sse.test.ts`, `assistant-completion-haptic-gate.test.ts` |
| Chat hooks | `tests/hooks/use-chat-data.test.tsx`, `use-chat-search.test.ts`, `use-chat-search.render.test.tsx`, `use-chat-response-length.test.tsx`, `useArchivedChats.test.tsx`, `use-task-extraction*.test*` |
| Chat component logic | `tests/components/chat/build-note-draft.test.ts`, `chat-motion-overlay.test.tsx`, inbox thread view-model tests, message-action tests |
| Maestro flows | `tests/flows/chat-back-to-inbox.yaml`, `chat-to-note.yaml`, `chatgpt-home-inbox.yaml`, plus chat states in `screenshot-tour.yaml` |
| Persistence/navigation | `tests/services/query-persistence.test.ts`, `tests/services/navigation/launch-state.test.ts`, `tests/services/navigation/routes.test.ts` |

### Acceptance gaps

- Add simulator evidence for send, cancellation, retry, and regeneration,
  including interruption, duplicate-submit prevention, and offline recovery.
- Add a chat attachment flow covering picker, upload failure, removal, and
  successful file-ID submission.
- Add a chat voice flow covering permission denial, transcription failure,
  cleanup, normal insertion, and audio-response submission.
- Add message action coverage for copy, share, speak, edit, and the currently
  unwired delete path.
- Add tool-call rendering and approval/rejection coverage, or record the
  capability as intentionally unavailable on the client.
- Add new-chat-from-detail, settings response-length, search, archive, missing
  conversation, and deep-link/resume acceptance states.
- Add visual evidence for message reasoning, references, tool calls, audio,
  failed rows, review overlay, reduced motion, and smallest supported viewport.

## Open client questions

- Is message deletion intended for Omiro? The component contract exposes it,
  but there is no client mutation or screen callback.
- Are tool-call approval and rejection intentionally API-only, or should Omiro
  expose controls in `MessageToolCalls`?
- Should cancellation and regeneration receive dedicated Maestro flows before
  either capability is considered fully verified?
- Should chat attachment and voice behavior be treated as chat acceptance
  criteria, or only as shared-composer coverage?

## Recommended follow-up order

1. Resolve the delete and tool-call ownership questions so the inventory does
   not overstate available message actions.
2. Close acceptance gaps around generation lifecycle, especially cancellation,
   retry, regeneration, and offline recovery.
3. Verify shared composer capabilities in chat mode: attachments, voice, and
   audio response submission.
4. Add the remaining navigation, action-menu, accessibility, and visual-state
   evidence.
