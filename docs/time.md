# III. Time

The Time composer: the natural-language field that can create a task, create a calendar event, find scheduled work, or ask for an opening. It is the interaction contract for the unified time model in Product. A later implementation may change code, but not this behavior without an explicit product decision.

## The intended feeling

Time should feel like a clear schedule with one calm place to express intent. The user should never have to decide whether something is a task or an event before typing it. They should see what the system understood, correct it without losing their words, and make one deliberate commitment.

The reference image's failure is structural, not decorative: it renders the same thought as a text field, a chip card, and a large button at once. Those three nested surfaces compete for attention, cover the schedule, and make the primary action feel disconnected from the result. Time uses one input boundary and otherwise relies on type, space, and motion.

## Composition

The screen has three regions, in this order:

1. **Schedule canvas.** A chronological, infinitely loaded stream of calendar events and scheduled tasks, followed by the distinct Unscheduled section. This is the durable content and remains the visual anchor in every composer state.
2. **Transient result.** When a request has a result, it appears immediately above the composer as text on the screen background. It is not a card, toast, sheet, or floating answer bubble.
3. **Composer.** The one bordered input at the bottom safe area. It is the only persistent control for entering a time request.

The composer is not a toolbar and does not become a second screen. It has a single 44pt minimum input boundary, a leading `sparkles` affordance that is not tappable, and a trailing send control. There is no filled background behind the send control. The send control is visible only when a non-whitespace request is ready to submit; the empty composer has no dead primary-action shape.

`TimeStream` is a renderer, not a new persistence model. It projects source-backed tasks and iOS Calendar events into one ordered visual stream. Notes, chats, and Time may share list mechanics such as padding, refresh, pagination, keys, and scroll restoration, but they retain separate adapters, row renderers, and source contracts. No mixed content/time feed is introduced.

The schedule must reserve enough bottom inset for the composer and the current transient result. Neither may overlap, clip, or hide a list row. The keyboard may cover older schedule content, but it may never cover the active composer, the result being reviewed, its primary action, or its cancellation control.

## Schedule canvas

The schedule is one infinitely loaded list because a time block is one product concept.

- Each day starts with a `headline` day label and a `caption` date. The first day is `Today`; the next is `Tomorrow`; later days use weekday and date.
- Every scheduled row uses an eyebrow time above a `body` title. This answers the first question—_when?_—before the second—_what?_—without a separate time column.
- The leading icon is 24pt visual size. It identifies the interaction model, not a category color: calendar for an external event; open/completed circle for a task. The task completion control remains a distinct 44pt target.
- A location or source line is optional supporting text. It is exactly one line and ellipsizes; it never increases a row's height unpredictably.
- Rows sit directly on `--background`. There are no colored category rails, tile backgrounds, or decorative borders.
- Unscheduled is a separate Section after the chronological stream. Its rows do not pretend to have a time, date, or chronological order.

## Composer state machine

The state is explicit. A control from one state must not survive into another state when it no longer represents the current action.

- **Idle** — Composer: empty input, placeholder `Add or search anything…`; send hidden. Transient result: none. Schedule: normal timeline or its loading/empty state. Actions: type, dictate if voice input is available.
- **Composing** — Composer: raw user text; send is enabled; input grows only to two lines, then scrolls internally. Transient result: none. Schedule: remains visible behind the keyboard. Actions: edit text, submit, dismiss keyboard.
- **Parsing** — Composer: submitted text remains visible but is non-editable; send morphs to a progress indicator. Transient result: none. Schedule: remains visually stable. Actions: cancel parsing; no duplicate submit.
- **Draft: create task** — Composer clears and returns to its idle shape. Transient result: title at `headline`; one supporting sentence describing duration, deadline, or scheduling window; one primary `Add task` action and one `Cancel` ghost action. Schedule: unchanged until commitment. Actions: add, cancel, edit a displayed detail.
- **Draft: create event** — Composer clears and returns to its idle shape. Transient result: title at `headline`; time interval or unresolved broad period at `subhead`; optional location/participants at `caption`; one primary `Add event` action and one `Cancel` ghost action. Schedule: unchanged until commitment. Actions: add, cancel, edit a displayed detail.
- **Draft: incomplete event** — Composer clears and returns to its idle shape. Transient result: title plus a plain-language missing-detail message, such as `Choose a time to add this event.` No primary add action. Schedule: unchanged. Actions: edit the missing detail, cancel.
- **Search answer** — Composer: immediately ready for a follow-up. Transient result: direct answer in `body`, followed by supporting schedule rows where available; no `Add` button. Schedule: existing rows remain the source of truth. Actions: ask follow-up, open a supporting task.
- **Availability proposal** — Composer: immediately ready for a follow-up. Transient result: requested duration and up to three proposed openings as plain list rows, not chips. Schedule: matching open intervals are temporarily accented by position and text, never by a new category color. Actions: select one proposal, revise request, cancel.
- **Saving** — Composer stays ready but disabled for duplicate submission. Transient result: draft remains in place; primary action preserves size and shows a Spinner. Schedule: existing timeline remains stable. Actions: wait; cancel only if the underlying write is cancellable.
- **Saved** — Composer returns to idle. Transient result: collapses. Schedule: new task/event inserts at its actual position; a flexible task inserts under Unscheduled. Actions: continue typing.
- **Parse/save error** — Composer: raw user input is restored to the composer and remains editable. Transient result: one `destructive` inline sentence: what failed and how to recover. Schedule: unchanged. Actions: correct text, retry, dismiss error.

