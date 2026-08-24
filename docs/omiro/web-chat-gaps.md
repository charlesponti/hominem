# Omiro chat features missing from `apps/web`

This map compares the client-focused Omiro inventory in
[the Omiro chat inventory](./omiro-chat-inventory.md) with the current web
client. It covers user-facing behavior and client ownership only. A feature is
**missing** when no web implementation was found, **partial** when a web seam
exists but does not match Omiro's behavior or is stubbed, and **present** when
the web client has a working equivalent.

Implementation work is split into standardized Linear-style tasks in
[Web Chat Parity](./tasks/10-web-chat-parity/README.md).

## Executive summary

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

## Feature gap map

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
| Motion handoff | **Missing** | Web uses `use-stick-to-bottom` and a shimmer; no Omiro composer-to-transcript motion layer was found. | Missing kinetic correspondence, message handoff overlay, reduced-motion contract, and interruption behavior. |
| Offline state | **Missing** | No NetInfo-equivalent or explicit offline chat state was found. | Web stream failures become a generic hook error; draft preservation and offline-specific messaging are not implemented. |
| Query persistence/restoration | **Partial** | React Router loader seeds initial messages and React Query caches them. | Missing Omiro's persisted query-state handling, local draft/attachment handoff, and restored-versus-initial loading semantics. |
| Chat accessibility/test IDs | **Partial** | Web uses semantic controls and one `data-testid="chat-file-input"`; chat controls mostly use labels/tooltips. | Omiro-specific test IDs and broad acceptance states are not mirrored; no chat-specific web flow tests were found. |

## Missing web ownership by subsystem

### Entry and navigation

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

### Message lifecycle

The web has one stream hook, `useStreamMessage`, but no equivalent of Omiro's
separate send, regenerate, edit, and archive services. `useChatMessages`
advertises `deleteMessage` and `updateMessage` but both are no-op placeholders.
This is the highest-risk parity gap because the UI contract suggests actions
that cannot change persisted state.

### Conversation actions

There is no web chat action menu equivalent to Omiro's search/settings/debug/
transform/archive menu. Archive exists as a hook and destination page, but it
is not exposed from the active conversation. Search, response length, debug,
auto-title, note transformation, and task extraction have no web owner.

### Shared composer capabilities

Web has file upload and browser speech-to-text, but these are implemented as
detail-local controls. They do not share Omiro's composer controller model for
draft persistence, attachment lifecycle, voice cleanup, walkie-talkie audio
responses, or mixed chat/note submission.

## Verification gap

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

## Recommended implementation order

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
