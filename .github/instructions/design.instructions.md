---
applyTo: 'apps/**'
---

### Hominem Design System

Apple HIG structure applied to a strictly monotone light palette. Single mode only. Built for WCAG 2.2 AA.

---

#### 00. Philosophy

- **Kanso (簡素 - Simplicity):** Remove the non-essential. If a pixel does not serve a function, it is noise.
- **Ma (間 - Negative Space):** Empty space is a structural element, not a failure to fill.
- **Shibui (渋い - Understated):** No performance. No decoration. Clarity is the aesthetic.
- **Wabi-sabi (侘寂 - Imperfection):** Technical honesty over corporate polish. Asymmetry is allowed where it improves signal.

**Accessibility mandate:** WCAG 2.2 AA throughout. All text 4.5:1 minimum. All UI component boundaries 3:1. All interactive elements keyboard navigable with visible `:focus-visible` states. All motion respects `prefers-reduced-motion`. Semantic HTML required.

---

#### 01. Document Requirements

Every HTML document must include:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Never use user-scalable=no or maximum-scale — breaks WCAG 1.4.4 -->
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page title — Site name</title>
</head>
```

- `lang` is required on `<html>` (WCAG 3.1.1). Use correct BCP 47 tag: `en`, `en-US`, `fr`, etc.
- Never set `user-scalable=no`, `user-scalable=0`, or `maximum-scale=1`. These prevent text zoom (WCAG 1.4.4).
- `<title>` must be descriptive and unique per page (WCAG 2.4.2).
- Never lock orientation to portrait or landscape via CSS or JS (WCAG 1.3.4).

---

#### 02. Color & Surface

Monotone base. Two semantic accents for system state only — text and icons, never fills.

| Token | Value | Contrast on `#FFFFFF` | Usage |
| :--- | :--- | :--- | :--- |
| `--background` | `#FFFFFF` | — | Primary view background |
| `--surface` | `#F2F2F7` | — | Cards, inset lists, grouped sections |
| `--surface-elevated` | `#FFFFFF` | — | Inputs/popovers on `--surface`. Elevation via `--shadow-1`, not color. |
| `--surface-overlay` | `#E5E5EA` | — | Transient overlays, sheet backdrops |
| `--foreground` | `#000000` | 21:1 | Primary text, headings |
| `--foreground-secondary` | `rgba(0,0,0,0.55)` | 9.1:1 | Subtitles, descriptions |
| `--foreground-tertiary` | `rgba(0,0,0,0.40)` | 6.0:1 | Meta text, secondary UI |
| `--foreground-disabled` | `rgba(0,0,0,0.25)` | ~1.7:1 | Inactive UI only — WCAG 1.4.3 exempts disabled components |
| `--border` | `rgba(0,0,0,0.08)` | — | Decorative dividers (not subject to WCAG 1.4.11) |
| `--border-strong` | `rgba(0,0,0,0.45)` | 3.1:1 | Interactive component boundaries — meets WCAG 1.4.11 |
| `--destructive` | `#D70015` | 5.9:1 | Errors, deletions. Text and icons only. |
| `--success` | `#1A7F37` | 5.5:1 | Confirmations, validation. Text and icons only. |

**WCAG 1.4.1 — Color must never be the sole means of conveying information.** Every status, error, required field, and data series must communicate its meaning through text, icon, shape, or pattern in addition to color. Examples:
- Error inputs: red border + error icon + error message text (not border color alone)
- Required fields: `*` indicator + `aria-required` (not color alone)
- Chart series: different line dash patterns or shapes, not just different shades

**Rules:**
- No raw hex or rgba in app code. All colors via tokens.
- `--destructive` and `--success` are text and icon colors only — never background fills.
- `--border` is for decorative dividers. `--border-strong` for all interactive component outlines.
- No decorative gradients, tint fills, or additional hues.
- No `@media (prefers-color-scheme: dark)`. No Tailwind `dark:`.

---

#### 03. Focus Indicator

WCAG 2.4.11 (AA in 2.2): focus indicator must be visible against all adjacent colors. A single black outline is invisible on a black button. Use the universal double-ring pattern — always.

```css
:focus-visible {
  outline: 2px solid var(--foreground);
  outline-offset: 2px;
  box-shadow: 0 0 0 2px var(--background), 0 0 0 4px var(--foreground);
}
```

The white gap separates the ring from any surface color. Never override with `outline: none` unless providing an equivalent visible replacement.

**`tabindex` rules (WCAG 2.1.1, 2.4.3):**
- `tabindex="0"`: makes a non-interactive element focusable in natural DOM order. Use for custom interactive elements.
- `tabindex="-1"`: removes from tab order but allows programmatic focus (`element.focus()`). Use for modal focus management and skip targets.
- Never use `tabindex` values > 0. They override the natural tab order and create unpredictable navigation.

---

#### 04. Typography

System font stack — SF Pro on Apple, best available elsewhere.

```
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif
--font-mono: ui-monospace, "SF Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", monospace
```

**Scale:**

| Role | Token Prefix | Size | Weight | Line Height | Letter Spacing |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Large Title | `--text-large-title` | 34px | 700 | 1.20 | +0.37px |
| Title 1 | `--text-title-1` | 28px | 600 | 1.21 | +0.36px |
| Title 2 | `--text-title-2` | 22px | 600 | 1.27 | +0.35px |
| Title 3 | `--text-title-3` | 20px | 400 | 1.25 | +0.38px |
| Headline | `--text-headline` | 17px | 600 | 1.29 | -0.41px |
| Body | `--text-body` | 17px | 400 | 1.29 | -0.41px |
| Callout | `--text-callout` | 16px | 400 | 1.31 | -0.32px |
| Subheading | `--text-subheading` | 15px | 400 | 1.33 | -0.24px |
| Footnote | `--text-footnote` | 13px | 400 | 1.38 | -0.08px |
| Caption | `--text-caption` | 12px | 400 | 1.33 | 0px |

**Line length:** Cap prose at `--measure: 65ch`. Apply `max-width: var(--measure)` on reading text blocks.

**WCAG 1.4.12 — Text spacing reflow.** Content must not be clipped or lost when a user overrides:
- Line height to 1.5× font size
- Letter spacing to 0.12× font size
- Word spacing to 0.16× font size
- Paragraph spacing to 2× font size

This means: never use fixed heights on text containers. Use `min-height`, not `height`. Never use `overflow: hidden` on containers that hold text.

**Heading hierarchy (WCAG 1.3.1, 2.4.6):**
- One `<h1>` per page.
- Never skip levels. `h1 → h2 → h3` only.
- Heading level reflects document structure, not visual size.

**Rules:** No weights above 600 in running text. No arbitrary font sizes. Body and prose ≥17px.

---

#### 05. Spacing & Layout

8pt grid. Structural spacing in multiples of 8. Micro tokens (`--space-1`, `--space-3`) for icon-text gaps only.

| Token | Value | Type | When to use |
| :--- | :--- | :--- | :--- |
| `--space-1` | 4px | micro | Icon-to-label baseline alignment only |
| `--space-2` | 8px | structural | Small component internal padding |
| `--space-3` | 12px | micro | Tight inline gaps (rare) |
| `--space-4` | 16px | structural | Standard gutter, card padding |
| `--space-5` | 24px | structural | Vertical section rhythm |
| `--space-6` | 32px | structural | Large section margins |
| `--space-7` | 48px | structural | Section breaks |
| `--space-8` | 64px | structural | Top-level page sections |
| `--space-ma-sm` | 128px | macro void | Large breathing room |
| `--space-ma-lg` | 256px | macro void | Maximum white space |

Left-aligned by default. Right-alignment for numbers and metadata only.

---

#### 06. Breakpoints

Mobile-first.

| Breakpoint | Viewport | Media Query |
| :--- | :--- | :--- |
| mobile | 320–599px | default (no query) |
| tablet | 600–999px | `@media (min-width: 600px)` |
| desktop | 1000px+ | `@media (min-width: 1000px)` |