`edit_event`, `cancel_event`, and recurring-event requests are not silently converted into creation. They require their own reviewed result and explicit confirmation flow before any external calendar write. They use the unified Time Block detail screen defined in Unified Time Block detail; there is no task-only editor or separate calendar-event editor in the Time experience.

## Draft result anatomy

A draft is a short, readable sentence about the user's time—not an exposed model object. It never shows `primary_intent`, raw ISO timestamps, field names, or a row of schema chips.

For a task:

```text
Buy milk
Unscheduled · 20 min
                         Add task
Cancel
```

For an event:

```text
Dinner with Maya
Tomorrow, 7:00–8:00 PM · Chez Panisse
                         Add event
Cancel
```

The title and each populated supporting detail are individually tappable. A tap replaces only that piece with an inline Input in the transient result. It does not reopen the raw prompt, discard other extracted values, or add a modal. The editing field is labelled in human terms (`Title`, `Time`, `Duration`, `People`, `Location`, `Deadline`) rather than API keys. Pressing return or tapping outside commits the local edit; `Cancel` on the draft discards the whole draft and returns focus to the composer with the original raw request restored.

The primary action is visually adjacent to the result it commits. It must not be a full-width bar separated from the draft by another surface. At compact widths it sits below the detail line; at wider widths it may sit trailing the content. It remains the only filled control in the active result state.

## Unified Time Block detail

Tapping any task or calendar event opens the same Time Block detail screen. The screen is source-aware but not source-shaped: common time concepts occupy the same positions and use the same language regardless of where they are stored.

The reading order is:

1. completion control for tasks, followed by the editable title;
2. exact interval, scheduling window, or `Unscheduled`;
3. duration;
4. location and participants when present;
5. notes/description when present;
6. recurrence when present;
7. source disclosure: `Omiro` or the precise iOS Calendar name;
8. destructive action at the end of the screen.

Every populated row is tappable and opens the narrowest native editor that can change that value. Date/time uses native Apple date and time controls. Duration uses fixed common values plus a custom value. Location, people, title, and notes use focused text entry. Substantial editing remains on this screen; it is not placed in `TaskEditorSheet`.

Task-only behavior:

- completion is immediate and reversible;
- a flexible task may show a scheduling window without an exact interval;
- `Schedule` converts a flexible task into an exact interval while preserving its duration;
- `Unschedule` removes only the exact interval and preserves the task, duration, deadline, and scheduling window;
- subtasks appear as a final Section and use the same row language as the agenda.

Calendar-event-only behavior:

- completion is absent;
- save, reschedule, recurrence, and delete call EventKit and update the visible agenda only after EventKit confirms success;
- read-only calendar events expose their values but disable edits with precise copy explaining why;
- the source calendar is always visible before a destructive action.

Destructive actions use confirmation copy that names both the block and its source. A failed save leaves the editor open with all local edits intact. Back navigation with unsaved edits asks whether to discard them.

## State transitions and motion

Motion explains continuity; it never performs for attention.

- **Idle → composing** — Send control fades in once text becomes non-empty. Duration: `--duration-100`. Reduced motion: immediate.
- **Composing → parsing** — Send arrow morphs into Spinner in the same 44pt target; submitted text holds position. Duration: `--duration-150`. Reduced motion: immediate icon swap.
- **Parsing → draft/result** — Result fades in and translates upward 8pt from the composer; the composer returns to empty simultaneously. Duration: `--duration-200`. Reduced motion: immediate appearance.
- **Draft detail → inline edit** — Tapped text crossfades into the field without moving neighboring content. Duration: `--duration-150`. Reduced motion: immediate replacement.
- **Draft → saving** — Primary label swaps to Spinner without width/height change. Duration: `--duration-100`. Reduced motion: immediate swap.
- **Saving → saved** — Result fades out while the committed row fades into its correct list position; the list never jumps. Duration: `--duration-200`. Reduced motion: immediate result removal and row insertion.
- **Any active state → error** — Composer restores its raw input; error line fades in below it; no shake animation. Duration: `--duration-150`. Reduced motion: immediate.
- **Cancel** — Result fades out; original raw request restores to the composer and receives focus. Duration: `--duration-150`. Reduced motion: immediate.

