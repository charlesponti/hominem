## Parity Exception Log

Every approved divergence between mobile and Notes must be recorded here before implementation ships.

## Decision Rules

### Presentation-only difference

Allowed without exception when:
- user-facing capability remains the same
- workflow sequencing remains the same
- persistence and recovery outcomes remain the same

Examples:
- tab bar versus sidebar navigation chrome
- keyboard shortcut versus native button affordance
- native haptic feedback versus no-op on web

### Platform-required implementation difference

Requires an entry in this log when:
- OS or browser constraints change how the capability is exposed
- permission or hardware constraints affect the interaction wrapper
- a transport layer differs while the product outcome remains the same

### Prohibited product divergence

Not allowed unless the canonical contract changes:
- one surface hides a core contract section
- one surface changes thought lineage semantics
- one surface changes artifact classification semantics
- one surface changes review-before-apply semantics
- one surface changes recovery outcome
- one surface reorders the workflow in a user-visible way
- one surface recomposes the thought contract independently from raw domain endpoints

## Exception Template

### Exception ID

- `AX-001`

### Capability

- example: inline voice input

### Surfaces affected

- mobile
- notes

### Classification

- presentation-only difference
- platform-required implementation difference

### Reason

- OS, browser, hardware, or transport constraint that requires the change

### Preserved invariant

- what still matches across surfaces

### Expiration

- when the exception should be revisited

## Current Exceptions

### AX-001

**Capability**: Keyboard shortcuts for session surface

**Surfaces affected**: Notes (web)

**Classification**: Platform-required implementation difference

**Reason**: Notes web has `useChatKeyboardShortcuts` providing focus-input, scroll-to-top,
and scroll-to-bottom shortcuts. React Native has no keyboard shortcut layer and the
equivalent interactions are native scroll gestures.

**Preserved invariant**: Both surfaces expose the same session capabilities (input,
scroll, history). The web keyboard shortcuts are additive — they do not expose any
action unavailable on mobile.

**Expiration**: Revisit if mobile gains hardware keyboard support (iPad / external keyboard).

---

### AX-002

**Capability**: Session list browser / session entry point

**Surfaces affected**: Notes (web), Mobile

**Classification**: Platform-required implementation difference

**Reason**: Notes web currently routes `/chat` → most recent session or creates a new
one (being fixed by B-001, but the underlying data model remains). Mobile has no
equivalent standalone session list — sessions are only surfaced via `SessionCard` on
`focus`. The navigation patterns differ: web uses URL-addressable sessions, mobile
uses tab-based navigation to the active session only.

**Preserved invariant**: Both surfaces surface resumable sessions on `HomeView`
(`focus` on mobile, the new `HomeView` route on web). Session entry and resume
behavior must produce identical outcomes regardless of navigation mechanism.

**Expiration**: Revisit when mobile gains a full session history browser, if needed.

---

### AX-003

**Capability**: Note-seeded session entry point

**Surfaces affected**: Notes (web), Mobile

**Classification**: Platform-required implementation difference

**Reason**: Notes web has a dedicated route `$noteId.chat.tsx` that opens a session
pre-loaded with a specific note as context. Mobile achieves the same result via the
`seed` query parameter on the `sherpa` route. The mechanism differs (route vs.
parameter), but the outcome — a `SessionView` with `ContextAnchor` showing the source
note — must be identical.

**Preserved invariant**: Both surfaces must produce:
- `ContextAnchor` showing `{ kind: 'artifact', id, type: 'note', title }`
- Session `source` set to the note before the first user message
- Transformation results linked back to the originating note

**Expiration**: Revisit if both surfaces adopt a unified session-from-artifact API
that makes the entry mechanism irrelevant.

---

### AX-004

**Capability**: Session source contextual anchor (`ContextAnchor`)

**Surfaces affected**: Mobile

**Classification**: Platform-required implementation difference

**Reason**: Mobile persists chat sessions exclusively in `LocalStore` (SQLite). The
`LocalStore.Chat` type does not carry a `noteId` field — the mobile session is always
ephemeral and not linked to a specific note artifact at storage time. As a result,
mobile derives `source: { kind: 'new' }` for every session, while Notes web derives
the correct `kind: 'artifact'` when `chat.noteId != null`.

**Preserved invariant**: The `ContextAnchor` contract is identical on both surfaces.
If mobile gains a `noteId` field in `LocalStore.Chat`, the derivation logic and
component render behavior require no changes — only the data source changes.

**Expiration**: Revisit when mobile syncs sessions to the server-side `chats` table
(which does carry `noteId`) or when `LocalStore.Chat` gains a `noteId` column.
