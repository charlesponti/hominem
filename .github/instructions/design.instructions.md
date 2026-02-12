---
applyTo: 'apps/**'
---

# Design System: VOID v1.2

## 00. Philosophy: The Four Pillars

The VOID design system is not a collection of components, but a manifestation of aesthetic constraints. It is an "amoralist" approach to UI—efficient, cold, and undeniably precise.

**Kanso (簡素 - Simplicity):** Elimination of the non-essential. If a pixel does not serve a functional purpose, it is a distraction.

**Ma (間 - Negative Space):** The "void" is a structural element. Space is used to enforce focus and respect the user's cognitive load.

**Shibui (渋い - Understated):** No performance. No animations. No decorative gradients. The beauty lies in the static presence of raw data.

**Wabi-sabi (侘寂 - Imperfection):** Technical honesty. Asymmetry. Asynchronous patterns that reflect the "glitch" in the system rather than corporate perfection.

## 01. Color Palette (The Monochrome Mandate)

We do not use color to evoke emotion. We use light to indicate state.

### Core Surface

| Variable       | Value                       | Usage                                            |
| -------------- | --------------------------- | ------------------------------------------------ |
| `--background` | `#000000`                   | The absolute foundation. No exceptions.          |
| `--muted`      | `rgba(255, 255, 255, 0.05)` | Secondary surfaces, containers, or subtle depth. |

### Typography & Icons

| Variable                 | Value                      | Usage                                     |
| ------------------------ | -------------------------- | ----------------------------------------- |
| `--foreground`           | `#FFFFFF`                  | Primary text and high-importance headers. |
| `--secondary-foreground` | `rgba(255, 255, 255, 0.7)` | Body text and secondary descriptors.      |
| `--muted-foreground`     | `rgba(255, 255, 255, 0.4)` | Meta-data, labels, and footer elements.   |

### Technical Indicators

| Variable        | Value                      | Usage                                                   |
| --------------- | -------------------------- | ------------------------------------------------------- |
| `--primary`     | `#FFFFFF`                  | Actionable elements (Buttons, Checkboxes).              |
| `--destructive` | `#FF0000`                  | Critical errors or system failures. Pure technical red. |
| `--success`     | `rgba(255, 255, 255, 0.7)` | Positive confirmations. Same as secondary-foreground.   |
| `--warning`     | `#FF8800`                  | System warnings or non-terminal errors.                 |
| `--border`      | `rgba(255, 255, 255, 0.1)` | Structural divisions only.                              |

## 02. Typography

Monospace is the only allowed classification. It represents the rawest form of digital communication—the terminal.

**Primary stack:** `Geist Mono`, `ui-monospace`, `SFMono-Regular`, `Menlo`, `Monaco`, `Consolas`, `monospace`.

### Scale

- **Display 1:** `clamp(2.5rem, 5vw, 6rem)` — Reserved for primary branding and section starts.
- **Heading:** Always uppercase. Always tracking-tighter.
- **Body:** `text-sm` (14px). Leading should be generous (relaxed) to allow for Ma.

### Accessibility Requirements

- Maintain WCAG AA contrast ratio (4.5:1 for text, 3:1 for UI components).
- Use a single, clear typography scale (max 3-4 font sizes for hierarchy).
- Apply consistent spacing using design tokens (multiples of 4px or 8px).

## 03. Layout & Structure (Fukinsei)

We reject the 12-column rigid grid. We embrace intentional asymmetry.

**Vertical Rhythm:** Use massive spacing (`--spacing-ma-xl: 16rem`) to separate distinct thoughts.

**Alignment:** Left-aligned by default. Right-alignment is used for technical meta-data only.

**Borders:** 1px solid at 10% opacity. Never use shadows or depth effects.

**Fukinsei (Asymmetry):** Avoid perfect symmetry in complex layouts. Use varying border weights (e.g., `border-l-2` vs `border-r-0`) to create structural "weight."

**Whitespace:** Embrace whitespace; avoid visual clutter and cognitive overload.

## 04. Motion & Interaction (Instant Shock)

VOID is a static system.

**Animations:** Forbidden. No `transition-all`. No `ease-in-out`.

