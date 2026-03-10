---
applyTo: 'apps/**'
---

### Hominem Design System

Apple HIG structure applied to a strictly monotone light palette. Single mode only — no dark mode.

Canonical reference: [docs/DESIGN_SYSTEM.md](/Users/charlesponti/Developer/hominem/docs/DESIGN_SYSTEM.md)

---

#### 00. Philosophy

- **Kanso (簡素 - Simplicity):** Remove the non-essential. If a pixel does not serve a function, it is noise.
- **Ma (間 - Negative Space):** Empty space is a structural element, not a failure to fill.
- **Shibui (渋い - Understated):** No performance. No decoration. Clarity is the aesthetic.
- **Wabi-sabi (侘寂 - Imperfection):** Technical honesty over corporate polish. Asymmetry is allowed where it improves signal.

---

#### 01. Color & Surface

Monotone only. No hues. No accent colors. Hierarchy through grey values and shadow alone.

| Token | Value | Usage |
| :--- | :--- | :--- |
| `--background` | `#FFFFFF` | Primary view background |
| `--surface` | `#F2F2F7` | Cards, inset lists, grouped sections |
| `--surface-elevated` | `#FFFFFF` | Popovers, inputs raised above `--surface` |
| `--surface-overlay` | `#E5E5EA` | Transient overlays, sheet backdrops |
| `--foreground` | `#000000` | Primary text, headings |
| `--foreground-secondary` | `rgba(60,60,67,0.60)` | Subtitles, descriptions |
| `--foreground-tertiary` | `rgba(60,60,67,0.30)` | Placeholder text |
| `--foreground-disabled` | `rgba(60,60,67,0.18)` | Disabled states |
| `--border` | `rgba(0,0,0,0.10)` | Structural dividers |
| `--border-strong` | `rgba(0,0,0,0.20)` | Focused inputs, emphasis |
| `--destructive` | `#FF3B30` | Errors, deletions, critical warnings |

**Rules:**
- No raw hex or rgba values in app code. All colors via tokens.
- No decorative gradients, tints, or accent fills.
- No `@media (prefers-color-scheme: dark)` overrides. No Tailwind `dark:` prefixes.

---

#### 02. Typography

System font stack — SF Pro on Apple, best available elsewhere. Zero loading cost.

```
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif
--font-mono: ui-monospace, "SF Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", monospace
```

Apple HIG scale:

| Role | Size | Weight | Line Height | Letter Spacing |
| :--- | :--- | :--- | :--- | :--- |
| Large Title | 34px | 700 | 41px | +0.37px |
| Title 1 | 28px | 600 | 34px | +0.36px |
| Title 2 | 22px | 600 | 28px | +0.35px |
| Title 3 | 20px | 400 | 25px | +0.38px |
| Headline | 17px | 600 | 22px | -0.41px |
| Body | 17px | 400 | 22px | -0.41px |
| Callout | 16px | 400 | 21px | -0.32px |
| Subheadline | 15px | 400 | 20px | -0.24px |
| Footnote | 13px | 400 | 18px | -0.08px |
| Caption | 12px | 400 | 16px | 0px |

**Rules:** No weights above 600 in running text. No arbitrary font sizes. WCAG AA contrast minimum (4.5:1 text, 3:1 components).

---

#### 03. Spacing & Layout

8pt grid. Structural spacing in multiples of 8. Micro-adjustments in multiples of 4.

| Token | Value |
| :--- | :--- |
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 24px |
| `--space-6` | 32px |
| `--space-7` | 48px |
| `--space-8` | 64px |
| `--space-ma` | 128px–256px |

Left-aligned by default. Right-alignment for numbers and metadata only. Asymmetric composition allowed where it improves signal.

---

#### 04. Corner Radius

| Context | Radius |
| :--- | :--- |
| Buttons, chips, inputs | `--radius-sm` (10px) |
| Standard cards | `--radius-md` (16px) |
| Large containers, sheets | `--radius-lg` (20px) |
| Modals | `--radius-xl` (24px) |
| App icons | 22.37% of side length |

---

#### 05. Depth & Elevation

| Level | Shadow | Surface |
| :--- | :--- | :--- |
| 0 — Base | none | `--background` `#FFFFFF` |
| 1 — Raised | `--shadow-1` `0 1px 3px rgba(0,0,0,0.10)` | `--surface` `#F2F2F7` |
| 2 — Elevated | `--shadow-2` `0 4px 12px rgba(0,0,0,0.08)` | `--surface-elevated` `#FFFFFF` |
| 3 — Floating | `--shadow-3` `0 12px 40px rgba(0,0,0,0.15)` | `--surface-overlay` `#E5E5EA` |

---