```css
--content-width-mobile:  calc(100% - var(--space-8));
--content-width-tablet:  calc(100% - var(--space-7));
--content-width-desktop: 1000px;
```

---

#### 07. Corner Radius

| Context | Token | Value |
| :--- | :--- | :--- |
| Buttons, chips, inputs | `--radius-sm` | 10px |
| Standard cards | `--radius-md` | 16px |
| Large containers, sheets | `--radius-lg` | 20px |
| Modals, popovers | `--radius-xl` | 24px |
| App icons | — | 22.37% of side length |

---

#### 08. Depth & Elevation

| Level | Token | Shadow | Surface |
| :--- | :--- | :--- | :--- |
| 0 — Base | — | none | `--background` `#FFFFFF` |
| 1 — Raised | `--shadow-1` | `0 1px 3px rgba(0,0,0,0.10)` | `--surface` `#F2F2F7` |
| 2 — Elevated | `--shadow-2` | `0 4px 12px rgba(0,0,0,0.08)` | `--surface-elevated` `#FFFFFF` |
| 3 — Floating | `--shadow-3` | `0 12px 40px rgba(0,0,0,0.15)` | `--surface-overlay` `#E5E5EA` |

---

#### 09. Z-Index

| Token | Value | Usage |
| :--- | :--- | :--- |
| `--z-base` | 0 | Default document flow |
| `--z-raised` | 10 | Sticky headers, floating labels |
| `--z-dropdown` | 100 | Dropdowns, popovers |
| `--z-overlay` | 200 | Sheet backdrops |
| `--z-modal` | 300 | Modal dialogs |
| `--z-toast` | 400 | Toast notifications |

Never use raw z-index integers.

---

#### 10. Icons

| Size | Token | Usage | Stroke |
| :--- | :--- | :--- | :--- |
| 16px | `--icon-sm` | Inline with small text | 1.5px |
| 20px | `--icon-md` | Inline with body text, buttons | 2px |
| 24px | `--icon-lg` | Standalone controls | 2px |
| 32px | `--icon-xl` | Hero iconography | 2px |

**Rules:**
- Optically center — round shapes need ~1px top bias.
- Text-embedded: align to text baseline, `margin-top: -2px`.
- Decorative: `aria-hidden="true"`. Informational: `aria-label` or adjacent visible text.
- No decorative icons. Every icon communicates information.

---

#### 11. Motion & Animation

Purposeful, light, fast. Remove animations that don't change user understanding.

**Easing:**

| Token | Value | Usage |
| :--- | :--- | :--- |
| `--ease-default` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | Standard transitions |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1.00)` | Enter animations |
| `--ease-out` | `cubic-bezier(0.0, 0.0, 0.2, 1.0)` | Exit animations |
| `--ease-in` | `cubic-bezier(0.4, 0.0, 1.0, 1.0)` | Accelerating away |
| `--ease-symmetric` | `cubic-bezier(0.45, 0.0, 0.55, 1.0)` | Looping animations (skeleton, pulse) |

**Duration:**

| Token | Value | Usage |
| :--- | :--- | :--- |
| `--duration-instant` | `80ms` | Hover fills, checkbox ticks |
| `--duration-fast` | `150ms` | Button press, icon swaps |
| `--duration-default` | `220ms` | Modal entrance, panel expansion |
| `--duration-slow` | `350ms` | Page transitions, sheet slides |

**States:**

| State | Treatment |
| :--- | :--- |

---

#### Troubleshooting

Use these checks before introducing ad hoc UI fixes:

- Ensure `@hominem/ui/src/styles/globals.css` is imported at the app root.
- Verify design token names directly in `packages/ui/src/styles/globals.css`.
- Prefer semantic classes over inline styles or raw hex values.
- Use the intended typography utilities instead of arbitrary font sizing.
- Verify focus visibility with forced `:focus-visible` state in DevTools.
- Keep spacing on the system scale and use the right primitive: padding, margin, gap, or `space-*`.
- Avoid arbitrary radius and accent values.

#### Migration Guidance

- Treat this file as the only repo-wide design-system instruction source.
- Capture broad design migrations in OpenSpec changes, not root docs.
- Remove superseded migration notes instead of preserving parallel design guides.
| Default | `background: var(--background)`, `color: var(--foreground)` |
| Hover | `background: var(--surface)`, `transition: background-color var(--duration-instant) var(--ease-default)` |
| Active | `transform: scale(0.97)`, `opacity: 0.75`, `transition: transform var(--duration-fast) var(--ease-default)` |
| Focus | See §03 — double-ring via `:focus-visible` |
| Disabled | `opacity: 0.40`, `cursor: not-allowed`, no transitions |
| Loading | `opacity: 0.60`, `pointer-events: none` |
| Enter | `opacity: 0→1`, `translateY(8px→0)`, `var(--ease-spring)`, `var(--duration-default)` |
| Exit | `opacity: 1→0`, `translateY(0→-4px)`, `var(--ease-out)`, `var(--duration-fast)` |

**Rules:**
- Never `transition: all`. Name specific property.
- No looping animations without live system-state justification.
- Max duration 350ms.
- Always handle `prefers-reduced-motion: reduce`.
- **WCAG 2.2.2 — Pause, Stop, Hide.** Any moving, blinking, or auto-updating content that lasts longer than 5 seconds must provide a mechanism to pause or stop it. This includes carousels, looping videos, progress animations, and tickers. Skeleton and hover animations are exempt (< 5s). Provide a pause button with `aria-label="Pause animation"`.
- **WCAG 2.5.1 — Pointer Gestures.** Any functionality requiring a path-based gesture (swipe, pinch, draw) must have a single-pointer alternative (tap, button). Carousels must have Previous/Next buttons. Maps with pinch-zoom must have +/− buttons. Never build functionality reachable only by gesture.
- **WCAG 3.2.1 — On Focus.** Receiving focus must never trigger a context change: no navigation, no form submission, no modal opening. Focus moves — nothing else happens.
- **WCAG 3.2.2 — On Input.** Changing a form control value must never trigger context change automatically. A `<select>` changing value must not navigate. Provide an explicit submit action instead.

---

#### 12. High Contrast (`prefers-contrast: more`)

```css
@media (prefers-contrast: more) {
  :root {
    --border:               rgba(0, 0, 0, 0.30);
    --border-strong:        rgba(0, 0, 0, 0.70);
    --foreground-secondary: rgba(0, 0, 0, 0.75);
    --foreground-tertiary:  rgba(0, 0, 0, 0.60);
    --shadow-1: 0 0 0 1px rgba(0, 0, 0, 0.20);
    --shadow-2: 0 0 0 1px rgba(0, 0, 0, 0.20);
    --shadow-3: 0 0 0 1px rgba(0, 0, 0, 0.20);
  }
  [data-elevated] {
    border: 1px solid var(--border-strong);
    box-shadow: none;
  }
}
```

---

#### 13. Status Messages (WCAG 4.1.3)

Any message added to the DOM without receiving focus must be announced to screen readers. This applies to: form success confirmations, search result counts, cart updates, filter result counts, loading completion.

```html
<!-- Polite: announced at next opportunity, does not interrupt -->
<div role="status" aria-live="polite" aria-atomic="true">
  3 results found
</div>

<!-- Assertive: interrupts immediately — errors only -->
<div role="alert" aria-atomic="true">
  Payment failed. Check your card details.
