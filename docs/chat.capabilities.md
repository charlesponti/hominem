# Chat Capabilities

A client-side capability inventory for chat: what Omiro's chat client owns and
how verified each piece is, followed by how `apps/web`'s chat client compares.
Server and database implementation are outside scope except where the client
contract identifies the transport boundary. Motion/UX design decisions live in
[chat.design.md](chat.design.md).

## Status legend

- **Implemented** — client behavior is wired and has focused automated or flow
  coverage.
- **Partial** — the client has a visible or structural seam, but the behavior
  is incomplete, only conditionally wired, or lacks acceptance coverage.
- **Unverified** — code or a client contract suggests the capability, but there
  is no confirmed Omiro acceptance path in the current inventory.

## Part I — Omiro capabilities

### User journeys and entry points

| Journey | User-facing behavior | Client ownership | State, cache, and handoff | Status |
| --- | --- | --- | --- | --- |
| Capture from All | The mixed composer accepts ordinary text, attachments, and voice input; the user can choose or infer chat versus note submission. | `components/home/HomeScreen.tsx`, `components/composer/Composer.tsx`, `components/composer/useComposerController.ts`, `components/composer/useComposerSubmission.ts` | Inbox data uses `inboxKeys`; draft text and chat-composer attachment handoff use `services/navigation/launch-state.ts`. | Implemented |
| Resume or start a chat | The protected root opens the latest active chat. With no active chat it opens New Chat, whose first accepted message creates the conversation and replaces the blank route. | `components/home/ChatEntryScreen.tsx`, `components/home/NewChatScreen.tsx`, `components/composer/useStartChatSubmission.ts`, `services/chat/use-start-chat.ts` | `chatKeys.latest` resolves the root; `chatKeys.activeChat(id)` and `chatKeys.messages(id)` are seeded from the SSE `accepted` event. `/api/chats/start-stream` is the transport boundary. | Implemented |
| Browse active chats | Chats is the paginated active-conversation history. A row opens its persisted route and long press archives it. | `components/chat/ChatsScreen.tsx`, `services/chat/use-chats-list.ts` | Cursor pages use `chatKeys.list`; archive invalidates the pages and rolls back its inbox removal on error. | Implemented |
| Open chat detail | Chat detail is reached at `/(protected)/inbox/chat/[id]`; the compatibility `/inbox` route redirects to All. | `app/(protected)/inbox/[kind]/[id].tsx`, `components/inbox/ChatScreen.tsx`, `services/navigation/routes.ts` | `useActiveChat(id)` and `useChatMessages({ chatId })` hydrate the screen; resume state is written and cleared by `launch-state.ts`. | Implemented |
| Resume/deep link | The current chat is remembered as a resume target and content routes preserve the `chat` kind and ID. Missing or deleted conversations offer a back-to-All recovery state. | `components/inbox/ChatScreen.tsx`, `services/navigation/launch-state.ts`, `services/navigation/routes.ts` | Resume target is local state; 404 handling derives `isConversationGone` from active-chat or message errors. | Implemented |
| Archived chats | Archived chats are available from Settings and are indexed separately from the active inbox. | `hooks/useArchivedChats.ts`, `services/chat/chat-lists.ts`, `app/(protected)/settings/archived-chats.tsx` | `chatKeys.archivedChats` stores IDs; archived chat details are seeded into `chatKeys.detail(id)`. | Implemented |

### Chat detail capabilities

