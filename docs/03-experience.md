# III. Experience

The Omiro interface is a closed system, not a style guide. Every token,
component, and screen rule below is exhaustive: if a value, variant, or pattern
is not listed, it does not exist in this product. "It feels better" is not a
valid exception, and neither is "just this once."

## Ceremony budget

Hierarchy comes from **typography and whitespace first**. Color, borders,
radius, and containers are not alternate ways to achieve the same hierarchy
— they are exceptions that require the first two tools to have already
failed. Before adding a background, a border, or a card, the question is
always: _can a bigger gap or a heavier type token say this instead?_ If
yes, that's the answer.

This means:

- No decorative containers. A "card" exists only where §2 explicitly
  grants one (Modal/Sheet). Everywhere else, a section is text and space,
  not a box.
- No default borders — with one standing exception: Input (Primitives §2)
  is always a bordered box, because a text field has to read as a text
  field. Outside of Input, whitespace separates content; a divider line
  (List row) and the Button `outline` variant (Primitives §2) are the
  two further named, rare exceptions — not a habit.
- One radius, applied uniformly, plus the one that's a geometric necessity
  (a circle can't be "less round"). Not a scale to choose from.
- A palette of two colors plus two state colors. Hierarchy within text is
  opacity, not a new named color.

The document has four layers. Each layer only uses primitives defined in the
layer above it:

1. **Foundations** — the closed set of tokens (color, spacing, radius, type,
   elevation, iconography, motion).
2. **Primitives** — the closed set of components, each with a fixed contract
   (variants, sizes, states).
3. **Patterns** — how primitives compose into screens.
4. **Review gates** — the pass/fail check applied before anything ships.

---

## 1. Foundations

Tokens are the only legal source of a color, dimension, or duration in
screen code. Rule 72 makes this load-bearing: hardcoding any value below in
route/screen code is a review failure, not a style nitpick.

### 1.1 Color

Two colors, plus two state colors. That's the whole palette. Screen code
references `foreground`, never a hex value or a raw palette step.

| Token            | Purpose                                                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `background`     | The only background. Every screen, row, and input sits directly on it.                                                 |
| `foreground`     | The only text/icon color. Hierarchy within text comes from the opacity steps below, not a second color.                |
| `accent`         | The single interactive/brand color. Selection, primary actions, links.                                                 |
| `text-on-accent` | Text/icon color on top of `accent` or `destructive` fills.                                                             |
| `destructive`    | Destructive actions and error state only.                                                                              |
| `divider`        | The _only_ border/line token in the system. Reserved for the rare, documented exception in Rule 10a — never a default. |
| `overlay-scrim`  | Modal/sheet backdrop only.                                                                                             |

Opacity steps (applied to `foreground`, not separate colors):

| Token            | Opacity | Use                                          |
| ---------------- | ------- | -------------------------------------------- |
| `foreground/100` | 100%    | Primary reading text, active icons.          |
| `foreground/64`  | 64%     | Supporting text, secondary labels.           |
| `foreground/38`  | 38%     | Placeholder, disabled, metadata, timestamps. |

Rules:

- There is exactly one `accent` and no second interactive color, ever.
- `success` / `warning` do not exist as standing tokens. If one screen
  truly needs a third state color, it's a documented, one-off addition
  to that screen — not a palette entry available everywhere.
- Text hierarchy is `foreground` at a different opacity step, never a
  different hue. If a designer reaches for gray-on-gray, the answer is
  `foreground/64`, not a new token.
- `divider` exists to be almost never used (see Rule 10a). Its existence
  is not permission to add a border by default.

### 1.2 Spacing

8pt grid. 4pt exists only for internal alignment inside a control (icon-to-label gaps, text baseline nudges) — it never sets margin or padding between two semantic groups.

| Token       | Value | Legal use                                                  |
| ----------- | ----- | ---------------------------------------------------------- |
| `space-025` | 4pt   | Internal alignment only. Never a group gap.                |
| `space-050` | 8pt   | Tightest legal gap between related elements.               |
| `space-100` | 16pt  | Screen horizontal gutter. Default group gap.               |
| `space-150` | 24pt  | Gap between sections.                                      |
| `space-200` | 32pt  | Gap between major screen regions.                          |
| `space-300` | 48pt  | Rare: full-screen empty/error state padding.               |
| `space-400` | 64pt  | Reserved. Do not use without a documented exception below. |

- Mobile content uses `space-100` (16pt) as the horizontal gutter. Content
  never touches the screen edge.
- Any spacing value not on this table is a bug, not a design decision.

### 1.3 Radius

One radius, applied everywhere a radius is legal, plus the one exception
that is a geometric necessity rather than a style choice.

| Token         | Value  | Legal use                                                                                                                  |
| ------------- | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| `radius`      | 8pt    | The only radius. Buttons, inputs, Modal/Sheet, any control that needs one.                                                 |
| `radius-full` | 9999pt | Circles and capsules only: avatars, icon buttons, pills. Not a style choice — a capsule mathematically can't use `radius`. |

There is no scale to choose from. A control either uses `radius`, uses
`radius-full` because it's circular, or is square. Nothing is ever "a
little more rounded" than something else on the same screen.

### 1.4 Typography

One type scale. No screen defines its own font size.

| Token      | Size / Line height | Weight   | Use                                         |
| ---------- | ------------------ | -------- | ------------------------------------------- |
| `title-lg` | 28 / 34            | Bold     | Rare: a screen's single hero title, if any. |
| `title`    | 22 / 28            | Semibold | Screen title.                               |
| `headline` | 17 / 22            | Semibold | Section header, row title.                  |
| `body`     | 17 / 22            | Regular  | Default reading text, button labels.        |
| `subhead`  | 15 / 20            | Regular  | Secondary row text, form labels.            |
| `caption`  | 13 / 18            | Regular  | Metadata, timestamps, helper text.          |
| `footnote` | 11 / 13            | Regular  | Legal text, rare fine print.                |

All-caps rendering (`text-transform: uppercase`) is not a legal style on
any token. Sentence case is enforced at the copy layer (Pattern rules,
§3.4), not by casing text visually.

### 1.5 Elevation

Almost everything is `elevation-0`. There is exactly one thing that is
ever allowed to sit above it.

| Token         | Surface token | Shadow                          | Use                                                                          |
| ------------- | ------------- | ------------------------------- | ---------------------------------------------------------------------------- |
| `elevation-0` | `background`  | None.                           | Every screen, row, input, list — everything except Modal/Sheet.              |
| `elevation-1` | `background`  | One functional shadow or scrim. | Modal/Sheet only. It needs to read as "above" the screen; nothing else does. |

There is no `elevation-2`. Cards, rows, and sections do not get their own
background tint or shadow to separate from the screen — that's what
`space-150`/`space-200` are for (§1.2). If a component seems to need a
third elevation step, it's composed wrong: flatten it (Rule 10, 10a).

### 1.6 Iconography

- **Source:** SF Symbols by default, via `tintColor`. State (selected,
  unselected, disabled, pressed) is expressed by recoloring the same glyph,
  never by swapping to a different asset per state.
- **Custom icon sets** (a bitmap replacing an SF Symbol because no symbol
  fits) are legal only as a solid alpha mask — one flat shape, no internal
  color or shading, on a transparent background — supplied at `@1x/@2x/@3x`.
  This lets `tintColor` recolor it exactly like an SF Symbol, so it carries
  selected/unselected state the same way every other icon in the system
  does. A full-color or multi-tone bitmap icon is not a legal shortcut
  around the token system, no matter how small the use case.

### 1.7 Motion

| Token              | Duration | Easing                       | Use                                       |
| ------------------ | -------- | ---------------------------- | ----------------------------------------- |
| `duration-instant` | 100ms    | `ease-out`                   | Press/tap feedback.                       |
| `duration-fast`    | 150ms    | `ease-out`                   | Toggles, small state changes.             |
| `duration-base`    | 200ms    | `cubic-bezier(0.2, 0, 0, 1)` | Sheet/modal entrance, screen transitions. |
| `duration-slow`    | 300ms    | `cubic-bezier(0.2, 0, 0, 1)` | Full-screen transitions only.             |

Every token above must resolve to `duration-instant` (or off) when the
system reduced-motion setting is on. There is no token for entertainment
animation because none is a legal use of motion (Rule 66).

---

## 2. Primitives

The closed component set. Each entry is a full contract: the variants,
sizes, and states listed are the only ones that exist. A new prop value
that isn't on this list is a new component, not a variant, and needs a
documented behavioral need (Rule 70) before it's added anywhere.

### Button

shadcn's variant taxonomy, translated to this system's tokens.

- **Variants:**
  - `primary` — filled with `accent`, `text-on-accent` label. One per screen.
  - `secondary` — filled with a muted/subtle fill (`muted` token), `foreground` label. A real action, one step down from `primary`.
  - `destructive` — filled with `destructive`, `text-on-accent` label.
  - `outline` — transparent, one `divider`-colored border, `foreground` label. The single documented exception to "no default border" (§1.1): reserved for an action that needs to read as clearly tappable without the visual weight of a fill — e.g. a row's secondary action next to a chevron-based row.
  - `ghost` — transparent, no border, `foreground` label. Lowest emphasis; used inline, never for an action a user must locate quickly.
- **Sizes:** `default` (44pt height, `space-100` horizontal padding), `compact` (36pt, dense list rows only — never a primary action).
- **Shape:** `radius` on every variant, including `outline`.
- **States:** default, pressed, disabled, loading. Loading preserves the button's committed width/height (Rule 38) and disables re-submission (Rule 39, 50).
- **Label:** verb, two words or fewer (Rule 29).
- Picking a variant is a hierarchy decision, not a taste one: `primary` for the one thing the screen wants done, `secondary`/`outline` for a real but lesser action, `ghost` only when the action's location is already obvious from context (e.g. a Cancel next to the input it cancels).

### Input

- **Sizes:** `default` only, 44pt minimum height (multiline inputs grow from that floor).
- **Boundary:** a full bordered box — `radius`, `border-default`, transparent/`background` fill. This is the one component in the system with a border by default (Ceremony budget): a bottom hairline alone doesn't read as "type here," so Input doesn't get the whitespace-only treatment the rest of §3 does.
- **States:** default, focused, error, disabled. Focused swaps the border to `accent`; error swaps it to `destructive`. Nothing else about the shape changes — no background shift, no size change.
- **Contract:** placeholder describes expected input (Rule 31); error state shows an inline message, not just a color change (Rule 77).

### Section (replaces "card")

- There is no card component. A "Section" is a `headline` label plus
  `space-150` of surrounding space — `background`, no border, no radius,
  no elevation.
- **Contract:** one semantic group per Section (Rule 11). A Section never
  wraps another Section in a visible container (Rule 10).

### List row

- Sits directly on `background`. Rows in the same list are separated by
  whitespace; a `divider` line between rows is the one standing exception
  to "whitespace only" (Rule 10a) — used only when adjacent rows would
  otherwise be genuinely ambiguous (e.g. a dense settings list with
  same-height rows and no leading icon).
- **Modes:** `navigational` (chevron, whole row tappable, no inline controls) or `actionable` (inline control, row itself not tappable). Never both (Rule 48, 49).

### Modal / Sheet

- **Elevation:** `elevation-1` — the only component allowed above `elevation-0` (§1.5).
- **Shape:** `radius`, applied to the top corners only for a sheet, all corners for a centered modal.
- **Contract:** confirmation content only; substantial content gets a screen instead (Rule 53, 54). Never nests another modal or sheet (Rule 10).

### Segmented toggle

- **Uses:** a small set of mutually exclusive views of the same content
  (e.g. Chats/Notes/Tasks) — not a substitute for a screen's worth of tabs.
- **Shape:** a `radius-full` track filled with `muted`; the selected
  segment is a `radius-full` chip filled with `accent`. Unselected segments
  are transparent.
- **Label variants:** either a `text-on-accent`/`text-secondary` text
  label per segment, or an icon per segment (Foundations §1.6) tinted
  `text-on-accent`/`text-secondary` the same way — never both in the same
  toggle. Icon-only segments require an `accessibilityLabel` per segment
  (Rule 55).
- **Size:** every segment is a minimum 44×44pt tap target (Rule 20, 74),
  even when the visual glyph or label is smaller — the track and its
  internal padding expand to guarantee this, they never shrink to fit a
  cramped header. A track sized to match a neighboring icon button's
  _visual_ size without also matching its _tap_ size (icon buttons get
  this for free via `hitSlop`) is a contract violation, not a style
  choice — this happened once already and produced a real sub-44pt
  control.
- **Contract:** built from our own tokens — never the platform's native
  segmented control. The OS's default glass/translucent material doesn't
  carry any of our tokens (color, radius, motion) and renders
  inconsistently against a custom background; a real screen hit this
  exact problem (`app/(protected)/index.tsx`'s Chats/Notes toggle).

### Pill / Badge

- **Uses:** compact status, filter, tag — nothing else (Rule 15).
- **Shape:** `radius-full`, the one legal use of that token outside avatars/icon buttons.
- **Size:** one size. No small/large variants.

### Spinner

- **Contract:** accessible label required (e.g. `Saving`, `Loading calendar results`) (Rule 40). Used for action loading, never content loading (Rule 41).

### Skeleton

- **Contract:** mirrors the dimensions of the content it precedes. Used for content loading, never action loading (Rule 41).

Route files compose these primitives. They do not invent new visual
patterns, new elevation levels, or new color/spacing values inline
(Rule 71, 72).

---

## 3. Patterns

Pass/fail rules for how primitives assemble into a screen.

### Screen structure

1. Every screen has one identifiable purpose.
2. Every screen has one primary action, expressed as one `primary` button.
3. The primary action is visible in the initial viewport, unscrolled.
4. Every screen has one title, using the `title` type token. The title
   names the user task, never the implementation (e.g. `Calendar`, not
   `Sync engine`).
5. A screen has at most three hierarchy levels: title, section, content.
6. Decorative hero sections, slogans, and filler content are prohibited.
7. A screen must remain understandable with all icons removed.
8. A new layout pattern is not introduced when an existing pattern
   (Pattern §3) already fits.

### Surfaces and containment

9. A Section (Primitives §2) is typography and space, not a box. It
   exists to group related content, never to "indicate state" through a
   background or border — state is shown by the control itself (Rule 44).
10. Modal and Sheet are the only components allowed a visible container
    (background separation, radius, elevation). Nothing nests inside
    itself: no sheet inside a sheet, no modal inside a modal.
    10a. Whitespace is the default separator between every other pair of
    elements on a screen. A `divider` line, a tinted row background, or a
    Button's `outline` border are named exceptions (List row and Button,
    Primitives §2) and need a reason — "it looked bare" is not one.
11. One semantic group gets exactly one Section — never a Section inside
    a Section.
12. A screen uses `elevation-0` everywhere except a Modal/Sheet, which
    uses `elevation-1` (§1.5). There is no in-between.
13. If two rows on one screen ever do carry a container (the List row
    divider exception), they share the same treatment — never a mix of
    bordered and unbordered rows on one list.
14. Gradients, decorative shadows, and decorative borders are prohibited
    outright. The only legal shadow in the entire system is Modal/Sheet's
    `elevation-1` separation (§1.5).
15. Pills are restricted to compact status, filters, and tags (Primitives
    §2, Pill/Badge) — they are not a substitute for a button or a card.
16. A full-width card is never used for a single row; use a List row
    (Primitives §2) instead. Cards, in fact, are never used at all —
    see Rule 9.
17. `radius` is the only radius on any rectangular control; `radius-full`
    is legal only where the shape is a circle or capsule (§1.3). Nothing
    is ever "a bit more rounded" for taste.

### Spacing and sizing

18. Mobile content uses `space-100` (16pt) as the horizontal gutter.
19. All spacing uses a `space-*` token (§1.2). `space-025` is reserved for
    internal alignment, never a group gap.
20. Touch targets are at least 44×44pt.
21. Text inputs and primary buttons use the `default` size contract
    (44pt) from Primitives §2.
22. Content never touches the screen edge.
23. Spacing, oversized type tokens, or oversized surfaces are not used to
    create drama — pick the token the content's actual hierarchy calls for.

### Typography and copy

24. Use sentence case everywhere copy appears.
25. All-caps UI copy, slogans, and feature taglines are prohibited (§1.4).
26. Metaphors for ordinary features are prohibited.
27. Do not use "lens," "hub," "workspace," "journey," "magic," or
    "intelligence" unless the word names a concrete user concept the
    feature actually implements.
28. Titles describe the task: `Calendar`, `Archived chats`, `Account`.
29. Button labels use a verb and are two words or fewer whenever possible.
30. Labels describe the resulting action, not the component (`Delete
chat`, not `Delete button`).
31. Placeholder text describes the expected input, not a hint of tone.
32. A title is never repeated in a subtitle beneath it.
33. An action is not explained when its label already makes it obvious.
34. Error copy states the problem and the recovery action in one sentence.
35. Empty states state what is absent and what to do next.

### Loading and async interaction

36. Loading states use a Spinner or Skeleton (Primitives §2), never words.
37. `Loading…`, `Saving…`, `Asking…`, or equivalent loading copy is
    prohibited on-screen; that meaning lives in the Spinner's accessible
    label instead.
38. A control preserves its committed dimensions while loading.
39. Duplicate interaction is disabled while an action is loading.
40. Every Spinner has an accessible label (Primitives §2).
41. Skeletons are used for content loading; Spinners are used for action
    loading. Not interchangeable.
42. Every async action defines success, empty, error, and retry states.

### State and interaction

43. Every feature defines initial, loading, success, empty, error,
    permission-denied, unavailable, and offline states before it ships.
44. Visible controls always represent the current state — no stale
    control left over from a previous state.
45. Setup controls (auth, permissions, configuration) do not appear on
    the task surface; they live in their own flow.
46. Debug controls do not appear in production UI.
47. A manual status check is not shown when status can load
    automatically.
48. A List row (Primitives §2) is either `navigational` or `actionable`,
    never ambiguously both.
49. If a row has an inline action, the row itself is not tappable
    (Primitives §2).
50. Every async action prevents duplicate submission.
51. Destructive actions require explicit confirmation via Modal
    (Primitives §2).
52. Navigation is always reversible with the platform back gesture.
53. A Modal is used for confirmation only, never for content that
    deserves its own screen.
54. A screen is used for substantial content, never for a single
    confirmation.
55. Icon-only actions require an accessible label.

### Data and trust

56. Personal data sources are named precisely (e.g. "your iOS Calendar,"
    not "your data").
57. Privacy copy describes actual behavior, not a generic assurance.

Good: `Calendar data is processed on this device.`
Bad: `Your data is always safe.`

58. Source metadata is shown only when it helps a user verify a result.
59. Raw implementation details are not shown by default.
60. Personal data is not persisted solely to reproduce UI.
61. The app never implies it can do something the underlying integration
    cannot do.
62. Uncertainty in an answer is expressed in the copy, not hidden behind
    confident styling.

### Visual language

63. `accent` and `destructive` communicate action and status only —
    never category. There is no categorical color palette in this system;
    a set of categories is distinguished by label and icon, not by hue
    (§1.1). Everything else renders in `foreground` at the opacity step
    its hierarchy calls for.
64. Icons communicate state or action. Decorative icons are prohibited.
65. Animation communicates a state change or spatial relationship, using
    a `duration-*` token (§1.7).
66. Entertainment animation is prohibited — no motion token exists for it.
67. Every animation resolves to `duration-instant` or off under reduced
    motion.
68. An existing token (§1) is used before a new one is proposed.
69. An existing component (§2) is used before a new one is proposed.
70. A new component requires a behavior none of the Primitives in §2 can
    express — documented in the PR description.
71. Route files compose Primitives; they do not invent design systems.
72. Hardcoded colors, radii, spacing values, font sizes, or durations in
    screen code are prohibited — every value must resolve to a token
    from §1.

### Accessibility

73. Every interactive element has an accessible name.
74. Every interactive element has a 44×44pt touch target.
75. Body text meets WCAG AA contrast against `background` at every
    `foreground` opacity step actually used for body copy — `foreground/38`
    is not legal for anything that must pass AA (metadata/timestamps
    only, never a reading paragraph).
76. Focus, pressed, disabled, loading, and error states are each
    distinguishable by more than an opacity step alone — pair opacity
    with a fill, `accent`/`destructive` line, or icon change (Rule 77).
77. Color is never the sole indicator of state (pair with icon, text, or
    shape).
78. Dynamic content has an accessibility announcement or a stable reading
    order.
79. The screen remains usable at the largest supported dynamic type size.
80. Horizontal scrolling is never required to discover a primary action.

### Interaction verification

81. A user-visible change is unverified until it is observed on its target
    device or browser in every changed state: idle, active/focused or loading,
    cancellation/error where applicable, and return/recovery.
82. Before adding controls to a constrained region, the complete composition
    must be verified at the smallest supported viewport or container. Each
    control must remain visible, reachable, and legible; overlap, clipping,
    and undiscoverable actions fail review.
83. An interactive control passes only when automation or equivalent direct
    observation proves both its activation and its resulting state. Rendering,
    an accessible label, or a successful type check alone does not prove the
    interaction works.
84. App-owned controls require deterministic identifiers or another documented,
    reliable observation path. A platform primitive that cannot supply one is
    an implementation constraint to resolve or report before completion.

---

## 4. Review gates

A screen fails review if:

- its purpose cannot be stated in one sentence;
- it has more than one `primary` button;
- it contains decorative copy;
- it contains a card, border, or background tint that a bigger gap or a
  heavier type token could have replaced (Ceremony budget, Rule 9, 10a);
- it contains a nested surface (Rule 10);
- it uses a value or pattern outside §1–§2 without a documented exception;
- it exposes implementation details by default;
- the first viewport does not show the task and the primary action;
- any required state (Rule 43) is missing;
- any visible control is invalid for the current state; or
- a changed interaction lacks target-environment evidence for its required
  states and transitions (Rules 81–84); or
- a reviewer cannot remove 20% of the UI without reducing functionality.

The governing rule:

> Every visual decision must improve comprehension, action, trust, or state
> visibility. Otherwise, remove it. Every value must come from §1. Every
> component must come from §2. Typography and whitespace are tried first;
> color, border, radius, and containers are the exception, not the
> vocabulary. There is no third option.

---

## 5. Time composer interaction specification

This section governs the Time composer: the natural-language field that can
create a task, create a calendar event, find scheduled work, or ask for an
opening. It is the interaction contract for the unified time model in Product
§1. A later implementation may change code, but not this behavior without an
explicit product decision.

### 5.1 The intended feeling

Time should feel like a clear schedule with one calm place to express intent.
The user should never have to decide whether something is a task or an event
before typing it. They should see what the system understood, correct it
without losing their words, and make one deliberate commitment.

The reference image's failure is structural, not decorative: it renders the
same thought as a text field, a chip card, and a large button at once. Those
three nested surfaces compete for attention, cover the schedule, and make the
primary action feel disconnected from the result. Time uses one input boundary
and otherwise relies on type, space, and motion.

### 5.2 Composition

The screen has three regions, in this order:

1. **Schedule canvas.** A chronological, infinitely loaded stream of calendar
   events and scheduled tasks, followed by the distinct Unscheduled section.
   This is the durable content and remains the visual anchor in every composer
   state.
2. **Transient result.** When a request has a result, it appears immediately
   above the composer as text on the screen background. It is not a card,
   toast, sheet, or floating answer bubble.
3. **Composer.** The one bordered input at the bottom safe area. It is the
   only persistent control for entering a time request.

The composer is not a toolbar and does not become a second screen. It has a
single 44pt minimum input boundary, a leading `sparkles` affordance that is not
tappable, and a trailing send control. There is no filled background behind the
send control. The send control is visible only when a non-whitespace request is
ready to submit; the empty composer has no dead primary-action shape.

The schedule must reserve enough bottom inset for the composer and the current
transient result. Neither may overlap, clip, or hide a list row. The keyboard
may cover older schedule content, but it may never cover the active composer,
the result being reviewed, its primary action, or its cancellation control.

### 5.3 Schedule canvas

The schedule is one infinitely loaded list because a time block is one product
concept.

- Each day starts with a `headline` day label and a `caption` date. The first
  day is `Today`; the next is `Tomorrow`; later days use weekday and date.
- Every scheduled row uses an eyebrow time above a `body` title. This answers
  the first question—_when?_—before the second—_what?_—without a separate time
  column.
- The leading icon is 24pt visual size. It identifies the interaction model,
  not a category color: calendar for an external event; open/completed circle
  for a task. The task completion control remains a distinct 44pt target.
- A location or source line is optional supporting text. It is exactly one
  line and ellipsizes; it never increases a row's height unpredictably.
- Rows sit directly on `background`. There are no colored category rails,
  tile backgrounds, or decorative borders.
- Unscheduled is a separate Section after the chronological stream. Its rows
  do not pretend to have a time, date, or chronological order.

### 5.4 Composer state machine

The state is explicit. A control from one state must not survive into another
state when it no longer represents the current action.

| State                   | Composer                                                                                 | Transient result                                                                                                                                                                       | Schedule canvas                                                                                       | Available actions                                         |
| ----------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Idle                    | Empty input, placeholder `Add or search anything…`; send hidden.                         | None.                                                                                                                                                                                  | Normal timeline or its loading/empty state.                                                           | Type, dictate if voice input is available.                |
| Composing               | Raw user text; send is enabled. Input grows only to two lines, then scrolls internally.  | None.                                                                                                                                                                                  | Remains visible behind the keyboard.                                                                  | Edit text, submit, dismiss keyboard.                      |
| Parsing                 | Submitted text remains visible but is non-editable; send morphs to a progress indicator. | None.                                                                                                                                                                                  | Remains visually stable.                                                                              | Cancel parsing; no duplicate submit.                      |
| Draft: create task      | Composer clears and returns to its idle shape.                                           | Title at `headline`; one supporting sentence describing duration, deadline, or scheduling window; one primary `Add task` action and one `Cancel` ghost action.                         | Unchanged until commitment.                                                                           | Add, cancel, edit a displayed detail.                     |
| Draft: create event     | Composer clears and returns to its idle shape.                                           | Title at `headline`; time interval or unresolved broad period at `subhead`; optional location/participants at `caption`; one primary `Add event` action and one `Cancel` ghost action. | Unchanged until commitment.                                                                           | Add, cancel, edit a displayed detail.                     |
| Draft: incomplete event | Composer clears and returns to its idle shape.                                           | Title plus a plain-language missing-detail message, such as `Choose a time to add this event.` No primary add action.                                                                  | Unchanged.                                                                                            | Edit the missing detail, cancel.                          |
| Search answer           | Composer is immediately ready for a follow-up.                                           | Direct answer in `body`, followed by supporting schedule rows where available. No `Add` button.                                                                                        | Existing rows remain the source of truth.                                                             | Ask follow-up, open a supporting task.                    |
| Availability proposal   | Composer is immediately ready for a follow-up.                                           | Requested duration and up to three proposed openings as plain list rows, not chips.                                                                                                    | Matching open intervals are temporarily accented by position and text, never by a new category color. | Select one proposal, revise request, cancel.              |
| Saving                  | Composer stays ready but disabled for duplicate submission.                              | Draft remains in place; primary action preserves size and shows a Spinner.                                                                                                             | Existing timeline remains stable.                                                                     | Wait; cancel only if the underlying write is cancellable. |
| Saved                   | Composer returns to idle.                                                                | Result collapses.                                                                                                                                                                      | New task/event inserts at its actual position; a flexible task inserts under Unscheduled.             | Continue typing.                                          |
| Parse/save error        | Raw user input is restored to the composer and remains editable.                         | One `destructive` inline sentence: what failed and how to recover.                                                                                                                     | Unchanged.                                                                                            | Correct text, retry, dismiss error.                       |

`edit_event`, `cancel_event`, and recurring-event requests are not silently
converted into creation. They require their own reviewed result and explicit
confirmation flow before any external calendar write. They use the unified Time
Block detail screen defined in §5.6; there is no task-only editor or separate
calendar-event editor in the Time experience.

### 5.5 Draft result anatomy

A draft is a short, readable sentence about the user's time—not an exposed
model object. It never shows `primary_intent`, raw ISO timestamps, field names,
or a row of schema chips.

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

The title and each populated supporting detail are individually tappable. A
tap replaces only that piece with an inline Input in the transient result. It
does not reopen the raw prompt, discard other extracted values, or add a modal.
The editing field is labelled in human terms (`Title`, `Time`, `Duration`,
`People`, `Location`, `Deadline`) rather than API keys. Pressing return or
tapping outside commits the local edit; `Cancel` on the draft discards the
whole draft and returns focus to the composer with the original raw request
restored.

The primary action is visually adjacent to the result it commits. It must not
be a full-width bar separated from the draft by another surface. At compact
widths it sits below the detail line; at wider widths it may sit trailing the
content. It remains the only filled control in the active result state.

### 5.6 Unified Time Block detail

Tapping any task or calendar event opens the same Time Block detail screen.
The screen is source-aware but not source-shaped: common time concepts occupy
the same positions and use the same language regardless of where they are
stored.

The reading order is:

1. completion control for tasks, followed by the editable title;
2. exact interval, scheduling window, or `Unscheduled`;
3. duration;
4. location and participants when present;
5. notes/description when present;
6. recurrence when present;
7. source disclosure: `Omiro` or the precise iOS Calendar name;
8. destructive action at the end of the screen.

Every populated row is tappable and opens the narrowest native editor that can
change that value. Date/time uses native Apple date and time controls. Duration
uses fixed common values plus a custom value. Location, people, title, and notes
use focused text entry. Substantial editing remains on this screen; it is not
placed in `TaskEditorSheet`.

Task-only behavior:

- completion is immediate and reversible;
- a flexible task may show a scheduling window without an exact interval;
- `Schedule` converts a flexible task into an exact interval while preserving
  its duration;
- `Unschedule` removes only the exact interval and preserves the task,
  duration, deadline, and scheduling window;
- subtasks appear as a final Section and use the same row language as the
  agenda.

Calendar-event-only behavior:

- completion is absent;
- save, reschedule, recurrence, and delete call EventKit and update the visible
  agenda only after EventKit confirms success;
- read-only calendar events expose their values but disable edits with precise
  copy explaining why;
- the source calendar is always visible before a destructive action.

Destructive actions use confirmation copy that names both the block and its
source. A failed save leaves the editor open with all local edits intact. Back
navigation with unsaved edits asks whether to discard them.

### 5.7 State transitions and motion

Motion explains continuity; it never performs for attention.

| Transition                 | Motion                                                                                                     | Duration           | Reduced motion                              |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------- |
| Idle → composing           | Send control fades in once text becomes non-empty.                                                         | `duration-instant` | Immediate.                                  |
| Composing → parsing        | Send arrow morphs into Spinner in the same 44pt target. Submitted text holds position.                     | `duration-fast`    | Immediate icon swap.                        |
| Parsing → draft/result     | Result fades in and translates upward 8pt from the composer; the composer returns to empty simultaneously. | `duration-base`    | Immediate appearance.                       |
| Draft detail → inline edit | Tapped text crossfades into the field without moving neighboring content.                                  | `duration-fast`    | Immediate replacement.                      |
| Draft → saving             | Primary label swaps to Spinner without width/height change.                                                | `duration-instant` | Immediate swap.                             |
| Saving → saved             | Result fades out while the committed row fades into its correct list position. The list never jumps.       | `duration-base`    | Immediate result removal and row insertion. |
| Any active state → error   | Composer restores its raw input; error line fades in below it. No shake animation.                         | `duration-fast`    | Immediate.                                  |
| Cancel                     | Result fades out; original raw request restores to the composer and receives focus.                        | `duration-fast`    | Immediate.                                  |

No animation may change a control's target while the finger is down. Animations
must use the existing motion tokens and respect the system reduced-motion
setting.

### 5.8 Keyboard, focus, and gestures

- Tapping the composer focuses the text cursor and scrolls the schedule only
  enough to keep the composer and active result entirely above the keyboard.
- The composer maintains focus while text is being entered. Submission removes
  focus only after the request is accepted for parsing; it must not cause the
  keyboard to flash closed and open.
- A parsed draft does not automatically reopen the keyboard. Tapping a detail
  does.
- Keyboard dismissal never discards composing text or a draft.
- Pull to refresh is disabled only while a calendar write is in progress;
  parsing and draft review do not make the schedule stale.
- Swipe-to-complete remains an action on a task row. It must not conflict with
  vertical list scrolling or the composer gesture area.

### 5.9 Failure, absence, and permission states

The user must be able to recover meaning in every state.

- **Calendar content loading:** use timeline-shaped Skeleton rows; do not
  replace the whole screen with a spinner or move the composer.
- **No calendar events:** show the schedule's empty sentence in the canvas;
  the composer remains usable for tasks.
- **Calendar access unavailable or denied:** the Time surface still shows
  database-backed tasks and lets the user create flexible tasks. Calendar-only
  requests state precisely that iOS Calendar access is needed and provide the
  approved permission route. This route must not be hidden behind a decorative
  connect card.
- **Network/model parse failure:** preserve raw text, expose one actionable
  error, and leave the user able to retry or edit. A failed parse never creates
  a task/event and never clears input.
- **Calendar write failure:** retain the reviewed draft and its edits; explain
  that the event was not added to iOS Calendar. Retry is safe and must not
  create duplicates.
- **Task write failure:** retain the reviewed draft and its edits; explain
  that the task was not saved.
- **Offline:** a model-backed request cannot enter parsing. The composer keeps
  the text and states that a connection is needed to interpret it; manually
  available local actions remain available.

### 5.10 Accessibility contract

- The composer has the accessible name `Add or search time`; its send control
  is `Interpret time request` while enabled and `Interpreting time request`
  while parsing.
- Dynamic result changes announce exactly one concise status: `Draft task
ready`, `Draft event ready`, `Answer ready`, `Time request failed`, or
  `Task added` / `Event added`.
- Every tappable detail has a role, a human-readable name, and a 44×44pt target
  even when the text itself is smaller.
- The visual distinction between task/event comes from icon and copy, not
  color alone. Completion uses icon plus text decoration/state.
- At the largest supported Dynamic Type size, the result reflows vertically;
  its primary action remains visible and the composer remains reachable.

### 5.11 Explicit prohibitions

The Time composer must not:

- show raw extraction fields, ISO strings, intent names, or a chip cloud;
- use nested cards, a tinted preview panel, or a second bordered container for
  the draft;
- show a full-width primary button detached from the draft it commits;
- keep a stale `Add task`/`Plan event` button after the input changes, parse
  fails, or the request becomes a search;
- cover the active result with the keyboard or composer;
- invent a time for a broad-period request merely to make a primary action
  available; or
- imply an event was added before EventKit confirms it.

The wider Time experience must not retain the existing emoji priority picker,
all-caps field labels, schema chips, categorical priority dots, or a
content-heavy task editor sheet. Those patterns conflict with this document's
typography, color, and Modal/Sheet rules.

### 5.12 Implementation sequence

The redesign ships as one coherent interaction system in four ordered slices:

1. **Agenda foundation.** Introduce the explicit screen state model, stable row
   geometry, timeline Skeletons, and dynamic bottom inset calculation.
2. **Composer and review.** Replace chips and preview panels with the transient
   human-readable result; implement idle, composing, parsing, draft, editing,
   saving, success, error, cancellation, search, and availability states.
3. **Unified detail.** Replace the task-only sheet/detail split with the Time
   Block detail screen; add source-aware persistence for database tasks and
   EventKit events.
4. **Trust and polish.** Complete permission/offline/read-only behavior,
   accessibility announcements, reduced-motion transitions, optimistic list
   insertion only after confirmed writes, and deterministic Maestro coverage.

No slice ships with a second visual language. The old preview, task editor
sheet, and source-specific detail flows are removed in the same slice that
replaces their behavior.

### 5.13 Implementation and verification gate

No visual change to Time is ready until it is observed on the iPhone simulator
at the smallest supported viewport in each of these paths:

1. idle, composing, and keyboard-dismissed input retention;
2. parsing, parse error, retry, and cancellation;
3. flexible-task draft, detail edit, save, save failure, and Unscheduled
   insertion;
4. fixed-event draft, unified detail edit, EventKit save, and chronological
   insertion;
5. incomplete event with no premature primary action;
6. search answer and availability proposal;
7. no events, calendar permission unavailable, calendar loading, and offline;
8. unified detail for a task, editable event, recurring event, and read-only
   event;
9. reduced motion, VoiceOver announcement order, and largest Dynamic Type.

Maestro flows must select app-owned controls by `testID` and assert the visible
state after each transition. Screenshots are required for idle, composing,
parsing, draft, error, and saved states; a successful typecheck is not visual
or interaction evidence.