</div>
```

- Use `aria-atomic="true"` so the full message is read, not just the changed portion.
- Keep live regions in the DOM at all times — update their content rather than inserting/removing them.
- `role="status"` / `aria-live="polite"`: result counts, success messages, non-urgent updates.
- `role="alert"` / assertive: errors only — it interrupts the user immediately.
- Never use `aria-live="assertive"` for non-error content.

---

#### 14. Form Validation Timing

Getting validation timing wrong is one of the most common UX and accessibility failures.

| Moment | Rule |
| :--- | :--- |
| First keystroke | Never validate. User is mid-thought. |
| On blur (first time) | Validate. Field has been touched. Show error if invalid. |
| On input (after first error) | Re-validate in real time. User is actively correcting. |
| On submit | Validate all fields. Move focus to first error. |

```
1. User types in field → no error shown
2. User tabs away (blur) → validate → show error if invalid
3. User returns to fix error → validate on each keystroke → clear error when valid
4. User clicks Submit → validate all → focus first error field
```

- Move focus to the first invalid field on submit (not just scroll to it)
- Announce error count at submit: `role="alert"` — "3 errors found. First error: Email is required."
- Never clear valid fields on submit failure
- Never disable the submit button as the sole error prevention — validate on submit instead

**WCAG 3.3.4 — Error Prevention (Legal, Financial, Data).** For actions involving financial transactions, legal commitments, or irreversible data changes:
- User can review and confirm before submitting (confirmation step or dialog)
- User can reverse the action after the fact (undo, cancel period), OR
- User receives a confirmation dialog before the action executes

Apply to: payments, account deletion, data export, subscription changes, bulk deletes.

---

#### 14a. Confirmation Pattern (Destructive / Financial Actions)

Use for: delete, disconnect, revoke, purchase, bulk action.

**Inline confirmation (low-stakes delete):**
```html
<!-- Replace button with confirm/cancel pair on first click -->
<span>Delete item?</span>
<button aria-describedby="confirm-hint">Yes, delete</button>
<button>Cancel</button>
<p id="confirm-hint" class="sr-only">This cannot be undone.</p>
```

**Modal confirmation (high-stakes: account deletion, payment, bulk action):**
- Use the Modal spec (§15)
- Title: action-specific — "Delete account?" not "Confirm"
- Body: explain consequence — "All data will be permanently removed. This cannot be undone."
- Primary button: Destructive variant — "Delete account"
- Secondary button: Ghost variant — "Cancel"
- Primary on right, Cancel on left
- Default focus: Cancel button (safest option — WCAG 3.3.4)
- For financial transactions: show summary of what will be charged before confirm

**Never use browser `confirm()` dialogs.** They are inaccessible and unstyled.

---

#### 14b. WCAG 2.2 New Criteria (released October 2023)

These are AA requirements specific to WCAG 2.2 — not in 2.1. All apply.

**2.5.7 — Dragging Movements**
Any UI that uses drag-and-drop must offer a single-pointer (click/tap) alternative. A draggable sort handle must also work with Up/Down buttons or a position input. Never build functionality reachable only by dragging.

**2.5.8 — Target Size Minimum**
Every interactive element must be at least 24×24 CSS px. Exceptions:
- Inline text links within a sentence — exempt if spacing is sufficient
- The element itself is 24px but its activation area (including spacing to adjacent targets) meets 24px clearance

Prefer 44px for primary actions. 24px is the floor, not the target.

**3.3.7 — Redundant Entry**
Do not ask users to re-enter information already provided in the same session. Examples:
- If the user entered their email on a previous step, pre-fill it in the next step
- Do not show a "confirm email" field (type it twice) — it fails this criterion
- Exception: re-entry required for security (password confirmation for auth change) is allowed

**3.3.8 — Accessible Authentication (Minimum)**
Cognitive function tests must not be the only authentication mechanism. Applies to:
- CAPTCHA: always provide an audio or image-based alternative. Prefer passkeys, magic link, or OAuth.
- Password fields: never block `paste`. Screen reader users and password manager users depend on paste. Never set `onpaste="return false"` or use `autocomplete="off"` on password fields.

**2.5.2 — Pointer Cancellation**
Actions triggered by pointer must fire on `up` event, not `down` event. Users must be able to cancel by dragging off the target before releasing.
- Use `click` (fires on up) — not `mousedown`/`pointerdown`/`touchstart` for activation
- Exception: drawing tools, sliders where down-to-drag is essential behavior
- Drag-start (pointerdown) is allowed; the completion (drop) fires on pointerup — this is compliant

**2.2.1 — Session Timeout Warning**
If any session expires (auth token, idle timeout, timed form), users must be warned before expiry and given the ability to extend.

Pattern:
```html
<!-- Show at 2 min before expiry -->
<dialog
  role="alertdialog"
  aria-modal="true"
  aria-labelledby="session-title"
  aria-describedby="session-desc"
>
  <h2 id="session-title">Your session is about to expire</h2>
  <p id="session-desc">You'll be signed out in <strong><span id="countdown">2:00</span></strong>.</p>
  <button id="extend-session" autofocus>Stay signed in</button>
  <button>Sign out now</button>
</dialog>
```
- Warning threshold: ≥ 2 minutes before expiry (or 20% of total session, whichever is longer)
- Default focus: "Stay signed in" button (safest action)
- `id="countdown"` updated every second, wrapped in `aria-live="off"` (update span only — avoid constant announcements)
- After extension: dialog closes, focus returns to prior location, new timeout resets

---

#### 15. Semantic HTML & ARIA

**Page structure (required):**

```html
<a href="#main-content" class="skip-link">Skip to main content</a>
<header role="banner">...</header>
<nav role="navigation" aria-label="Main">...</nav>
<main id="main-content" role="main">...</main>
<footer role="contentinfo">...</footer>
```

```css
.skip-link {
  position: absolute;
  top: -100%;
  left: var(--space-4);
  z-index: var(--z-toast);
  padding: var(--space-2) var(--space-4);
  background: var(--foreground);
  color: var(--background);
  border-radius: var(--radius-sm);
  font-size: var(--text-subheading-size);
  font-weight: 600;
  text-decoration: none;
}
.skip-link:focus-visible { top: var(--space-4); }
```

**Component ARIA requirements:**

| Component | Element | Required ARIA |
| :--- | :--- | :--- |
| Icon-only button | `<button>` | `aria-label="Action"`, icon `aria-hidden="true"` |
| Modal | `<dialog>` | `aria-modal="true"`, `aria-labelledby="dialog-title"` |
| Toast (info) | `<div>` | `role="status"`, `aria-live="polite"`, `aria-atomic="true"` |
| Toast (error) | `<div>` | `role="alert"`, `aria-atomic="true"` |
| Form input | `<input>` | `<label for="id">`, never placeholder-only |
| Error message | `<p>` | `id` linked via `aria-describedby` on input |
| Toggle | `<button>` | `role="switch"`, `aria-checked="true\|false"` |
| Tabs | `<div>` | `role="tablist"`, tabs `role="tab"`, panels `role="tabpanel"` |
| Accordion | `<button>` | `aria-expanded="true\|false"`, `aria-controls="panel-id"` |
| Loading region | `<div>` | `aria-busy="true"`, `aria-live="polite"` |
| Multiple navs | `<nav>` | unique `aria-label` on each |
| Tooltip trigger | any | `aria-describedby="tooltip-id"` |
| Breadcrumb | `<nav>` | `aria-label="Breadcrumb"`, current page `aria-current="page"` |
| Progress bar | `<div>` | `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"` |

**WCAG 2.5.3 — Label in Name.** When a component has visible text, its accessible name must *contain* that text. A button that reads "Learn more" cannot have `aria-label="Read the full article"`. It must be `aria-label="Learn more about pricing"` — the visible text is preserved within the label.

**WCAG 3.2.3 — Consistent Navigation.** Navigation that repeats across pages must appear in the same relative order every time. If the top bar shows [Logo] [Dashboard] [Settings] [Account] on one page, it must appear in that same order on all pages. Reordering based on "most used" or personalization violates this.

**WCAG 3.2.4 — Consistent Identification.** Components with the same function across pages must be identified consistently. If a search input is labelled "Search notes" in one view and "Find notes" in another — that's a violation. Icon-only buttons with the same function must have the same `aria-label` everywhere.

---

#### 15. Components

##### Button