| Capability | Entry point and behavior | Client owner | Loading/error/interaction states | Coverage | Status |
| --- | --- | --- | --- | --- | --- |
| Load message history | Fetch up to 50 messages, remove tool-role rows from the render model, preserve render keys, and support pull-to-refresh. | `services/chat/use-chat-messages.ts`, `hooks/use-chat-data.ts`, `components/chat/chat-message-list.tsx` | Initial loading, restored cached data, refresh, empty conversation, missing conversation, and retry are represented in the screen. | `tests/services/chat/use-chat-messages.test.tsx`, `tests/services/chat/chat-messages.test.ts`, restored-query tests | Implemented |
| Send a message | Chat composer submits text, uploaded file IDs, referenced note IDs, and optional response modality. | `components/composer/useComposerSubmission.ts`, `services/chat/use-send-message.ts`, `components/inbox/ChatScreen.tsx` | Optimistic user row, offline rejection, generation stages, committed assistant reply, cancellation, failure, and retry. | `tests/services/chat/use-send-message.test.tsx`, `tests/services/chat/stream-sse.test.ts` | Implemented |
| Start-chat streaming | The All and New Chat composers use a separate stream that creates the chat and streams the first assistant response after acceptance. | `services/chat/use-start-chat.ts` | Navigation occurs only after accepted user-message state; incomplete starts are rejected without a route handoff. | `tests/services/chat/use-start-chat.test.tsx`, `tests/flows/chat-back-to-all.yaml`, `tests/flows/chat-first-home.yaml` | Implemented |
| Cancel generation | The active generation can be stopped through the generation cancel endpoint and local `AbortController`. | `services/chat/use-send-message.ts`, `services/chat/use-regenerate-message.ts`, `components/chat/chat-message-list.tsx` | `preparing`, active status, `stopping`, `cancelled`, and cancel failure are modeled by `ChatGenerationState`. | Focused hook tests exist; no dedicated Maestro cancellation flow found. | Partial |
| Retry failed response | Failed user sends and interrupted assistant responses expose retry actions; last input or target message is retained locally. | `components/chat/chat-message.tsx`, `services/chat/use-send-message.ts`, `components/chat/chat-message-list.tsx` | Failed rows, interrupted rows, and retry callbacks are rendered; retry concurrency and recovery need flow verification. | Hook/service tests cover adjacent stream behavior; no dedicated acceptance flow found. | Partial |
| Regenerate assistant response | An assistant message can request a replacement response through the regeneration stream. | `services/chat/use-regenerate-message.ts`, `components/inbox/ChatScreen.tsx`, `components/chat/chat-message-actions.tsx` | Active generation, cancellation, failure, retry, and cache replacement are modeled. Ordering semantics are governed by the open regeneration task documents. | `tests/services/chat/*` includes stream and haptic coverage; no dedicated regeneration Maestro flow found. | Partial |
| Edit user message | A user message opens an edit modal, trims non-empty content, optimistically updates the message, and rolls back on failure. | `components/chat/chat-message.tsx`, `components/chat/chat-message-edit-modal.tsx`, `services/chat/use-edit-message.ts` | Edit is disabled while streaming; mutation invalidates the message query after settle. | `tests/services/chat/use-edit-message.test.tsx` | Implemented |
| Delete message | Message rows accept an optional delete callback and render a destructive action when supplied. | `components/chat/chat-message.tsx`, `components/chat/chat-message-actions.tsx`, `components/chat/chat-message-list.tsx` | `ChatScreen` currently passes edit/regenerate/retry but not `onDelete`; no Omiro client delete mutation was found. | No client delete acceptance coverage found. | Partial — UI seam only |
| Copy/share response | Assistant message actions copy text or create a temporary text file for the native share sheet. | `components/chat/chat-copy-button.tsx`, `components/chat/chat-share-button.tsx`, `hooks/use-message-actions.ts` | Only non-empty, non-streaming assistant content is eligible. | No focused chat share/copy flow found. | Partial |
| Speak response | Assistant messages with audio URLs can start/stop native playback keyed by message ID. | `components/chat/chat-speak-button.tsx`, `components/media/useAudioPlayback.ts`, `components/media/audio-playback.service.ts` | Playback is singleton-style; active message and playing state are externally observable. | Audio playback tests exist outside the chat flow; no dedicated chat speech acceptance flow found. | Partial |
| Message presentation | User/assistant bubbles render Markdown, timestamps, reasoning, referenced notes, tool calls, focus items, thinking state, interruption state, and debug details. | `components/chat/chat-message.tsx`, `chat-message-content.tsx`, `chat-message-tool-calls.tsx`, `chat-message-referenced-notes.tsx`, `chat-message-debug.tsx` | Streaming suppresses Markdown enhancement; reduced motion changes transitions; action controls activate per message. | `tests/components/chat/*` and message/action unit coverage are present, but broad visual state coverage is absent. | Implemented |
| Search messages | Toolbar search opens a modal, debounces input, queries message search, and swaps the displayed list for results. | `hooks/use-chat-search.ts`, `components/chat/chat-search-modal.tsx`, `components/chat/chat-message-list.tsx` | Empty query keeps the local list; search close clears query; empty results have dedicated copy. | `tests/hooks/use-chat-search.test.ts`, `tests/hooks/use-chat-search.render.test.tsx` | Implemented |
| Response length | Settings sheet persists short/medium/long response length for subsequent generation requests. | `components/chat/chat-settings-sheet.tsx`, `hooks/use-chat-response-length.ts` | Default medium; slider selection and dismiss/done behavior are local-persistence states. | `tests/hooks/use-chat-response-length.test.tsx` | Implemented |
| Conversation actions | Toolbar exposes search, settings, debug, chat-to-note/task transforms, and archive. | `components/chat/chat-actions-menu.tsx`, `components/chat/conversation-actions.model.ts`, `components/inbox/ChatScreen.tsx` | Actions disappear for missing conversations; archive optimistically removes inbox item and returns to All. | Archive unit tests and chat Maestro flows exist; menu-state acceptance coverage is incomplete. | Implemented |
| New chat from detail | Toolbar opens the focused New Chat route without creating an empty persisted conversation. | `components/inbox/ChatScreen.tsx`, `components/home/NewChatScreen.tsx` | The route is replaced only after the start stream emits its accepted user message. | `tests/services/chat/use-start-chat.test.tsx` | Implemented |
| Auto-title | The first meaningful message can replace the default chat title while preserving an existing custom title. | `services/chat/use-auto-update-chat-title.ts`, `services/chat/chat-title.ts`, `components/composer/useComposerSubmission.ts` | Cache is updated optimistically; failed patch invalidates the active-chat query. | `tests/services/chat/use-auto-update-chat-title.test.tsx`, `tests/services/chat/chat-title.test.ts` | Implemented |
| Task extraction | Chat actions can extract tasks from the conversation and show a review overlay before content creation. | `hooks/use-task-extraction.ts`, `components/chat/chat-review-overlay.tsx`, `components/chat/chat-activity-timeline.tsx` | Pending review, accept, reject, loading, error, and inbox invalidation are modeled. | `tests/hooks/use-task-extraction*.test*`, `tests/flows/chat-to-note.yaml` | Partial |
| Chat to note | Conversation actions build a note draft from the transcript and navigate to the note draft sheet. | `components/chat/build-note-draft.ts`, `components/inbox/ChatScreen.tsx`, `app/(protected)/note-draft-sheet.tsx` | Empty transcript is rejected; truncation and title are carried in route params. | `tests/components/chat/build-note-draft.test.ts`, `tests/flows/chat-to-note.yaml` | Implemented |
| Tool-call approval | Message data supports tool calls and the client renders their details. | `components/chat/chat-message-tool-calls.tsx`, `services/chat/chatMessages.ts` | No client approval/rejection action was found in the inspected Omiro surface. | No Omiro acceptance coverage found. | Unverified |

