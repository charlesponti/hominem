## Capability: hyper-form

The HyperForm is the single, unified input surface for the entire Notes app.
It replaces every per-route input form — CaptureBar, InlineCreateForm, route-local ChatInput,
workspace side-panel composer, and note editor AI toolbar — with one floating component
mounted once in the authenticated layout.

There is exactly one input form in the Notes app. It is the HyperForm.

---

### Forms Retired by This Capability

| Retired component | Was located in | HyperForm mode that replaces it |
|---|---|---|
| `CaptureBar` | `components/capture-bar.tsx` | `generic` |
| `InlineCreateForm` | `routes/notes/components/inline-create-form.tsx` | `generic` |
| Route-local `ChatInput` | `routes/chat/chat.$chatId.tsx` | `chat-continuation` |
| Workspace side-panel composer | `routes/notes/$noteId.tsx` | `note-aware` |
| Note editor AI toolbar | `routes/notes/components/note-editor.tsx` | `note-aware` |

Both `capture-bar.tsx` and `inline-create-form.tsx` are **deleted**. All other retired usage sites
have their local form removed and rely on HyperForm thereafter.

---

### Visual Anatomy

```
────────────────────────── COLLAPSED (resting pill) ──────────────────────────

╭────────────────────────────────── max-w-3xl ───────────────────────────────╮
│  Ask anything, create a note, or chat about this...              [→]       │
╰────────────────────────────────────────────────────────────────────────────╯

Position: fixed, bottom: calc(env(safe-area-inset-bottom) + 16px), centered
Height:   ~56px
Shadow:   0 4px 24px rgba(0,0,0,0.08)
z-index:  above all page content


──────────────────────────── EXPANDED (focused) ──────────────────────────────

╭────────────────────────────────── max-w-3xl ───────────────────────────────╮
│  ╔══ REGION 1 — Context strip (visible only in note-aware / chat modes) ══╗ │
│  ║  📄 "Note title" or 💬 "Chat session title"               [× dismiss] ║ │
│  ╚═══════════════════════════════════════════════════════════════════════╝ │
│                                                                            │
│  ══ REGION 2 — Input ══════════════════════════════════════════════════   │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │  [suggestion chip 1]  [suggestion chip 2]  [suggestion chip 3]     │   │
│  │                                                                    │   │
│  │  Textarea — auto-grows to 6 lines, then scrolls                    │   │
│  │  Placeholder: "Ask anything" / "Add to this note" / "Send a msg"  │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ══ REGION 3 — Action footer ══════════════════════════════════════════   │
│  [📎 Attach]  [🎤 Voice]         [Secondary action]  [Primary action →]   │
╰────────────────────────────────────────────────────────────────────────────╯


────────────────────────── MOBILE — resting pill ─────────────────────────────

╭────────────────────────────────────────────────╮
│           ━━━━━  (swipe-up drag handle)         │
│  Ask anything...                       [→]     │
╰────────────────────────────────────────────────╯


────────────────────────── MOBILE — expanded (~70dvh) ───────────────────────

╭────────────────────────────────────────────────╮
│           ━━━━━  (swipe-down to collapse)       │
│  ┌──────────────────────────────────────────┐  │
│  │ Context strip (when in context modes)    │  │
│  ├──────────────────────────────────────────┤  │
│  │ [suggestion chips]                       │  │
│  │                                          │  │
│  │ Textarea — scrolls internally            │  │
│  │                                          │  │
│  ├──────────────────────────────────────────┤  │
│  │ [📎] [🎤]   [Secondary]  [Primary →]     │  │
│  └──────────────────────────────────────────┘  │
╰────────────────────────────────────────────────╯
Semi-transparent backdrop behind form while expanded
```

---

### Context Mode Table

Context is derived on every render from `useMatches()` + `useParams()`.
When the draft is non-empty and the route changes, the action labels crossfade (GSAP `contextSwitch`).

| Route pattern | Mode | Region 1 content | Primary button | Secondary button | Suggestion chips |
|---|---|---|---|---|---|
| `/home`, `/notes`, unmatched | `generic` | hidden | "Think through it →" | "Save as Note" | "Pull out the core idea" · "Start a session" · "What am I thinking?" |
| `/notes/:id` | `note-aware` | Note title | "Ask about this note →" | "Add to note" | "Summarise this note" · "What am I missing?" · "Next steps?" |
| `/chat/:id` | `chat-continuation` | Chat session title | "Send →" | "Save as Note" | "Pull out the core idea" · "Turn this into a note" · "Give me a summary" |

---

### Draft State Contract

```typescript
interface HyperFormDraft {
  text: string
  // future: attachments: AttachmentFile[]
}
```

- Held as `useState<HyperFormDraft>` in `apps/notes/app/routes/layout.tsx`
- Passed to `HyperForm` and to routes that need to read context via `ComposerProvider`
- Survives `<Outlet>` route changes within a session
- Cleared on successful submit (after `submitPulse` animation completes)
- Does NOT persist across page refresh (localStorage deferred to follow-on change)

---

### GSAP Animation Sequences

All motion uses GSAP. No CSS transitions or Framer Motion on the HyperForm.