Three variants, two sizes. WCAG 2.5.8: minimum 24px height. Primary actions 44px.

| Variant | Background | Text | Border | Hover |
| :--- | :--- | :--- | :--- | :--- |
| Primary | `--foreground` | `--background` | none | `opacity: 0.85` |
| Ghost | transparent | `--foreground` | `1px solid var(--border-strong)` | `background: var(--surface)` |
| Destructive | `--destructive` | `#FFFFFF` | none | `opacity: 0.85` |

- **SM:** `height: 36px`, `padding: 0 var(--space-3)`, Subheading 15px/400
- **MD:** `height: 44px`, `padding: 0 var(--space-4)`, Headline 17px/600
- Disabled: `opacity: 0.40`, `cursor: not-allowed`, `aria-disabled="true"`
- Loading: spinner replaces label, fixed width prevents layout shift

##### Checkbox

- `<input type="checkbox">` styled via CSS
- 20px × 20px, `--radius-sm`, `border: 1px solid var(--border-strong)` at rest
- Checked: `background: var(--foreground)`, white checkmark SVG, `transition: background-color var(--duration-fast) var(--ease-default)`
- Hit target: 44px × 44px via `<label>` padding
- Label: 15px/400, right of checkbox, `gap: var(--space-2)`

##### Radio

- `<input type="radio">` styled via CSS
- 20px circle, `border: 2px solid var(--border-strong)` at rest
- Checked: 8px inner dot, `background: var(--foreground)`, `transition: var(--duration-fast)`
- Hit target: 44px × 44px via `<label>` padding

##### Toggle / Switch

- `<button role="switch" aria-checked="true|false">`
- 50px × 28px pill, `background: var(--surface)`, `border: 1px solid var(--border)`
- Checked: `background: var(--foreground)` — on ≠ success, never use `--success`
- Inner circle: 24px, `background: var(--background)`, full border-radius
- Transition: `background-color var(--duration-fast) var(--ease-default)`, `transform var(--duration-fast) var(--ease-default)`

##### Tabs

Arrow key navigation within the tablist — not Tab key. Tab moves to the active panel.

```html
<div role="tablist" aria-label="Section name">
  <button role="tab" aria-selected="true"  aria-controls="panel-1" id="tab-1">Overview</button>
  <button role="tab" aria-selected="false" aria-controls="panel-2" id="tab-2" tabindex="-1">Details</button>
</div>
<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">...</div>
<div role="tabpanel" id="panel-2" aria-labelledby="tab-2" hidden>...</div>
```

- Active tab: `--foreground`, `border-bottom: 2px solid var(--foreground)`, `aria-selected="true"`
- Inactive tabs: `--foreground-secondary`, no border, `tabindex="-1"`
- Arrow Left/Right: moves focus and activates adjacent tab
- Home/End: first/last tab
- Tab height: 44px, `padding: 0 var(--space-4)`
- Tab strip: `border-bottom: 1px solid var(--border)`

##### Accordion / Disclosure

```html
<div>
  <h3>
    <button
      aria-expanded="true"
      aria-controls="section-1-content"
      id="section-1-btn"
    >
      Section title
    </button>
  </h3>
  <div
    id="section-1-content"
    role="region"
    aria-labelledby="section-1-btn"
  >
    Panel content
  </div>
</div>
```

- Button: full width, left-aligned, `height: 44px`, `padding: 0 var(--space-4)`, Headline 17px/600
- Chevron icon: right-aligned, rotates 180° when expanded, `transition: transform var(--duration-fast) var(--ease-default)`
- Panel: `border-top: 1px solid var(--border)`, `padding: var(--space-4)`
- Multiple accordions can be open simultaneously unless single-select is required by context
- Use `<details>/<summary>` for simple standalone disclosures without panel content dependencies

##### Breadcrumb

```html
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/settings">Settings</a></li>
    <li><span aria-current="page">Profile</span></li>
  </ol>
</nav>
```

- `<ol>` — ordered list (hierarchy matters)
- Separator: CSS `::after` content `"/"`, `--foreground-tertiary`, `margin: 0 var(--space-2)`, `aria-hidden="true"`
- Current page: `--foreground`, no link, `aria-current="page"`
- Font: Subheading 15px/400

##### Progress Indicator

**Linear progress bar:**

```html
<div
  role="progressbar"
  aria-valuenow="65"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="Upload progress"
>
  <div style="width: 65%"></div>
</div>
```

- Track: `height: 4px`, `background: var(--surface)`, `border-radius: var(--radius-sm)`
- Fill: `background: var(--foreground)`, `transition: width var(--duration-default) var(--ease-default)`
- Indeterminate (unknown duration): animated fill slides left to right, `prefers-reduced-motion` shows static 50% fill

**Step indicator (multi-step forms):**
- Steps: circles 24px, `background: var(--surface)`, `border: 1px solid var(--border-strong)`, Caption 12px
- Completed: `background: var(--foreground)`, checkmark icon white, `aria-label="Step 1 (completed)"`
- Current: `background: var(--foreground)`, white number, `aria-current="step"`
- Connector line: `1px solid var(--border)`, full width between circles
- Never rely on color alone — use icon + label for completed/active/upcoming states (WCAG 1.4.1)

##### Tooltip

WCAG 1.4.13: tooltip content appearing on hover must be dismissible, hoverable, and persistent.

```html
<button aria-describedby="tooltip-save">
  Save
</button>
<div
  id="tooltip-save"
  role="tooltip"
  aria-hidden="true"
>
  Saves your current progress
</div>
```

- Trigger: `aria-describedby="tooltip-id"` on the element the tooltip describes
- Tooltip: `role="tooltip"`, `aria-hidden="true"` (screen readers read via `aria-describedby`)
- Position: above trigger by default, flip to below if insufficient space
- Background: `--foreground`, text: `--background`, Caption 12px/400
- Padding: `var(--space-1) var(--space-2)`, `border-radius: var(--radius-sm)`
- Max-width: 280px, `word-wrap: break-word`
- Show on: hover + focus. Hide on: Escape, mouse leave, focus leave.
- Delay: 600ms show, 0ms hide (prevents flicker)
- Must remain visible when mouse moves from trigger to tooltip (WCAG 1.4.13)
- Enter: `opacity: 0→1`, `translateY(4px→0)`, `--ease-out`, `--duration-fast`

##### Form Layout

```html
<form>
  <p><span aria-hidden="true">*</span> Required fields</p>

  <fieldset>
    <legend>Shipping address</legend>

    <div class="field">
      <label for="street">
        Street address
        <span aria-hidden="true">*</span>
        <span class="sr-only">(required)</span>
      </label>
      <input
        id="street"
        type="text"
        aria-required="true"
        aria-describedby="street-error"
      >
      <p id="street-error" role="alert" aria-live="polite" hidden>
        Street address is required.
      </p>
    </div>
  </fieldset>
</form>
```

- Label above input, `--space-1` gap
- Fields stacked vertically, `--space-5` between
- Error: Caption 12px/400, `--destructive`, below input, `role="alert"`
- `<fieldset>`: `border: 1px solid var(--border)`, `--radius-md`, padding `--space-5`
- `<legend>`: Headline 17px/600, `--foreground`

##### Text Input

- Height 44px, `--radius-sm`, `padding: 0 var(--space-3)`
- Background: `--surface`, `border: 1px solid var(--border-strong)`, text: `--foreground`
- Placeholder: `--foreground-tertiary` — hint only, never replaces label
- Focus: `border-color: var(--border-strong)`, `box-shadow: var(--shadow-1)`
- Error: `border-color: var(--destructive)` + error icon + error message text (not color alone)
- Disabled: `opacity: 0.40`, `cursor: not-allowed`

##### Textarea

- `<textarea>` with associated `<label for="id">`
- Min-height 120px, `--radius-sm`, `padding: var(--space-3)`
- Same border, focus, error, disabled behavior as Text Input
- `resize: vertical` only — never `resize: none`
- Character count: Caption 12px/400, `--foreground-tertiary`, right-aligned below. `--destructive` + `aria-describedby` when over limit.