No animation may change a control's target while the finger is down. Animations must use the existing motion tokens and respect the system reduced-motion setting.

## Keyboard, focus, and gestures

- Tapping the composer focuses the text cursor and scrolls the schedule only enough to keep the composer and active result entirely above the keyboard.
- The composer maintains focus while text is being entered. Submission removes focus only after the request is accepted for parsing; it must not cause the keyboard to flash closed and open.
- A parsed draft does not automatically reopen the keyboard. Tapping a detail does.
- Keyboard dismissal never discards composing text or a draft.
- Pull to refresh is disabled only while a calendar write is in progress; parsing and draft review do not make the schedule stale.
- Swipe-to-complete remains an action on a task row. It must not conflict with vertical list scrolling or the composer gesture area.

## Failure, absence, and permission states

The user must be able to recover meaning in every state.

- **Calendar content loading:** use timeline-shaped Skeleton rows; do not replace the whole screen with a spinner or move the composer.
- **No calendar events:** show the schedule's empty sentence in the canvas; the composer remains usable for tasks.
- **Calendar access unavailable or denied:** the Time surface still shows database-backed tasks and lets the user create flexible tasks. Calendar-only requests state precisely that iOS Calendar access is needed and provide the approved permission route inline in the stream. This route must not replace the stream or be hidden behind a decorative connect card.
- **Network/model parse failure:** preserve raw text, expose one actionable error, and leave the user able to retry or edit. A failed parse never creates a task/event and never clears input.
- **Calendar write failure:** retain the reviewed draft and its edits; explain that the event was not added to iOS Calendar. Retry is safe and must not create duplicates.
- **Task write failure:** retain the reviewed draft and its edits; explain that the task was not saved.
- **Offline:** a model-backed request cannot enter parsing. The composer keeps the text and states that a connection is needed to interpret it; manually available local actions remain available.

## Accessibility contract

- The composer has the accessible name `Add or search time`; its send control is `Interpret time request` while enabled and `Interpreting time request` while parsing.
- Dynamic result changes announce exactly one concise status: `Draft task ready`, `Draft event ready`, `Answer ready`, `Time request failed`, or `Task added` / `Event added`.
- Every tappable detail has a role, a human-readable name, and a 44×44pt target even when the text itself is smaller.
- The visual distinction between task/event comes from icon and copy, not color alone. Completion uses icon plus text decoration/state.
- At the largest supported Dynamic Type size, the result reflows vertically; its primary action remains visible and the composer remains reachable.

## Explicit prohibitions

The Time composer must not:

- show raw extraction fields, ISO strings, intent names, or a chip cloud;
- use nested cards, a tinted preview panel, or a second bordered container for the draft;
- show a full-width primary button detached from the draft it commits;
- keep a stale `Add task`/`Plan event` button after the input changes, parse fails, or the request becomes a search;
- cover the active result with the keyboard or composer;
- invent a time for a broad-period request merely to make a primary action available; or
- imply an event was added before EventKit confirms it.

The wider Time experience must not retain the existing emoji priority picker, all-caps field labels, schema chips, categorical priority dots, or a content-heavy task editor sheet. Those patterns conflict with this document's typography, color, and Dialog/Sheet rules.

## Implementation sequence

The redesign ships as one coherent interaction system in four ordered slices:

1. **Agenda foundation.** Introduce the explicit screen state model, stable row geometry, timeline Skeletons, and dynamic bottom inset calculation.
2. **Composer and review.** Replace chips and preview panels with the transient human-readable result; implement idle, composing, parsing, draft, editing, saving, success, error, cancellation, search, and availability states.
3. **Unified detail.** Replace the task-only sheet/detail split with the Time Block detail screen; add source-aware persistence for database tasks and EventKit events.
4. **Trust and polish.** Complete permission/offline/read-only behavior, accessibility announcements, reduced-motion transitions, optimistic list insertion only after confirmed writes, and deterministic Maestro coverage.

No slice ships with a second visual language. The old preview, task editor sheet, and source-specific detail flows are removed in the same slice that replaces their behavior.

## Implementation and verification gate

No visual change to Time is ready until it is observed on the iPhone simulator at the smallest supported viewport in each of these paths:

1. idle, composing, and keyboard-dismissed input retention;
2. parsing, parse error, retry, and cancellation;
3. flexible-task draft, detail edit, save, save failure, and Unscheduled insertion;
4. fixed-event draft, unified detail edit, EventKit save, and chronological insertion;
5. incomplete event with no premature primary action;
6. search answer and availability proposal;
7. no events, calendar permission unavailable, calendar loading, and offline;
8. unified detail for a task, editable event, recurring event, and read-only event;
9. reduced motion, VoiceOver announcement order, and largest Dynamic Type.

Maestro flows must select app-owned controls by `testID` and assert the visible state after each transition. Screenshots are required for idle, composing, parsing, draft, error, and saved states; a successful typecheck is not visual or interaction evidence.