### Composer capabilities used by chat

| Capability | Client ownership | Chat-specific behavior | Status |
| --- | --- | --- | --- |
| Text draft | `components/composer/ComposerInput.tsx`, `useComposerDraft.ts`, `ComposerContext.tsx` | Chat mode owns a draft per `chatId`; submission clears it after the send handoff. | Implemented |
| Chat/note kind selection | `ComposerKindToggle.tsx`, `ComposerKindSubmitPill.tsx`, `composerInference.ts` | Inbox mode can infer or manually select chat versus note; chat detail is fixed to chat mode. | Implemented |
| File/media attachments | `ComposerAttachButton.tsx`, `ComposerAttachmentRow.tsx`, `services/files/use-file-upload.ts` | Upload completion produces file IDs passed into start/send chat payloads; busy state disables conflicting actions. | Partial — no dedicated chat attachment flow found. |
| Voice capture and walkie-talkie | `useVoiceComposerInput.ts`, `useVoiceRecorder.ts`, `VoiceRecordingPanel.tsx` | Chat can auto-submit a cleaned transcript with `responseModality: 'audio'`; normal voice input inserts text into the draft. | Partial — client path exists, acceptance coverage is not chat-specific. |
| Inline enhance | `services/ai/use-inline-enhance.ts`, `components/composer/ComposerToolbar.tsx` | Composer can open enhancement while composing; this is shared with notes and not a chat transcript action. | Partial |
| New-message entrance | `components/chat/chat-message.tsx`, `components/chat/chat-message-list.tsx` | A just-sent user row lifts and fades in at its own list position (no composer-sourced flight); historical rows mount with no entrance. See [chat.design.md](chat.design.md). | Implemented — no dedicated motion unit test or simulator acceptance flow found. |