##### Select / Dropdown

- Native `<select>` preferred. Custom requires full ARIA combobox pattern.
- Height 44px, `--radius-sm`, `border: 1px solid var(--border-strong)`
- Background: `--surface`, text: `--foreground`
- Focus: `border-color: var(--border-strong)`, `box-shadow: var(--shadow-1)`
- When open: `z-index: var(--z-dropdown)`, `box-shadow: var(--shadow-3)`, max-height 50vh with scroll

##### Badge / Tag / Chip

| Variant | Usage | Background | Text | Border |
| :--- | :--- | :--- | :--- | :--- |
| Badge | Status count | `--surface` | `--foreground-secondary` | `1px solid var(--border)` |
| Tag | Category label | `--surface` | `--foreground` | `1px solid var(--border-strong)` |
| Chip (removable) | Filter selection | `--surface` | `--foreground` | `1px solid var(--border-strong)` |

- Height: 24px (badge), 28px (tag/chip)
- Padding: `0 var(--space-2)`
- Radius: `--radius-sm`
- Font: Caption 12px/400 (badge), Subheading 15px/400 (tag/chip)
- Chip remove: `--icon-sm` ×, 28px × 28px hit target, `aria-label="Remove [name]"`
- Status badges: pair icon + label — never rely on color alone (WCAG 1.4.1)

##### Table

- `<table>` with `<thead>`, `<tbody>`, `<th scope="col|row">`, `<td>`
- Complex tables: `<caption>` describing the table's purpose
- Header: Footnote 13px/600, `--foreground-secondary`, uppercase, `letter-spacing: 0.06em`
- Rows: Body 17px/400, `border-bottom: 1px solid var(--border)`, min-height 44px if clickable
- Zebra: odd `--background`, even `--surface`
- Numbers/dates: right-aligned, `font-variant-numeric: tabular-nums`

##### Empty State

Used when a view has no content to display.

- Center-aligned vertically and horizontally within the container
- Icon: `--icon-xl` (32px), `--foreground-tertiary`, `aria-hidden="true"`
- Title: Title 3 (20px/400), `--foreground`, `margin-top: var(--space-4)`
- Description: Body (17px/400), `--foreground-secondary`, `max-width: var(--measure)`
- CTA button (optional): Primary MD, `margin-top: var(--space-5)`
- Minimum container height: 240px

Examples:
- No data: "No transactions yet" + "Transactions will appear here once you connect an account."
- No results: "No results for 'query'" + "Try a different search term."
- Error: "Could not load data" + "Check your connection and try again." + Retry button

##### Modal / Dialog

- `<dialog>` with `aria-modal="true"`, `aria-labelledby="dialog-title"`
- Background: `--background`, `padding: var(--space-6)`, `border-radius: var(--radius-xl)`
- `border: 1px solid var(--border)`, `box-shadow: var(--shadow-3)`
- Title: `<h2 id="dialog-title">`, Title 2 22px/600
- Backdrop: `rgba(0,0,0,0.40)`, `z-index: var(--z-overlay)`
- Close: top-right, 44px × 44px, `aria-label="Close dialog"`
- Focus trap: Tab cycles within modal. Focus returns to trigger on close.
- Escape always closes.
- Enter: `opacity: 0→1`, `translateY(16px→0)`, `--ease-spring`, `--duration-default`
- Exit: `opacity: 1→0`, `translateY(0→8px)`, `--ease-out`, `--duration-fast`

##### Toast / Notification

- Info/success: `<div role="status" aria-live="polite" aria-atomic="true">`
- Error: `<div role="alert" aria-atomic="true">`
- Position: `fixed`, bottom-right, `var(--space-4)` from edges, `z-index: var(--z-toast)`
- Max-width 400px, `background: var(--surface)`, `border: 1px solid var(--border)`, `border-radius: var(--radius-lg)`
- `box-shadow: var(--shadow-3)`, padding: `var(--space-4)`, Body 17px/400
- Auto-dismiss: 5000ms. Pause on hover/focus.
- Manual dismiss: `<button aria-label="Dismiss">`, 44px × 44px

##### Skeleton / Loading Placeholder

- Background: `--surface`, same radius as content it replaces
- Parent: `aria-busy="true"`, `aria-label="Loading"`
- Animation: `opacity: 0.5→1.0→0.5`, 1400ms, `var(--ease-symmetric)`, looping
- `prefers-reduced-motion`: static, no animation

##### Image / Figure

```html
<figure>
  <img
    src="..." alt="Descriptive text"
    loading="lazy" decoding="async"
    width="800" height="600"
  >
  <figcaption>Caption 12px/400, --foreground-secondary</figcaption>
</figure>

<!-- Decorative -->
<img src="..." alt="" role="presentation" loading="lazy">
```

- Always specify `width` and `height` to prevent layout shift
- `object-fit: cover` for fixed containers, `object-fit: contain` for full display
- `loading="lazy"` below the fold. `loading="eager"` for LCP images.

##### Code / Pre

```html
<code>inline code</code>
<pre><code>code block</code></pre>
```

- `<code>`: `font-family: var(--font-mono)`, Caption 12px/400, `background: var(--surface)`, `padding: 1px 5px`, `border-radius: 4px`, `border: 1px solid var(--border)`
- `<pre><code>`: `font-family: var(--font-mono)`, Footnote 13px/400, `background: var(--surface)`, `padding: var(--space-4)`, `border-radius: var(--radius-md)`, `border: 1px solid var(--border)`, `overflow-x: auto`, `tab-size: 2`
- Never use `white-space: nowrap` on `<pre>` — allow horizontal scroll instead
- Line height: 1.6 for readability in code blocks

##### Links

- Inline: `color: var(--foreground)`, `text-decoration: underline`, `text-underline-offset: 3px`
- Hover: `text-decoration-thickness: 2px`
- Visited: `color: var(--foreground-secondary)`
- Nav links: no underline (nav landmark provides context)
- External (`target="_blank"`): `aria-label="Page name (opens in new tab)"`, show external icon

**WCAG 2.4.4 — Link Purpose.** Link text must make sense out of context (when read by a screen reader scanning all links on a page). Failures: "Click here", "Read more", "Learn more", "Here", "Details". Fix with descriptive text or `aria-label`:

```html
<!-- Failure -->
<a href="/pricing">Read more</a>

<!-- Fix 1: descriptive text -->
<a href="/pricing">Read more about pricing</a>

<!-- Fix 2: aria-label preserving visible text in the label (WCAG 2.5.3) -->
<a href="/pricing" aria-label="Read more about pricing">Read more</a>

<!-- Fix 3: visually hidden supplement -->
<a href="/pricing">Read more <span class="sr-only">about pricing</span></a>
```

Never use the same link text for different destinations. Never use different link text for the same destination.

##### Navigation — Top Bar

```html
<header role="banner">
  <nav role="navigation" aria-label="Main">
    <a href="/" aria-label="Hominem home"><!-- logo --></a>
    <ul role="list">
      <li><a href="/dashboard" aria-current="page">Dashboard</a></li>
      <li><a href="/settings">Settings</a></li>
    </ul>
    <!-- Mobile: hamburger trigger -->
    <button aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu" class="menu-trigger">
      <!-- icon -->
    </button>
  </nav>
</header>
```

- Height: 56px (mobile), 64px (desktop)
- Background: `--background`, `border-bottom: 1px solid var(--border)`, `position: sticky`, `top: 0`, `z-index: var(--z-raised)`
- Logo: left-aligned, 44px × 44px hit target
- Nav links: Subheading 15px/400, `--foreground-secondary`, `padding: var(--space-2) var(--space-3)`, `--radius-sm`
- Active link: `--foreground`, `font-weight: 600`, `aria-current="page"`
- Hover: `background: var(--surface)`

##### Navigation — Mobile Drawer