#### 06. Motion & Animation

Purposeful, light, fast. Every animation must communicate a state change — not decorate.

| Token | Value |
| :--- | :--- |
| `--ease-default` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1.00)` |
| `--ease-out` | `cubic-bezier(0.0, 0.0, 0.2, 1.0)` |
| `--ease-in` | `cubic-bezier(0.4, 0.0, 1.0, 1.0)` |
| `--duration-instant` | `80ms` |
| `--duration-fast` | `150ms` |
| `--duration-default` | `220ms` |
| `--duration-slow` | `350ms` |

- **Hover:** Background `--background` → `--surface` over `--duration-instant`.
- **Press:** Scale `0.97`, opacity `0.75` over `--duration-fast`.
- **Enter:** Fade in + translateY from `+8px` to `0` with `--ease-spring`.
- **Exit:** Fade out + translateY to `-4px` with `--ease-out`.
- **Focus:** `2px solid var(--foreground)`, `2px` offset, no transition.

**Rules:** No `transition-all`. No looping animations without live system-state justification. Always handle `prefers-reduced-motion`.

---

#### 07. Interaction States

| State | Treatment |
| :--- | :--- |
| Default | `--background`, `--foreground` text |
| Hover | `--surface` background, `--duration-instant` |
| Active | Scale `0.97`, opacity `0.75`, `--duration-fast` |
| Focus | `2px solid var(--foreground)`, `2px` offset |
| Disabled | `--foreground-disabled`, `cursor: not-allowed` |
| Loading | Opacity `0.60`, pointer-events none |

---

#### 08. Copy & Voice

- Imperative, terse, direct. One idea per sentence.
- Sentence case for UI labels. Uppercase permitted for section headings.
- No exclamation marks. No friendly prose.

| Correct | Incorrect |
| :--- | :--- |
| `Save changes` | `Would you like to save your changes?` |
| `Delete item` | `Are you sure? This can't be undone!` |
| `No results` | `We couldn't find anything!` |

---

#### 09. CSS Token Reference

```css
:root {
  /* Typography */
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  --font-mono: ui-monospace, "SF Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", monospace;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;

  /* Radius */
  --radius-sm:  10px;
  --radius-md:  16px;
  --radius-lg:  20px;
  --radius-xl:  24px;

  /* Motion */
  --ease-default: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1.00);
  --ease-out:     cubic-bezier(0.0,  0.0,  0.2,  1.0);
  --ease-in:      cubic-bezier(0.4,  0.0,  1.0,  1.0);
  --duration-instant: 80ms;
  --duration-fast:    150ms;
  --duration-default: 220ms;
  --duration-slow:    350ms;

  /* Surfaces */
  --background:       #FFFFFF;
  --surface:          #F2F2F7;
  --surface-elevated: #FFFFFF;
  --surface-overlay:  #E5E5EA;

  /* Text */
  --foreground:           #000000;
  --foreground-secondary: rgba(60,60,67,0.60);
  --foreground-tertiary:  rgba(60,60,67,0.30);
  --foreground-disabled:  rgba(60,60,67,0.18);

  /* Borders */
  --border:        rgba(0,0,0,0.10);
  --border-strong: rgba(0,0,0,0.20);

  /* Shadows */
  --shadow-1: 0 1px 3px  rgba(0,0,0,0.10);
  --shadow-2: 0 4px 12px rgba(0,0,0,0.08);
  --shadow-3: 0 12px 40px rgba(0,0,0,0.15);

  /* Semantic */
  --destructive: #FF3B30;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important;
    transition-duration: 1ms !important;
  }
}
```

---

#### 10. Review Rules

Before merging UI changes, verify:

- No raw hex or rgba in app code — all via tokens
- No decorative gradients, tint fills, or accent colors
- No `transition-all`
- No dark mode overrides (`prefers-color-scheme`, `dark:`)
- `prefers-reduced-motion` handled
- Typography on scale, no arbitrary sizes
- Spacing multiples of 4 or 8
- Copy direct, sentence case, no exclamation marks
- Radii via `--radius-*` tokens
- WCAG AA contrast verified

---

#### 11. Audit Commands

```bash
# Verify token definitions
rg -n "--background|--foreground|--border|--surface" packages/ui/src/styles/globals.css

# Check for raw color literals in app code
rg -n "#[0-9a-fA-F]{3,6}|rgba?\(" apps/ --glob "*.tsx" --glob "*.ts"

# Check for forbidden motion patterns
rg -n "transition-all|animate-spin" apps/ --glob "*.tsx" --glob "*.css"

# Check for dark mode overrides
rg -n "prefers-color-scheme|dark:" apps/ --glob "*.tsx" --glob "*.css"
```