### Query and local-state boundaries

- `chatKeys.activeChat(id)` stores the active chat record.
- `chatKeys.messages(id)` stores mapped renderable messages and is used for
  optimistic sends, edit rollback, regeneration replacement, and restored
  query state.
- `chatKeys.archivedChats` stores the archived ID index; archived records are
  cached separately by detail ID.
- `chatKeys.list` stores cursor-paginated active-chat pages; `chatKeys.latest`
  stores the root-resolution page independently from the history screen.
- `inboxKeys.page(...)` is the mixed All list. Chat create, commit, archive,
  task extraction, and note transformation invalidate or patch inbox data.
- `services/navigation/launch-state.ts` owns resume targets, All and New Chat
  drafts, and chat-composer attachment handoff state. Route params carry only
  deep-linkable content IDs and draft-sheet values.
- `services/chat/stream-sse.ts` is the shared transport parser for both the
  start-chat and existing-chat generation paths. The client consumes accepted,
  status, committed, cancelled, and error lifecycle events.

### Verification matrix

#### Existing focused coverage

| Area | Current tests/flows |
| --- | --- |
| Chat services | `tests/services/chat/use-chat-messages.test.tsx`, `use-send-message.test.tsx`, `use-start-chat.test.tsx`, `use-edit-message.test.tsx`, `use-chat-archive.test.tsx`, `use-auto-update-chat-title.test.tsx`, `chat-title.test.ts`, `chat-messages.test.ts`, `stream-sse.test.ts`, `assistant-completion-haptic-gate.test.ts` |
| Chat hooks | `tests/hooks/use-chat-data.test.tsx`, `use-chat-search.test.ts`, `use-chat-search.render.test.tsx`, `use-chat-response-length.test.tsx`, `useArchivedChats.test.tsx`, `use-task-extraction*.test*` |
| Chat component logic | `tests/components/chat/build-note-draft.test.ts`, inbox thread view-model tests, message-action tests |
| Maestro flows | `tests/flows/chat-back-to-all.yaml`, `chat-to-note.yaml`, `chat-first-home.yaml`, plus chat states in `screenshot-tour.yaml` |
| Persistence/navigation | `tests/services/query-persistence.test.ts`, `tests/services/navigation/launch-state.test.ts`, `tests/services/navigation/routes.test.ts` |

#### Acceptance gaps

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

### Open client questions

- Is message deletion intended for Omiro? The component contract exposes it,
  but there is no client mutation or screen callback.
- Are tool-call approval and rejection intentionally API-only, or should Omiro
  expose controls in `MessageToolCalls`?
- Should cancellation and regeneration receive dedicated Maestro flows before
  either capability is considered fully verified?
- Should chat attachment and voice behavior be treated as chat acceptance
  criteria, or only as shared-composer coverage?

### Recommended follow-up order

1. Resolve the delete and tool-call ownership questions so the inventory does
   not overstate available message actions.
2. Close acceptance gaps around generation lifecycle, especially cancellation,
   retry, regeneration, and offline recovery.
3. Verify shared composer capabilities in chat mode: attachments, voice, and
   audio response submission.