Opens from hamburger button. Full-height overlay sliding from left.

```html
<div
  id="mobile-menu"
  role="dialog"
  aria-modal="true"
  aria-label="Navigation menu"
  hidden
>
  <button aria-label="Close menu"><!-- × icon --></button>
  <nav>
    <ul role="list">
      <li><a href="/dashboard" aria-current="page">Dashboard</a></li>
    </ul>
  </nav>
</div>
<div class="drawer-backdrop" aria-hidden="true"></div>
```

- Width: min(320px, 85vw)
- Background: `--background`, `border-right: 1px solid var(--border)`, `box-shadow: var(--shadow-3)`
- `z-index: var(--z-modal)`, backdrop `z-index: var(--z-overlay)`, `rgba(0,0,0,0.40)`
- Focus trap while open. Escape closes. Focus returns to hamburger button on close.
- Nav links: Headline 17px/600, height 56px, padding `0 var(--space-5)`
- Enter: `translateX(-100%→0)`, `--ease-spring`, `--duration-default`
- Exit: `translateX(0→-100%)`, `--ease-out`, `--duration-fast`
- Hamburger: `aria-expanded` updates to `"true"` when open. Icon changes to × (with transition).

##### Pagination

```html
<nav aria-label="Pagination">
  <button aria-label="Previous page" rel="prev">←</button>

  <button aria-label="Page 1">1</button>
  <button aria-label="Page 2" aria-current="page">2</button>
  <button aria-label="Page 3">3</button>
  <span aria-hidden="true">…</span>
  <button aria-label="Page 10">10</button>

  <button aria-label="Next page" rel="next">→</button>
</nav>
```

- Each page button: 40px × 40px, `--radius-sm`
- Current page: `background: var(--foreground)`, `color: var(--background)`, `aria-current="page"`
- Default: Ghost button style
- Disabled Prev/Next (at boundaries): `opacity: 0.40`, `aria-disabled="true"`
- Ellipsis: `--foreground-tertiary`, `aria-hidden="true"`, non-interactive
- Show at most 7 page slots: [prev] [1] [2] [current] [n-1] [n] [next], ellipsis when needed
- Announce page change: `role="status"` region — "Page 3 of 10"

##### Search

```html
<search> <!-- or <form role="search"> -->
  <label for="search-input" class="sr-only">Search</label>
  <input
    id="search-input"
    type="search"
    aria-controls="search-results"
    aria-activedescendant=""
    autocomplete="off"
    placeholder="Search…"
  >
  <!-- Clear button, visible when input has value -->
  <button aria-label="Clear search" hidden>×</button>
</search>

<!-- Live results region -->
<div
  id="search-results"
  role="listbox"
  aria-label="Search results"
  aria-live="polite"
  aria-atomic="false"
>
  <!-- Result count announcement -->
  <p role="status" class="sr-only">5 results for "query"</p>

  <div role="option" id="result-1" aria-selected="false">...</div>
</div>
```

- Input: standard Text Input spec
- Results container: `background: var(--background)`, `border: 1px solid var(--border)`, `box-shadow: var(--shadow-3)`, `border-radius: var(--radius-md)`, `z-index: var(--z-dropdown)`, max-height 50vh with scroll
- Each result: 44px min-height, `padding: var(--space-3) var(--space-4)`, hover `background: var(--surface)`
- Keyboard: arrow keys move through results, Enter selects, Escape clears and closes
- `aria-activedescendant` on input updates to ID of focused result option
- Announce result count via `role="status"`: "5 results" or "No results for 'query'"
- Debounce input: 300ms before firing search request
- Loading state: spinner inside input, `aria-busy="true"` on results container

##### Navigation — Bottom Tab Bar

Apple HIG primary navigation pattern for mobile apps with 3–5 top-level destinations. Use when the app has 3–5 equally weighted sections. Do not use for web apps — use Top Bar + Drawer instead.

```html
<nav aria-label="Main" role="navigation">
  <ul role="list" class="tab-bar">
    <li>
      <a href="/start" aria-current="page" class="tab-item">
        <svg aria-hidden="true" focusable="false"><!-- icon --></svg>
        <span>Start</span>
      </a>
    </li>
    <li>
      <a href="/focus" class="tab-item">
        <svg aria-hidden="true" focusable="false"><!-- icon --></svg>
        <span>Focus</span>
      </a>
    </li>
    <li>
      <a href="/account" class="tab-item">
        <svg aria-hidden="true" focusable="false"><!-- icon --></svg>
        <span>Account</span>
      </a>
    </li>
  </ul>
</nav>
```

```css
.tab-bar {
  display: flex;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px; /* + env(safe-area-inset-bottom) for iPhone notch */
  padding-bottom: env(safe-area-inset-bottom);
  background: var(--background);
  border-top: 1px solid var(--border);
  z-index: var(--z-raised);
  list-style: none;
  margin: 0;
  padding-left: 0;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  min-height: 44px; /* WCAG 2.5.8 — 24px min, prefer 44px */
  color: var(--foreground-tertiary);
  font-size: 10px;
  font-weight: 500;
  text-decoration: none;
  transition: color var(--duration-instant) var(--ease-default);
}

.tab-item[aria-current="page"] {
  color: var(--foreground);
  font-weight: 600;
}

.tab-item:hover { color: var(--foreground-secondary); }

/* Body padding to prevent content hiding behind tab bar */
body { padding-bottom: calc(56px + env(safe-area-inset-bottom)); }
```

- `aria-current="page"` on the active link — update on navigation
- Icon: 24×24px `<svg>` with `aria-hidden="true"` — label comes from visible text
- Tab label: always visible — never icon-only (WCAG 1.1.1 and cognitive load)
- 3 tabs minimum, 5 maximum. More than 5: use drawer navigation instead.
- Active indicator: `color: var(--foreground)`, weight 600. No filled pill or heavy background.
- `safe-area-inset-bottom` required for iPhone home indicator overlap (iOS notch/Dynamic Island)
- On tablet/desktop: hide tab bar, show top bar (`@media (min-width: 768px) { .tab-bar { display: none; } }`)
- Badge count on tab icon: `<span class="sr-only"> (3 unread)</span>` after tab label

##### Scrollbar

```css
* { scrollbar-width: thin; scrollbar-color: var(--border-strong) transparent; }
::-webkit-scrollbar        { width: 4px; height: 4px; }
::-webkit-scrollbar-track  { background: transparent; }
::-webkit-scrollbar-thumb  { background: var(--border-strong); border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: var(--foreground-tertiary); }
```

---

#### 16. Data Visualization

In a monotone system, color cannot distinguish data series. Use structural differentiation instead (WCAG 1.4.1).

**Series differentiation (use in this order):**

| Method | Example | When |
| :--- | :--- | :--- |
| Opacity steps | 100%, 70%, 40% of `--foreground` | Bar charts, area fills |
| Line dash pattern | solid, dashed (`4 4`), dotted (`2 2`) | Line charts |
| Shape markers | circle, square, triangle, diamond | Scatter, line points |
| Position/label | direct data labels on series | Dense charts |

Never use color alone to distinguish series. Always pair with one of the above.

**Chart tokens:**

```css
--chart-1: rgba(0, 0, 0, 1.00);   /* Primary series */
--chart-2: rgba(0, 0, 0, 0.65);   /* Secondary series */
--chart-3: rgba(0, 0, 0, 0.40);   /* Tertiary series */
--chart-4: rgba(0, 0, 0, 0.20);   /* Quaternary series */
--chart-grid: rgba(0, 0, 0, 0.06); /* Grid lines */
--chart-axis: rgba(0, 0, 0, 0.20); /* Axis lines */
```

**Rules:**
- All charts must have a text summary or data table alternative (WCAG 1.1.1)
- Axis labels: Caption 12px/400, `--foreground-tertiary`
- Grid lines: `--chart-grid`, 1px
- Always include a visible chart title
- Interactive charts: keyboard navigable via arrow keys, values announced via `aria-live`
- Tooltips on data points follow the tooltip spec (§15 Tooltip)