**Transitions:** Forbidden. State changes (hover/active) must be instantaneous (0ms).

**Instant Inversion:** Active or focused elements should instantly swap `background` and `foreground` colors.

**Cursor:** Crosshair is the mandatory default. Never use `cursor: pointer`.

### Keyboard Accessibility

- Every interactive element must be keyboard accessible with visible focus states.
- Support tab order that matches visual layout; test with keyboard-only navigation.
- Support `prefers-reduced-motion` media query; disable animations for users who need it.

## 05. The ASCII Texture & Indicators (Wabi-sabi)

To prevent the UI from feeling "dead," we introduce low-opacity ASCII textures. These represent the "Signal in the Void"—transient patterns that suggest the system is alive without utilizing high-compute graphical assets.

- **Opacity:** Never exceed 0.20 for static textures, 0.10 for background patterns.
- **Characters:** `+`, `·`, `~`, `-`, `/`, `\\`.
- **Indicators:** Use ASCII blocks (`█`, `▓`, `▒`, `░`) for loading or progress instead of circular spinners.
- **Rules:** Patterns should be generated algorithmically, not as static images.

## 06. Tone of Voice (Cold Copy)

The copy should be direct, cold, and efficient.

- **All-Caps Action:** All primary buttons and action triggers must be `UPPERCASE`.
- **Technically Honest:** Use technical terms where appropriate (`INITIALIZING` instead of `Loading...`).

### Examples

- **Correct:** `[ADD_TO_CART]`
- **Incorrect:** `Would you like to buy this?`

- **Correct:** `THE PACKAGE WILL ARRIVE WHEN THE LOGISTICS PERMIT.`
- **Incorrect:** `We're working hard to get your order to you!`

### Content Guidelines

- Use plain language; avoid jargon and unnecessary complexity.
- Break content into scannable sections with clear headings.
- Use lists instead of dense paragraphs for multiple items.
- Keep instructions concise and action-focused.
- Provide helpful, contextual information (e.g., format hints) near inputs.

## 07. Semantic HTML & ARIA

- Use semantic HTML (`<button>`, `<nav>`, `<main>`, `<label>`) before ARIA.
- Provide ARIA labels only when semantic HTML is insufficient.

### Forms & Input

- Always pair inputs with explicit `<label>` elements (not placeholders alone).
- Use `aria-describedby` for helper text and error messages.
- Provide clear, constructive error messages below invalid fields.
- Mark required fields with asterisks and `aria-required="true"`.
- Disable form submission until critical validation passes.

### Icons & Images

- Never rely on icons alone; pair with text labels.
- Use block-based icons or ASCII symbols where possible.
- Provide `alt` text for all images (concise and meaningful).
- Use `aria-hidden="true"` for decorative icons; expose functional ones.
- Ensure icon colors pass contrast requirements.

### State & Feedback

- Provide immediate, clear feedback for user actions (success, error, loading).
- Use progress indicators for multi-step processes.
- Announce dynamic content changes with `aria-live="polite"`.
- Maintain focus position or return focus to trigger element after updates.

## 08. Analytics & Data Visualization

- Show metric definition, unit, and time window with timezone.
- Use shared formatting helpers and design tokens.
- Mobile-first; tables collapse to stacked cards.
- Provide loading, empty, and error states.
- Charts and tables must be accessible and keyboard friendly.
- Provide text summaries for charts and table fallbacks when needed.
- Aggregate and paginate server-side; debounce filters.
- Include exports for actionable datasets.
- Use semantic color tokens for positive/negative values.

## 09. Technical Ornamentation

Expose the machine state as a structural element.

- **Metadata Overlays:** Containers (Cards, Modals) should display non-essential system metadata (e.g., relative coordinates, timestamps, or version strings) in corners at low opacity.
- **Utility:** Use the `void-metadata` CSS class.

## 10. The Void Scrollbar

Scrollbars must not distract from the content.

- **Style:** 2px width, transparent track, solid white (or primary) thumb.
- **Motion:** No transition on thumb visibility.
- **Constraint:** Maintain technical precision; no rounded caps on the thumb.
