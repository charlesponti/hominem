---
applyTo: 'apps/**'
---

### VOID Design System: Comprehensive Documentation

The VOID design system is an "amoralist" approach to UI, manifesting as a collection of aesthetic constraints designed for efficiency, precision, and a cold, technical atmosphere. This documentation merges all current versions (v1.1, v1.2, and Quickstart) into a single technical standard.

Canonical reference for implementation notes and historical mappings now lives at [docs/DESIGN_SYSTEM.md](/Users/charlesponti/Developer/hominem/docs/DESIGN_SYSTEM.md). Follow this file for one-source audits.

---

#### 00. Philosophy: The Four Pillars

The system is built upon four core Japanese aesthetic principles:

- **Kanso (簡素 - Simplicity):** Eliminate the non-essential; if a pixel lacks functional purpose, it is a distraction.
- **Ma (間 - Negative Space):** The "void" is a structural element used to enforce focus and respect cognitive load.
- **Shibui (渋い - Understated):** Beauty lies in the static presence of raw data without decorative gradients or excessive performance.
- **Wabi-sabi (侘寂 - Imperfection):** Embrace technical honesty through asymmetry and asynchronous "glitch" patterns rather than corporate perfection.

---

#### 01. Color Palette (The Monochrome Mandate)

Color is used exclusively to indicate state, never to evoke emotion.

| Variable                   | Value                     | Usage                                                    |
| :------------------------- | :------------------------ | :------------------------------------------------------- |
| **--background**           | #000000                   | The absolute foundation.                                 |
| **--foreground**           | #FFFFFF                   | Primary text and high-importance headers.                |
| **--secondary-foreground** | rgba(255, 255, 255, 0.7)  | Body text and secondary descriptors.                     |
| **--muted-foreground**     | rgba(255, 255, 255, 0.4)  | Meta-data, labels, and footer elements.                  |
| **--muted**                | rgba(255, 255, 255, 0.05) | Secondary surfaces, containers, or subtle depth.         |
| **--primary**              | #FFFFFF                   | Actionable elements like buttons and checkboxes.         |
| **--destructive**          | #FF0000                   | Critical errors or system failures (Pure technical red). |
| **--success**              | rgba(255, 255, 255, 0.7)  | Positive confirmations.                                  |
| **--warning**              | #FF8800                   | System warnings or non-terminal errors.                  |
| **--border**               | rgba(255, 255, 255, 0.1)  | Structural divisions only.                               |

**Note:** Use shared opacity steps (90/70/40/20/10%) for variations; raw hex/rgba values outside the palette are forbidden.

---

#### 02. Typography System

**Monospace** is the only allowed classification, representing the raw digital terminal.

- **Primary Stack:** Geist Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace.
- **Hierarchy:** Max 3–4 font sizes per view.
- **Display 1:** `clamp(2.5rem, 5vw, 6rem)` for primary branding and section starts.
- **Heading:** Always uppercase with fixed, tighter tracking.
- **Body:** `text-sm` (14px) with generous, relaxed leading to allow for **Ma**.
- **Accessibility:** Maintain **WCAG AA** contrast ratios (4.5:1 for text, 3:1 for components).

---

#### 03. Layout & Structure (Fukinsei)

VOID rejects rigid 12-column grids in favor of **intentional asymmetry**.

- **Vertical Rhythm:** Use massive spacing tokens (**--spacing-ma-xl: 16rem**) to separate distinct thoughts.
- **Alignment:** Default to left-alignment; right-alignment is reserved for technical meta-data.
- **Borders:** 1px solid at 10% opacity. Use varying weights (e.g., `border-l-2` vs `border-r-0`) to create structural "weight".
- **Forbidden:** Shadows, depth effects, rounded corners, glass blur, or dense micro-spacing.

---

#### 04. Motion & Interaction

VOID is primarily a **static system**.

- **Transitions:** State changes (hover/active) must be **instantaneous (0ms)**.
- **Instant Inversion:** Active or focused elements should instantly swap background and foreground colors.
- **Allowed Animations:** Only for technical clarity. Properties: `opacity`, `transform: scale`. Timing: 80ms–120ms (linear/ease-out) or "breezy wave" (`void-anim-*`) with 320ms entry/1800ms loop.
- **Forbidden Motion:** Parallax, blur, gradients, spring/bounce physics, and continuous pulsing (except loading feedback).
- **Cursor:** **Crosshair** is the mandatory default; never use `cursor: pointer`.
- **Accessibility:** Support `prefers-reduced-motion` and ensure every element is keyboard-navigable with a 2px solid foreground focus state.

---

#### 05. The ASCII Texture & Indicators (Wabi-sabi)

ASCII represents the "Signal in the Void," suggesting the system is alive without high-compute assets.

- **Opacity:** Never exceed **0.20** (default 0.12 for backgrounds, 0.10 for patterns).
- **Characters:** `+`, `·`, `~`, `-`, `/`, `\`.
- **Indicators:** Use ASCII blocks (**█, ▓, ▒, ░**) for loading or progress instead of circular spinners.
- **Constraint:** Applied only to large backgrounds or empty states; never on data tables or controls.

---

#### 06. Tone of Voice (Cold Copy)

Copy must be direct, cold, and efficient.

- **All-Caps Action:** Primary buttons and action triggers must be **UPPERCASE**.
- **Technical Honesty:** Use terms like `INITIALIZING` instead of `Loading...`.
- **Examples:** Use `[ADD_TO_CART]` instead of `Would you like to buy this?`.
- **Forbidden:** "Friendly" words (please, thanks, welcome), exclamation points, and emojis.

---

#### 07. Components & Technical Details

- **Buttons:** Rectangular with two sizes; variants include primary, ghost, and destructive.
- **Forms:** Stacked labels with generous gaps; disable submission until critical validation passes.
- **Tables:** Left-align text, right-align numbers/meta; use opacity steps for zebra striping.
- **Dialogs:** Border + padding with no elevation; asymmetric padding is encouraged for Wabi-sabi.
- **Void Scrollbar:** 2px width, transparent track, solid white thumb with no rounded caps or transitions.
- **Technical Ornamentation:** Use the `.void-metadata` class to display system metadata (timestamps, coordinates) in corners at low opacity.
- **Data Visualization:** Charts and tables must include text summaries and fallback tables; aggregate and paginate server-side.

---

#### 08. Review Checklist

- Are tokens used exclusively (no raw hex)?
- Is **Ma** (massive spacing) present?
- Is the copy cold and all-caps for actions?
- Is the cursor a crosshair and focus visible?
- Does it meet **WCAG AA** contrast?