---

#### 17. Print Styles

```css
@media print {
  /* Reset to pure black on white */
  * {
    background: #FFFFFF !important;
    color: #000000 !important;
    box-shadow: none !important;
    text-shadow: none !important;
  }

  /* Show link URLs after link text */
  a[href]::after { content: " (" attr(href) ")"; font-size: 11px; }
  a[href^="#"]::after,
  a[href^="javascript:"]::after { content: ""; }

  /* Hide non-content elements */
  nav, .skip-link, button:not([data-print]),
  [role="status"], [role="alert"] { display: none !important; }

  /* Prevent orphaned headings */
  h1, h2, h3, h4 { page-break-after: avoid; }

  /* Prevent images/tables splitting across pages */
  img, table, figure, pre { page-break-inside: avoid; }

  /* Ensure images scale to page width */
  img { max-width: 100% !important; }

  /* Remove radius and border for print clarity */
  * { border-radius: 0 !important; }

  /* Typography */
  body { font-size: 12pt; line-height: 1.5; }
  h1 { font-size: 20pt; } h2 { font-size: 16pt; } h3 { font-size: 14pt; }
}
```

---

#### 18. CSS Token Reference

```css
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  --font-mono: ui-monospace, "SF Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", monospace;
  --measure: 65ch;

  /* Type Scale */
  --text-large-title-size: 34px; --text-large-title-weight: 700; --text-large-title-height: 1.20; --text-large-title-spacing: 0.37px;
  --text-title-1-size: 28px;     --text-title-1-weight: 600;     --text-title-1-height: 1.21;    --text-title-1-spacing: 0.36px;
  --text-title-2-size: 22px;     --text-title-2-weight: 600;     --text-title-2-height: 1.27;    --text-title-2-spacing: 0.35px;
  --text-title-3-size: 20px;     --text-title-3-weight: 400;     --text-title-3-height: 1.25;    --text-title-3-spacing: 0.38px;
  --text-headline-size: 17px;    --text-headline-weight: 600;    --text-headline-height: 1.29;   --text-headline-spacing: -0.41px;
  --text-body-size: 17px;        --text-body-weight: 400;        --text-body-height: 1.29;       --text-body-spacing: -0.41px;
  --text-callout-size: 16px;     --text-callout-weight: 400;     --text-callout-height: 1.31;    --text-callout-spacing: -0.32px;
  --text-subheading-size: 15px;  --text-subheading-weight: 400;  --text-subheading-height: 1.33; --text-subheading-spacing: -0.24px;
  --text-footnote-size: 13px;    --text-footnote-weight: 400;    --text-footnote-height: 1.38;   --text-footnote-spacing: -0.08px;
  --text-caption-size: 12px;     --text-caption-weight: 400;     --text-caption-height: 1.33;    --text-caption-spacing: 0px;

  /* Spacing */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-5: 24px; --space-6: 32px; --space-7: 48px; --space-8: 64px;
  --space-ma-sm: 128px; --space-ma-lg: 256px;

  /* Responsive */
  --content-width-mobile:  calc(100% - var(--space-8));
  --content-width-tablet:  calc(100% - var(--space-7));
  --content-width-desktop: 1000px;

  /* Radius */
  --radius-sm: 10px; --radius-md: 16px; --radius-lg: 20px; --radius-xl: 24px;

  /* Image ratios */
  --ratio-video: 16/9; --ratio-square: 1; --ratio-portrait: 3/4;

  /* Icons */
  --icon-sm: 16px; --icon-md: 20px; --icon-lg: 24px; --icon-xl: 32px;
  --icon-stroke-sm: 1.5px; --icon-stroke-md: 2px;

  /* Z-Index */
  --z-base: 0; --z-raised: 10; --z-dropdown: 100;
  --z-overlay: 200; --z-modal: 300; --z-toast: 400;

  /* Motion */
  --ease-default:   cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1.00);
  --ease-out:       cubic-bezier(0.0,  0.0,  0.2,  1.0);
  --ease-in:        cubic-bezier(0.4,  0.0,  1.0,  1.0);
  --ease-symmetric: cubic-bezier(0.45, 0.0,  0.55, 1.0);
  --duration-instant: 80ms; --duration-fast: 150ms;
  --duration-default: 220ms; --duration-slow: 350ms;

  /* Surfaces */
  --background: #FFFFFF; --surface: #F2F2F7;
  --surface-elevated: #FFFFFF; --surface-overlay: #E5E5EA;

  /* Text */
  --foreground: #000000;
  --foreground-secondary: rgba(0, 0, 0, 0.55);
  --foreground-tertiary:  rgba(0, 0, 0, 0.40);
  --foreground-disabled:  rgba(0, 0, 0, 0.25);

  /* Borders */
  --border:        rgba(0, 0, 0, 0.08);
  --border-strong: rgba(0, 0, 0, 0.45);

  /* Shadows */
  --shadow-1: 0 1px 3px  rgba(0, 0, 0, 0.10);
  --shadow-2: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-3: 0 12px 40px rgba(0, 0, 0, 0.15);

  /* Semantic */
  --destructive: #D70015;
  --success:     #1A7F37;

  /* Data visualization */
  --chart-1:    rgba(0, 0, 0, 1.00);
  --chart-2:    rgba(0, 0, 0, 0.65);
  --chart-3:    rgba(0, 0, 0, 0.40);
  --chart-4:    rgba(0, 0, 0, 0.20);
  --chart-grid: rgba(0, 0, 0, 0.06);
  --chart-axis: rgba(0, 0, 0, 0.20);
}

:focus-visible {
  outline: 2px solid var(--foreground);
  outline-offset: 2px;
  box-shadow: 0 0 0 2px var(--background), 0 0 0 4px var(--foreground);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important;
    transition-duration: 1ms !important;
  }
}

@media (prefers-contrast: more) {
  :root {
    --border:               rgba(0, 0, 0, 0.30);
    --border-strong:        rgba(0, 0, 0, 0.70);
    --foreground-secondary: rgba(0, 0, 0, 0.75);
    --foreground-tertiary:  rgba(0, 0, 0, 0.60);
    --shadow-1: 0 0 0 1px rgba(0, 0, 0, 0.20);
    --shadow-2: 0 0 0 1px rgba(0, 0, 0, 0.20);
    --shadow-3: 0 0 0 1px rgba(0, 0, 0, 0.20);
  }
}

.sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}

.tabular { font-variant-numeric: tabular-nums; }
```

---

#### 19. Review Rules

**Document:**
- `<html lang="...">` set correctly
- Viewport has no `user-scalable=no` or `maximum-scale`
- `<title>` descriptive and unique per page
- Orientation not locked