| Sequence | Trigger | Targets | Duration / ease |
|---|---|---|---|
| `entry` | First authenticated layout mount (once) | `y` +80→0, `opacity` 0→1 | 280ms `power3.out` |
| `focusExpand` | Textarea focus | Container height pill→full; shadow 0.08→0.14 opacity | 180ms `power2.out` |
| `blurCollapse` | Blur with empty input | Container height full→pill; shadow reduces | 180ms `power2.out` |
| `submitPulse` | Any submit action | Primary button scale 1→1.12→1; input `opacity`+`y` fade-out | 120ms `power1.inOut` |
| `contextSwitch` | Route change while draft non-empty | Region 1 content + action labels `opacity` crossfade | 160ms `power1.inOut` |
| `swipeSnap` | Touch end on drag handle | `y` snaps to expanded or resting breakpoint | 300ms `elastic.out(1, 0.5)` |

GSAP `quickTo` drives real-time `y` tracking during active touch move. `swipeSnap` fires on release.

---

### Action Wiring

Each action uses the same mutation hooks as the retired form it replaces — no new API calls.

| Mode | Action | Hook | Behaviour |
|---|---|---|---|
| `generic` | Primary | `useHonoMutation` → `chats.create` + `chats.send` | Create new chat seeded with draft; navigate to `/chat/:id`; clear draft |
| `generic` | Secondary | `useHonoMutation` → `notes.create` | Create note from draft; clear draft; inline success state |
| `note-aware` | Primary | `useHonoMutation` → `chats.create` + `chats.send` | Create new chat with note context prepended; navigate to `/chat/:id`; clear draft |
| `note-aware` | Secondary | `useHonoMutation` → `notes.update` | Append draft to current note body; clear draft |
| `chat-continuation` | Primary | `useSendMessage({ chatId })` | Send draft as next message in current chat; clear draft |
| `chat-continuation` | Secondary | `useHonoMutation` → `notes.create` | Save draft as new note; clear draft |
| any | Voice | opens `AudioRecorderModal` | On transcript ready: populate `draftText`; focus textarea |
| any | Attach | opens file picker | Files staged as attachments; appended to message/note on submit |

---

### Requirements

### Requirement: The HyperForm SHALL be the only input form in the Notes app
No route-local input form of any kind SHALL exist once the HyperForm ships.

#### Scenario: User is on any authenticated Notes route
- **WHEN** an authenticated user loads any route within the Notes app
- **THEN** the HyperForm is visible at the bottom of the viewport
- **AND** no other standalone input form is present on the page

#### Scenario: Developer adds a new Notes route
- **WHEN** a new authenticated route is added to the Notes app
- **THEN** no new input form component is introduced for that route
- **AND** the HyperForm's context table is extended if the route requires a new action mode

---

### Requirement: All five retired forms SHALL be fully deleted or stripped
The retirement is not optional and is not a soft deprecation.

#### Scenario: CaptureBar and InlineCreateForm
- **WHEN** the HyperForm ships
- **THEN** `apps/notes/app/components/capture-bar.tsx` no longer exists in the repository
- **AND** `apps/notes/app/routes/notes/components/inline-create-form.tsx` no longer exists

#### Scenario: Route-local forms stripped
- **WHEN** the HyperForm ships
- **THEN** `routes/chat/chat.$chatId.tsx` renders no `<ChatInput>` component
- **AND** `routes/notes/$noteId.tsx` renders no side-panel composer
- **AND** `routes/notes/components/note-editor.tsx` renders no AI toolbar action buttons

---

### Requirement: The HyperForm SHALL adapt its mode to the current route
The correct mode SHALL be active without any user action.

#### Scenario: User navigates from home to a note
- **GIVEN** the HyperForm is in `generic` mode on `/home`
- **WHEN** the user navigates to `/notes/abc123`
- **THEN** the HyperForm switches to `note-aware` mode
- **AND** Region 1 shows the note's title
- **AND** the primary button reads "Ask about this note →"
- **AND** if draft text is present, the label transition is animated via GSAP `contextSwitch`

#### Scenario: User navigates to a chat route
- **GIVEN** the HyperForm is in `generic` mode
- **WHEN** the user navigates to `/chat/xyz`
- **THEN** the HyperForm switches to `chat-continuation` mode
- **AND** submitting sends a message to that chat session

---

### Requirement: Draft text SHALL persist across route navigation
#### Scenario: User types a thought then navigates
- **GIVEN** the user has typed "I need to think about X" in the HyperForm on `/home`
- **WHEN** they navigate to `/notes`
- **THEN** "I need to think about X" is still in the HyperForm textarea
- **AND** the HyperForm has not re-animated or reset

---

### Requirement: All HyperForm interactions SHALL be animated via GSAP
#### Scenario: User focuses the form
- **WHEN** the user taps or clicks the collapsed pill
- **THEN** the form expands to show all three regions
- **AND** this expansion is driven by GSAP `focusExpand`, not a CSS height transition

#### Scenario: User submits
- **WHEN** the user submits any action
- **THEN** the `submitPulse` GSAP sequence plays before the form clears

---

### Requirement: On mobile the HyperForm SHALL support swipe-up to expand and swipe-down to collapse
#### Scenario: Swipe up
- **WHEN** a mobile user swipes up on the drag handle
- **THEN** the HyperForm expands to ~70dvh via GSAP `swipeSnap`
- **AND** the textarea gains internal scroll

#### Scenario: Swipe down from expanded
- **WHEN** a mobile user swipes down on the drag handle while expanded
- **THEN** the HyperForm collapses to the resting pill via GSAP `swipeSnap`
- **AND** any draft text is preserved

---

### Requirement: Page content SHALL NOT be obscured by the HyperForm at rest
#### Scenario: User scrolls to the bottom of any Notes page
- **WHEN** the user reaches the last item in any scrollable surface
- **THEN** the last item is fully visible above the HyperForm resting pill
- **AND** the HyperForm does not overlay any interactive element
