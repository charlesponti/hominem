# Omiro

The mobile app is an Expo app that targets iOS only.

Its governing product, UI, and voice architecture live in the repository
[Bible](../../README.md#the-bible), not in an app-local documentation directory.

## Quick Start

```bash
just setup
just mobile prebuild development
just mobile dev
```

For production release work, use the production native identity:

```bash
just mobile prebuild production
```

## API configuration

`EXPO_PUBLIC_API_BASE_URL` is the sole API address used by the app. Set it in
`.env.development.local`: use `http://localhost:4040` for the iOS Simulator,
or a reachable LAN/tunnel URL for a physical device. Production builds receive
the value from the EAS production environment.

## Working In Zed

Zed can edit the TypeScript/React Native sources directly, but Swift diagnostics for the native modules only work after the generated iOS project exists locally.

If you open one of the files under `modules/*/ios/*.swift` before bootstrapping the native project, Zed may show:

> `No such module 'ExpoModulesCore'`

That error usually means the iOS workspace has not been generated yet, or CocoaPods have not been installed for the local `apps/omiro/ios` directory.

### Recommended setup

1. Install the repo dependencies with `just setup`.
2. Generate the iOS project with `just mobile prebuild development`.
   For production release work, use `just mobile prebuild production` instead so the local `ios` tree matches the store-facing identity.
3. Run the iOS app with `just mobile dev` when you want Expo to finish wiring the native project and launch the app.
4. Open the repo root in Zed after the iOS project has been generated so SourceKit can resolve the native modules.

## Troubleshooting

### `No such module 'ExpoModulesCore'`

- Make sure you have generated the iOS project locally with `just mobile prebuild development`.
- For production build work, regenerate with `just mobile prebuild production` before testing.
- Make sure Xcode command line tools are installed and selected.
- Re-run `just mobile dev` so Expo can refresh the iOS workspace and Pods.

If the error still appears, the local generated `apps/omiro/ios` directory is likely stale and should be regenerated.

## Useful Commands

| Need                                | Run                                           | When to use it                                                     |
| ----------------------------------- | --------------------------------------------- | ------------------------------------------------------------------ |
| Generate the dev iOS project        | `just mobile prebuild development`            | First-time setup or after native config changes during development |
| Generate the production iOS project | `just mobile prebuild production`             | Local CNG verification before a native release                     |
| Launch the iOS app                  | `just mobile dev`                             | Daily mobile development                                           |
| Create and submit a production build | `just mobile release`                         | App Store/TestFlight release builds                                |
| Publish a JS-only OTA update         | `just mobile update "<message>"`              | Ship a fix without a new store build                                |
| Start Metro / Expo                  | `just mobile start`                           | When you want to attach to an existing native build                |
| Read Omiro's governing decisions    | [Repository Bible](../../README.md#the-bible) | Before changing product, UI, or voice behavior                     |

## App architecture

Omiro has one protected Expo Router stack with two primary content destinations. It does not use a persistent tab bar:

- **All** (`/(protected)`) is the signed-in entry point and canonical mixed stream for chats and notes.
- **Time** owns the chronological schedule and time-block detail routes. Unscheduled tasks are a dedicated secondary route, not schedule rows.

The registered `inbox` route redirects to All for compatibility with old links. Chat and note details remain at `/(protected)/inbox/[kind]/[id]`; `kind` is required and persisted. Deep links open the correct destination directly. Settings is a protected form sheet. Onboarding and the UI Lab are also registered protected routes. Keep temporary state in the screen that owns it. Use route parameters only for destinations and deep-linkable detail IDs.

Thread view models only adapt existing chat and note APIs for display. They must not add a kindless query key, persistence model, migration, or conversion path.

Omiro uses Expo Continuous Native Generation. The source of truth in Git is the app config, local Expo Modules, and config plugins. `apps/omiro/ios` is generated output and is excluded from Git and EAS uploads.

Portable motion contracts live in `@ponti-studios/ui` as serializable tokens. Omiro owns the Reanimated adapter, Router gestures, reduced-motion support, and product behavior. Shared UI must not import Expo Router or Reanimated.

Chat detail state is split into focused hooks:

- `useChatData` owns messages and archive.
- `useChatSearch` owns search state and filtering.
- `useChatTransform` owns chat-to-note/task actions and review.
- `useMessageActions` owns copy and share.

React-independent logic belongs in `services/chat/`, such as `filterMessagesByQuery` in `chat-search.ts`, and is unit-tested directly. `ChatDetailScreen` combines the hooks and owns only screen-local state such as composer height and the debug toggle. Do not replace these hooks with one `useChatController`.

## Product language

Use these product terms consistently:

- **All** — Signed-in root surface and mixed recent list of conversations and documents.
- **Time** — The task-and-calendar surface.
- **thread** — Presentation-only language for an existing chat or note; persisted kind never changes.
- **chat** — A conversation.
- **note** — A saved note.
- **composer** — The input surface that creates notes or starts chats.
- **task** — An actionable item derived from a chat, note, or direct creation.
- **time block** — A task or calendar event that occupies, or is intended to occupy, time.
- **settings** — Account and app settings.
- **archived chats** — Conversations intentionally removed from the active flow.

The All composer infers Document for multiline or structured text and Conversation for ordinary single-paragraph text. A visible manual override is sticky for that draft and resets only after clear or successful submit.

## Time

The Time composer is a natural-language input. It can create a task, create a calendar event, find scheduled work, or look for an open time.

Time should feel like one clear schedule with one place to describe what the user wants. The user should not have to decide whether something is a task or event before typing. The system should show what it understood, let the user correct it without losing the original text, and require one clear confirmation.

Use one input boundary. Do not show the same request in a text field, a chip card, and a large button at the same time. Nested surfaces compete for attention and separate the action from the result.

Motion should explain continuity, not compete for attention. It should preserve spatial relationships, keep controls stable while a gesture is active, and respect reduced-motion settings.

### Chat conversation motion

Chat uses **kinetic correspondence**: the composer is the physical source of a
new turn, and the transcript is the durable record. Motion may explain that
handoff, but it must never delay reading, typing, scrolling, or recovering a
message.

- A submitted user message may travel from the composer and settle in its
  transcript position as a short, upward "toast" handoff. The handoff is
  acknowledgement and spatial continuity, not a second copy of the message.
- An active assistant reply is a printer surface. Before text arrives, an
  in-surface activity carriage signals that the reply is being produced. Once
  text arrives, render it immediately as stream data is received; do not batch,
  pace, fade, typewrite, or otherwise withhold readable text.
- The activity carriage uses opacity and vertical transform only. It remains
  compact, never claims false percentage progress, and settles when the stream
  settles. Reduced Motion keeps the state indication but removes travel.
- Historical messages are static when a chat opens. Scrolling, editing,
  retrying, copying, searching, deleting, and error recovery remain direct;
  motion cannot block the action or move the content being read.
- Motion timing, easing, and reduced-motion behavior resolve through the
  portable `@ponti-studios/ui` motion contract and Omiro's Reanimated adapter.
  Do not introduce a chat-local motion token system or experimental shared
  element transitions.

### Composition

The screen has three regions, in this order:

1. **Schedule.** A chronological, infinitely loaded list of calendar events and scheduled tasks, followed by a separate Unscheduled section. This is the main content and stays visible in every composer state.
2. **Result.** When a request has a result, show it as text immediately above the composer on the screen background. Do not put it in a card, toast, sheet, or floating bubble.
3. **Composer.** One bordered input at the bottom safe area. It is the only persistent control for entering a time request.

The composer is not a toolbar or a second screen. It has one input boundary with a 44pt minimum height, a non-tappable `sparkles` icon on the left, and a send control on the right. The send control has no filled background and appears only when the request contains more than whitespace. An empty composer should not show an inactive primary button.

`TimeStream` only renders data; it is not a new persistence model. It combines source-backed tasks and iOS Calendar events into one ordered list. Notes, chats, and Time may share list mechanics such as padding, refresh, pagination, keys, and scroll restoration, but they keep separate adapters, row renderers, and source contracts. Do not create a mixed content/time feed.

Reserve enough bottom space for the composer and current result. Neither may overlap, clip, or hide a list row. The keyboard may cover older schedule content, but it must never cover the active composer, the result under review, its primary action, or its cancel action.

### Schedule canvas

The schedule is one infinitely loaded list because a time block is one product concept.

- Each day starts with a `headline` day label and a `caption` date. The first day is `Today`; the next is `Tomorrow`; later days use weekday and date.
- Every scheduled row uses an eyebrow time above a `body` title. This answers when before what without a separate time column.
- The leading icon is 24pt visual size. It identifies the interaction model: calendar for an external event; open/completed circle for a task. The task completion control remains a distinct 44pt target.
- A location or source line is optional supporting text. It is exactly one line and ellipsizes; it never increases a row's height unpredictably.
- Rows sit directly on `--background`. There are no colored category rails, tile backgrounds, or decorative borders.
- Unscheduled is a separate section after the chronological stream. Its rows do not pretend to have a time, date, or chronological order.

### Composer states

The state must be explicit. Remove controls when they no longer match the current action.

- **Idle**: The input is empty and shows `Add or search anything…`. Hide send. Show the normal schedule, loading state, or empty state. The user can type or dictate if voice input is available.
- **Composing**: Show the raw text and enable send. The input grows to two lines, then scrolls internally. Keep the schedule visible behind the keyboard. The user can edit, submit, or dismiss the keyboard.
- **Parsing**: Keep the submitted text visible but make it read-only. Replace send with a progress indicator. Keep the schedule stable. Allow cancellation and prevent duplicate submits.
- **Draft: create task**: Clear the composer and return it to its idle shape. Show the title as `headline`, one sentence about duration, deadline, or scheduling window, an `Add task` action, and a `Cancel` action. Do not change the schedule until the user confirms.
- **Draft: create event**: Clear the composer and return it to its idle shape. Show the title as `headline`, the time or unresolved broad period as `subhead`, optional location or participants as `caption`, an `Add event` action, and a `Cancel` action. Do not change the schedule until the user confirms.
- **Draft: incomplete event**: Clear the composer and return it to its idle shape. Show the title plus a plain-language missing-detail message, such as `Choose a time to add this event.` Do not show a primary add action. The user can edit the missing detail or cancel.
- **Search answer**: Make the composer ready for another request. Show a direct answer in `body`, followed by matching schedule rows when available. Do not show an `Add` button. Existing rows remain the source of truth.
- **Availability proposal**: Make the composer ready for another request. Show the requested duration and up to three possible openings as plain list rows, not chips. Temporarily emphasize matching intervals by position and text, not with a new category color.
- **Saving**: Keep the composer ready but disabled for duplicate submission. Keep the draft in place and show a spinner without changing the primary action's size. The existing timeline remains stable.
- **Saved**: Return the composer to idle and collapse the transient result. Insert the new task or event at its actual position; a flexible task goes under Unscheduled.
- **Parse/save error**: Restore the raw user input to the editable composer. Show one destructive inline sentence explaining what failed and how to recover. Leave the schedule unchanged.

Do not silently turn `edit_event`, `cancel_event`, or recurring-event requests into creation requests. Show a reviewed result and require explicit confirmation before writing to an external calendar. Use the unified Time Block detail screen. Time must not have a task-only editor or a separate calendar-event editor.

### Time Block detail

Tapping any task or calendar event opens the same source-aware Time Block detail screen. Common time concepts occupy the same positions and use the same language regardless of where they are stored. The reading order is completion and title, exact interval or `Unscheduled`, duration, location and participants, notes, recurrence, source disclosure, and destructive action.

Every populated row is tappable and opens the narrowest native editor that can change that value. Date and time use native Apple controls. Duration uses fixed common values plus a custom value. Location, people, title, and notes use focused text entry. Substantial editing remains on this screen, not in `TaskEditorSheet`.

For tasks, completion is immediate and reversible. A flexible task may show a scheduling window without an exact interval. `Schedule` gives it an exact interval while preserving duration; `Unschedule` removes only that interval and preserves the task, duration, deadline, and scheduling window. Subtasks appear in a final section.

For calendar events, completion is absent. Save, reschedule, recurrence, and delete call EventKit and update the visible agenda only after EventKit confirms success. Read-only events expose their values but disable edits with precise copy explaining why. The source calendar is always visible before a destructive action.

Destructive actions name both the block and its source. A failed save leaves the editor open with local edits intact. Back navigation with unsaved edits asks whether to discard them.

### Time failures and accessibility

- Calendar loading uses timeline-shaped skeleton rows and does not replace the whole screen with a spinner.
- If calendar access is unavailable, Time still shows database-backed tasks and supports flexible tasks. Calendar-only requests state that iOS Calendar access is needed and provide the approved permission route inline.
- Network/model parse failure preserves raw text. A failed parse never creates a task or event and never clears input.
- Calendar and task write failures retain the reviewed draft and its edits. Retrying a calendar write must not create duplicates.
- Offline model-backed requests cannot enter parsing. The composer keeps the text and says that a connection is needed; local actions remain available.
- The composer is named `Add or search time`; the send control is `Interpret time request` while enabled and `Interpreting time request` while parsing.
- Dynamic result changes announce one concise status: `Draft task ready`, `Draft event ready`, `Answer ready`, `Time request failed`, or `Task added` / `Event added`.
- Every tappable detail has a human-readable name and a 44x44pt target. Task/event distinction does not rely on color alone.
- At the largest Dynamic Type size, the result reflows vertically while its primary action and the composer remain reachable.

### Time verification

Time changes require observation on the iPhone simulator at the smallest supported viewport for idle, composing, parsing, errors, cancellation, task and event drafts, detail edits, EventKit writes, search, availability, permission and offline states, and accessibility settings. Maestro flows select app-owned controls by `testID` and assert the visible state after each transition. Screenshots cover idle, composing, parsing, draft, error, and saved states.

## Voice

Voice is a primary way to capture information. People use it when typing is not practical, so the system should respond clearly, protect privacy, and let them recover from errors.

Every recording should end with either useful text or an actionable error. The interface should not wait forever for native work or lose text that was captured successfully.

The voice flow is:

```text
recording
   -> native transcription
   -> raw transcript
   -> composer insertion or task extraction
   -> optional cleanup / persisted tasks
```

- `audio.service.ts` owns the singleton recorder, ownership, metering, file URI, keep-awake behavior, and recorder cleanup.
- `useVoiceRecorder.ts` owns permission, start/stop/cancel, abandonment, and shared React lifecycle behavior.
- `RecordingLevelMeter.tsx` alone consumes live meter data. Other consumers use the stable core snapshot; recording must not cause a 10 Hz app-tree rerender.
- `VoiceTranscriberModule.swift` owns native file validation, on-device asset readiness, audio conversion, stream completion, transcript assembly, and native errors.
- The composer inserts raw text before optional background cleanup. Cleanup never overwrites edits made after insertion.
- Task extraction failure preserves the raw transcript for manual recovery.

The current engine is iOS `SpeechAnalyzer` and is on-device by design. `VoiceTranscriberModule.transcribeFile(fileUri)` settles exactly once and returns non-empty text or a stable actionable error. Native errors use `INVALID_AUDIO_URL`, `RECOGNIZER_UNAVAILABLE`, `MISSING_PERMISSION`, and `EMPTY_TRANSCRIPT`.

Failed transcription and failed task extraction best-effort delete the temporary recording. Logs may record boundary events, but never transcript text, identifying file paths, tokens, cookies, or credentials. `VoiceRecordingPanel` owns stop while recording; the toolbar does not present a competing stop action.

Voice changes require a spoken physical-device recording plus checks for invalid files, denied permission, unavailable recognizer, no speech, recoverable extraction failure, cleanup after failure, and protection against background cleanup overwriting later edits.

## Sentry native build integration

The `@sentry/react-native` Expo config plugin adds two Xcode Run Script phases: one uploads JavaScript sourcemaps during Metro bundling and one uploads native dSYMs after linking. With `@sentry/react-native@8.x`, both scripts resolve the nested `@sentry/cli` correctly under pnpm isolation and warn instead of aborting if resolution fails.

Set `SENTRY_ORG` and `SENTRY_PROJECT` in `eas.json`'s `build.base.env`, `SENTRY_AUTH_TOKEN` as an EAS secret in all three environments, and `EXPO_PUBLIC_SENTRY_DSN` as an EAS variable in all three environments. The DSN is read directly by `services/observability.ts`. `SENTRY_DISABLE_AUTO_UPLOAD` is not part of the current build environment.

## Production verification

The release path is:

```text
local development client -> production TestFlight candidate -> phased App Store release
```

TestFlight candidates and App Store releases use the same production bundle, backend, and native binary. There is no separate staging binary. Start production builds with `just mobile release`, which runs [`.eas/workflows/production-release.yml`](.eas/workflows/production-release.yml): build → verify the build actually resolved to the production app identity (`com.pontistudios.hakumi`, store distribution) → wait for manual approval → submit to TestFlight. The identity check exists because a locally-run production build once silently shipped the dev bundle ID to Apple; the workflow now refuses to submit anything that doesn't match. The marketing version is committed in app config and EAS remotely increments only the iOS build number.

Deliver every production change as a new TestFlight candidate, then approve and release it through App Store Connect. `pnpm build:prod`/`pnpm submit` (which also run the identity check via `scripts/verify-release-identity.mjs`) exist for ad hoc local use, but `just mobile release` is the standard path. Ship JS-only fixes with `just mobile update "<message>"` (`.eas/workflows/ota-update.yml`) instead of a full store build — it only reaches installs already running a native build with matching `runtimeVersion`.