**Accessibility (WCAG 2.2 AA):**
- Body text ≥ 4.5:1 contrast
- UI component boundaries (`--border-strong`) ≥ 3:1 — WCAG 1.4.11
- Status/error never communicated by color alone — icon + text always — WCAG 1.4.1
- No fixed-height containers on text — WCAG 1.4.12
- Interactive elements ≥ 24px height. Primary actions ≥ 44px.
- `:focus-visible` double-ring on all interactive elements. No bare `outline: none`.
- `tabindex` > 0 never used
- `prefers-reduced-motion` disables all animations
- `prefers-contrast: more` handled
- Every form input has `<label for="id">` — not placeholder-only
- Required fields use `aria-required="true"` and visible `*` explained once
- Errors: `aria-describedby` + `role="alert"` + icon + text
- Toasts: `aria-live="polite"` or `role="alert"` with `aria-atomic="true"`
- Status messages: `role="status"` for all non-focus DOM additions (counts, confirmations)
- Modals: focus trap, focus return on close, Escape to close
- Tabs: arrow key navigation, `role="tablist/tab/tabpanel"`
- Accordion: `aria-expanded`, `aria-controls`
- Tooltips: dismissible via Escape, hoverable, persistent (WCAG 1.4.13)
- Skip link is first focusable element on every page
- One `<h1>` per page. Heading levels never skip.
- Decorative icons `aria-hidden="true"`. Informational icons have `aria-label`.
- Visible button labels are contained within their `aria-label` (WCAG 2.5.3)
- `<dialog>` for modals, `<button>` for buttons, `<nav>` for navigation
- Images: `alt`, `width`, `height`. Decorative: `alt=""`.
- Complex tables have `<caption>` and `scope` on headers
- Charts have text summary or data table alternative
- `resize: vertical` on textareas — never `resize: none`
- Empty states have icon + title + description + optional CTA
- Moving/looping content > 5s has pause/stop control — WCAG 2.2.2
- All path-based gestures (swipe, pinch) have single-pointer alternative — WCAG 2.5.1
- Focus never triggers context change — WCAG 3.2.1
- Input value change never triggers navigation — WCAG 3.2.2
- Financial/destructive actions have confirmation step — WCAG 3.3.4
- Link text is descriptive out of context — no "click here" or "read more" — WCAG 2.4.4
- Form submit: focus moves to first error, count announced via `role="alert"`
- Mobile nav: focus trap, Escape closes, `aria-expanded` on trigger
- Pagination: `aria-current="page"`, page change announced via `role="status"`
- Search: `role="search"`, result count via `role="status"`, arrow key navigation
- Drag-and-drop has keyboard/single-pointer alternative — WCAG 2.5.7
- All interactive targets ≥ 24×24px — WCAG 2.5.8
- No re-entry of previously provided data in same session — WCAG 3.3.7
- Password fields allow paste. No `autocomplete="off"` on passwords — WCAG 3.3.8
- Actions fire on `click`/`pointerup`, not `pointerdown` — WCAG 2.5.2
- Session expiry warns ≥ 2 minutes before with option to extend — WCAG 2.2.1
- Navigation order is identical across all pages — WCAG 3.2.3
- Components with same function have same accessible name everywhere — WCAG 3.2.4
- Bottom tab bar shows `aria-current="page"` on active tab
- Bottom tab bar always shows visible text labels — never icon-only tabs
- Bottom tab bar uses `env(safe-area-inset-bottom)` for iPhone notch

**Design consistency:**
- No raw hex/rgba — all via tokens
- No raw z-index integers — all via `--z-*`
- No `transition: all` — specific property + `var(--duration-*)` + `var(--ease-*)`
- No dark mode overrides
- Spacing via tokens, multiples of 4 or 8
- Typography via `--text-*` tokens
- Prose capped at `--measure` (65ch)
- Toggle checked uses `--foreground`, not `--success`
- Skeleton uses `--ease-symmetric`
- Code blocks use `--font-mono` and `overflow-x: auto`

---

#### 20. Audit Commands

```bash
# Raw color literals
rg -n "#[0-9a-fA-F]{3,6}|rgba?\(" apps/ --glob "*.tsx" --glob "*.ts" --glob "*.css"

# Raw z-index
rg -n "z-index:\s*[0-9]" apps/ --glob "*.tsx" --glob "*.css"

# tabindex > 0 (breaks tab order)
rg -n "tabindex=[\"'][1-9]" apps/ --glob "*.tsx"

# transition: all
rg -n "transition:\s*all|transition-all" apps/ --glob "*.tsx" --glob "*.css"

# Dark mode overrides
rg -n "prefers-color-scheme|dark:" apps/ --glob "*.tsx" --glob "*.css"

# outline: none without replacement
rg -n "outline:\s*none|outline:\s*0" apps/ --glob "*.tsx" --glob "*.css"

# Fixed heights on text containers (text-spacing reflow risk)
rg -n "height:\s*[0-9]+px" apps/ --glob "*.tsx" --glob "*.css" | rg -v "min-height|max-height|border|outline|icon|img|svg"

# Missing focus-visible
rg -n ":focus-visible" apps/ --glob "*.tsx" --glob "*.css"

# Missing lang attribute
rg -n "<html(?![^>]*lang)" apps/ --glob "*.tsx" --glob "*.html"

# Viewport scalability disabled
rg -n "user-scalable=no|maximum-scale=1" apps/ --glob "*.tsx" --glob "*.html"

# Placeholder-only inputs
rg -n "<input[^>]*placeholder" apps/ --glob "*.tsx" | rg -v "aria-label|htmlFor|id="

# Images missing alt
rg -n "<img(?![^>]*alt)" apps/ --glob "*.tsx"

# Images missing dimensions (layout shift)
rg -n "<img(?![^>]*width)" apps/ --glob "*.tsx"

# Skip link
rg -n "skip-link|skip-to-content" apps/ --glob "*.tsx"

# resize: none on textareas
rg -n "resize:\s*none" apps/ --glob "*.tsx" --glob "*.css"

# Missing aria-live on status regions
rg -n "role=\"status\"|role=\"alert\"" apps/ --glob "*.tsx" | rg -v "aria-live|aria-atomic"

# Charts missing text alternative
rg -n "<canvas|recharts|Chart" apps/ --glob "*.tsx" | rg -v "aria-label|role=\"img\""

# Tooltip missing role
rg -n "tooltip" apps/ --glob "*.tsx" | rg -v "role=\"tooltip\""

# Buttons as divs
rg -n "onClick.*<div|onClick.*<span" apps/ --glob "*.tsx"

# Ambiguous link text (WCAG 2.4.4)
rg -n ">click here<|>read more<|>learn more<|>here<|>details<" apps/ --glob "*.tsx" -i

# Auto-navigation on select change (WCAG 3.2.2)
rg -n "onChange.*router|onChange.*navigate|onChange.*location" apps/ --glob "*.tsx"

# Missing carousel/animation pause controls (WCAG 2.2.2)
rg -n "setInterval|setTimeout.*[5-9][0-9]{3}|autoplay" apps/ --glob "*.tsx" | rg -v "pause|stop|clearInterval"

# Confirmation missing on destructive actions (WCAG 3.3.4)
rg -n "delete|remove|revoke|cancel.*subscription" apps/ --glob "*.tsx" -i | rg -v "confirm|dialog|modal|alert"

# Search missing role
rg -n "<input.*type.*search|<input.*search" apps/ --glob "*.tsx" | rg -v "role=\"search\"|<search"

# Pagination missing aria-current
rg -n "pagination|Pagination" apps/ --glob "*.tsx" | rg -v "aria-current"

# Mobile nav missing aria-expanded
rg -n "hamburger|mobile.*menu|menu.*mobile|drawer" apps/ --glob "*.tsx" -i | rg -v "aria-expanded"

# Pointer events on down (WCAG 2.5.2) — actions should fire on click, not mousedown/pointerdown
rg -n "onMouseDown|onPointerDown|onTouchStart" apps/ --glob "*.tsx" | rg -v "drag|slider|canvas|draw"

# Password fields blocking paste (WCAG 3.3.8)
rg -n "onPaste.*false|onpaste.*return false|autocomplete.*off.*password" apps/ --glob "*.tsx" --glob "*.html" -i

# Confirm email / re-entry fields (WCAG 3.3.7)
rg -n "confirm.*email|email.*confirm|confirmEmail|emailConfirm" apps/ --glob "*.tsx" -i

# Bottom tab bar missing aria-current
rg -n "tab-bar|TabBar|bottomTab|BottomTab|NativeTabs" apps/ --glob "*.tsx" | rg -v "aria-current"

# Session timeout — check for expiry handling with no warning UI
rg -n "session.*expir|token.*expir|signOut.*idle|idle.*timeout" apps/ --glob "*.tsx" -i | rg -v "warn|dialog|modal|countdown"

# safe-area-inset missing on fixed bottom bars
rg -n "position.*fixed|position.*sticky" apps/ --glob "*.css" --glob "*.tsx" | rg -v "safe-area|env("
```