4. Add the remaining navigation, action-menu, accessibility, and visual-state
   evidence.

## Part II — Web parity (`apps/web` vs. Omiro)

This part covers user-facing behavior and client ownership only. A feature is
**missing** when no web implementation was found, **partial** when a web seam
exists but does not match Omiro's behavior or is stubbed, and **present** when
the web client has a working equivalent. Remaining implementation work for
this gap map is tracked as standardized Linear-style tasks in `docs/tasks/`
(`21-composer-parity.md`, `22-motion-and-persistence.md`,
`23-web-chat-verification.md`); earlier phases of this project were completed
and their task specs removed.

### Executive summary

`apps/web` currently supports the core conversation loop: open a chat, load up
to 50 messages, send text with files or note references, stream a committed
assistant response, cancel the browser request, use browser speech-to-text,
play generated speech, and approve or reject tool calls.

The largest missing areas are:

1. Omiro's mixed All/inbox capture model and chat-to-note/task workflows.
2. Message lifecycle actions: edit, delete, retry, and regenerate.
3. Conversation management: search, response settings, debug, title behavior,
   and complete archive handling.
4. Omiro-specific voice/audio behavior, offline/recovery states, and acceptance
   coverage.

### Feature gap map

| Omiro capability | Web status | Evidence in `apps/web` | Gap or parity note |
| --- | --- | --- | --- |
| Mixed All/inbox surface | **Missing** | `routes/home.tsx` redirects to the latest chat or creates one; `routes/layout.tsx` renders chat navigation. | Web has no Omiro-style mixed chronological stream of chats and notes, and no equivalent inbox entity adapter. |
| Inbox composer with chat/note inference | **Missing** | The only chat composer is in `routes/chat/chat.$chatId.tsx`; web has no shared mixed composer or kind toggle. | Missing Omiro's entry-mode inference, sticky manual chat/note selection, inbox draft persistence, and note submission path. |
| Start chat from the mixed composer | **Partial** | `components/chat-navigation.tsx` creates an empty chat; `routes/home.tsx` can create and redirect. | Web can create a blank chat, but does not submit the first message through Omiro's accepted-message start stream from a mixed composer. |
| Browse recent chats | **Present** | `hooks/use-chats.ts`, `components/chat-navigation.tsx`, `routes/chats.tsx`. | Web has sidebar and paginated chat list equivalents, but not the mixed All stream or Omiro activity/indexing model. |
| Chat detail route | **Present** | `routes/chat/chat.$chatId.tsx`, route registration in `app/routes.ts`. | Direct web route exists at `/chat/:chatId`; it does not use Omiro's protected inbox route or resume-target state. |
| Resume target and deep-link recovery | **Partial** | Direct `/chat/:chatId` navigation works; the route loader seeds messages. | No equivalent of Omiro's local resume target, consumed launch state, missing-conversation screen, or `kind`-preserving content route was found. |
| Load history and refresh | **Partial** | `lib/hooks/use-chat-messages.ts` fetches 50 messages with React Query; loader provides initial data. | No Omiro-style pull-to-refresh, restored-query loading distinction, explicit empty state, or visible retry state was found. |
| Send message with optimistic user row | **Present** | `routes/chat/chat.$chatId.tsx`, `lib/hooks/use-stream-message.ts`. | Web seeds an optimistic row and reconciles it on `accepted`; it does not carry Omiro's generation-stage model or durable failed-row behavior. |
| Assistant streaming lifecycle | **Partial** | `use-stream-message.ts` consumes `accepted`, `committed`, and `error`; the route shows `Shimmer` while thinking. | Web only renders the committed message, not Omiro's explicit preparing/saving lifecycle, cancellation recovery, or shared SSE parser. |
| Cancel generation | **Partial** | `use-stream-message.ts` creates an `AbortController`; `PromptInputSubmit` exposes stop while streaming. | The controller signal is not passed into the RPC request, and the web client does not call the generation cancel endpoint, so server-side cancellation and durable cancellation state are not mirrored. |
| Retry failed send/response | **Missing** | No retry control or retry mutation was found in `routes/chat/chat.$chatId.tsx`. | Missing Omiro failed user-row retry, interrupted assistant retry, retained last input, and retry acceptance states. |
| Regenerate assistant response | **Missing** | No web regeneration hook, route action, or message control was found. | Missing regeneration transport, cache replacement, cancellation, retry, and approved ordering semantics. |
| Edit user message | **Partial** | `useChatMessages.ts` exposes `updateMessage`, but its implementation is `async () => undefined`. | No edit UI or real PATCH mutation is wired. |
| Delete message | **Partial** | `useChatMessages.ts` exposes `deleteMessage`, but its implementation is `async () => undefined`. | No delete UI or real client mutation is wired. |
| Copy/share message | **Missing** | No chat message copy/share controls or message action component was found. | Missing native/web clipboard and share/download behavior for individual responses. `ConversationDownload` only downloads the whole conversation and is not used by the chat route. |
| Speech playback | **Present** | `components/chat/speech-player.tsx`, `lib/telemetry/speech.ts`, route integration. | Web has a richer explicit player with loading/playing/error states; it uses the speech endpoint on demand rather than Omiro's message audio-file field. |
| Voice input | **Partial** | `lib/hooks/use-speech-to-text.ts`, chat route microphone control. | Browser speech recognition inserts text, but web lacks Omiro's recording panel, native iOS transcription boundary, cleanup pipeline, walkie-talkie mode, and audio-response submission. |
| File attachments | **Present** | `lib/hooks/use-file-upload.ts`, chat route file input and attachment chips. | Upload, removal, and error display exist; dedicated parity coverage for chat attachment failure/retry is absent. |
| Referenced notes | **Present** | `useNoteSearch`, hashtag suggestions, selected-note chips, and `noteIds` send payload. | Web has note references, but not Omiro's rendered referenced-note presentation or chat-to-note ownership/link flows. |
| Reasoning display | **Partial** | `components/ai-elements/reasoning.tsx` exists. | The chat route renders `message.content` and tool calls but does not render the message `reasoning` field through the `Reasoning` component. |
| Tool-call rendering | **Present** | `components/ai-elements/tool.tsx`, route tool-call rendering. | Web renders pending/completed/rejected calls and previews. |
| Tool-call approval/rejection | **Present** | `lib/hooks/use-tool-call-respond.ts`, `ToolApprovalActions`. | Web has the client control Omiro currently lacks; response streaming is drained and queries invalidated rather than rendered incrementally. |
| Search within chat | **Missing** | No chat search hook, dialog, or message-search query was found. | Missing debounced search, result count, empty results state, and display-list swapping. |
| Response-length settings | **Missing** | No chat response-length state or settings sheet was found. | Web does not expose Omiro's short/medium/long preference or include `responseLength` in its stream payload. |
| Conversation debug mode | **Missing** | No debug toggle or message-debug rendering is wired in the route. | Missing user-accessible debug toggle and diagnostic message details. |
| Archive from chat/inbox | **Partial** | `hooks/use-chats.ts` has `useArchiveChat`; archived route and settings page exist. | The hook invalidates the list only; the web UI does not expose archive from chat detail/list rows, optimistically remove items, clear resume state, or route away after archive. |
| Archived chat list | **Present** | `hooks/use-account-settings.ts`, `components/account/settings-page.tsx`, `routes/settings.archived-chats.tsx`. | Web lists recent archived chats and links to them; restoration/unarchive behavior is absent in both clients' current inventory. |
| New chat from detail | **Missing** | New chat exists in `ChatNavigation`, not in `chat.$chatId.tsx`. | Missing the detail-toolbar action and route-local pending behavior. |
| Automatic title update | **Partial** | Chat creation uses the fixed title `'New chat'`; no auto-title hook was found. | Missing Omiro's first-message title normalization, cache update, and preservation of custom titles. |
| Chat-to-note transform | **Missing** | No chat transform action, draft builder, or note-draft route handoff was found. | Missing transcript extraction, empty-chat guard, truncation/title handling, and editable note handoff. |
| Chat task extraction/review | **Missing** | No chat task-extraction hook or review overlay was found. | Missing pending review, accept/reject, task creation, error/retry, and inbox refresh behavior. |
| Linked note discussion flows | **Partial** | Web can seed a `noteId` query param and search/select notes in the composer. | Missing note-owned chat lifecycle, chat preview in the mixed inbox, summarize-to-note behavior, and linked navigation contract. |
| New-message entrance | **Missing** | Web uses `use-stick-to-bottom` and a shimmer; no Omiro-style new-message row entrance was found. | Missing the new-message entrance animation, reduced-motion contract, and interruption behavior — see [chat.design.md](chat.design.md). |
| Offline state | **Missing** | No NetInfo-equivalent or explicit offline chat state was found. | Web stream failures become a generic hook error; draft preservation and offline-specific messaging are not implemented. |
| Query persistence/restoration | **Partial** | React Router loader seeds initial messages and React Query caches them. | Missing Omiro's persisted query-state handling, local draft/attachment handoff, and restored-versus-initial loading semantics. |
| Chat accessibility/test IDs | **Partial** | Web uses semantic controls and one `data-testid="chat-file-input"`; chat controls mostly use labels/tooltips. | Omiro-specific test IDs and broad acceptance states are not mirrored; no chat-specific web flow tests were found. |

### Missing web ownership by subsystem

#### Entry and navigation

The web currently separates chat navigation from the rest of the product:

- `components/chat-navigation.tsx` owns new-chat creation and a recent-chat
  dropdown.
- `routes/chats.tsx` owns a paginated chat-only list.
- `routes/home.tsx` redirects to a chat rather than owning a mixed capture
  surface.
- `routes/chat/chat.$chatId.tsx` owns the entire detail UI and most local state.

To reach Omiro parity, the missing web seams are a shared mixed composer,
mixed inbox adapter, note/chat submission ownership, resume state, and a
detail-level action surface.

#### Message lifecycle

The web has one stream hook, `useStreamMessage`, but no equivalent of Omiro's
separate send, regenerate, edit, and archive services. `useChatMessages`
advertises `deleteMessage` and `updateMessage` but both are no-op placeholders.
This is the highest-risk parity gap because the UI contract suggests actions
that cannot change persisted state.

#### Conversation actions

There is no web chat action menu equivalent to Omiro's search/settings/debug/
transform/archive menu. Archive exists as a hook and destination page, but it
is not exposed from the active conversation. Search, response length, debug,
auto-title, note transformation, and task extraction have no web owner.

#### Shared composer capabilities

Web has file upload and browser speech-to-text, but these are implemented as
detail-local controls. They do not share Omiro's composer controller model for
draft persistence, attachment lifecycle, voice cleanup, walkie-talkie audio
responses, or mixed chat/note submission.

### Verification gap

The current web test inventory contains only focused speech-player and speech
telemetry tests:

- `components/chat/speech-player.test.tsx`
- `lib/telemetry/speech.test.ts`

No chat route, stream lifecycle, message mutation, attachment, tool approval,
archive, navigation, or accessibility acceptance tests were found under
`apps/web`. The following should be treated as unverified even where code is
present:

- first send and committed assistant response;
- browser cancellation and server cancellation semantics;
- attachment upload/removal/failure;
- voice transcription and draft insertion;
- tool approval/rejection and follow-up response;
- archived-chat navigation and active-list removal;
- missing/deleted chat recovery;
- large-message scrolling and responsive composer behavior.

### Recommended implementation order

1. Establish a real web chat state boundary: replace the no-op message
   mutations, add explicit stream error/cancellation state, and preserve drafts
   on failure.
2. Add the detail action surface: retry, regenerate, edit, delete, copy/share,
   search, response settings, debug, and archive.
3. Build the mixed All/inbox composer and list adapter so chat creation,
   notes, drafts, and navigation follow one product entry model.
4. Add chat-to-note and task-extraction/review flows, then linked note
   discussion behavior.
5. Reconcile voice, audio response, motion, offline, accessibility, and
   acceptance-test parity.
