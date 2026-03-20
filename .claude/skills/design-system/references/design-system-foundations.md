# Design System — Foundations

## Typography

### Fonts

| Platform | Primary | Monospace |
|----------|---------|-----------|
| Web | Geist | Geist Mono |
| Mobile | Inter | Geist Mono |

Never pass a font name as a raw string — use the fontFamily token.

### Type scale

| Class | Size | Weight | Line height | Letter spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| display-1 | clamp(24px, 4vw, 32px) | 700 | 1.2 | -0.02em | Page hero |
| display-2 | 24px | 600 | 1.2 | -0.01em | Section hero |
| heading-1 | 22px | 600 | 1.2 | -0.01em | Panel title |
| heading-2 | 20px | 600 | 1.3 | 0 | Section heading |
| heading-3 | 18px | 600 | 1.3 | 0 | Sub-section |
| heading-4 | 16px | 600 | 1.4 | 0 | Item title |
| body-1 | 16px | 400 | 1.6 | 0 | Primary body |
| body-2 | 14px | 400 | 1.5 | 0 | Secondary body, previews |
| body-3 | 13px | 400 | 1.5 | 0 | Tertiary, meta |
| body-4 | 12px | 400 | 1.4 | 0 | Timestamps, labels |
| subheading-1 | 14px | 500 | 1.4 | 0.01em | Strong label |
| subheading-2 | 13px | 500 | 1.4 | 0.01em | Pill label |
| subheading-3 | 12px | 500 | 1.3 | 0.02em | Eyebrow |
| subheading-4 | 11px | 500 | 1.3 | 0.03em | Smallest label |

Rules:
- Never mix raw Tailwind size/weight utilities for product text
- Never font-weight above 700
- Never letter-spacing on body text (body-1 through body-4)
- Maximum line length: 72ch for body copy — enforce with max-w tokens

---

## Color

### Backgrounds

| Token | Light value | Usage |
|-------|-------------|-------|
| bg-base | #ffffff | Page root, feed background |
| bg-surface | #f5f5f7 | Cards, panels, sidebar, secondary surfaces |
| bg-elevated | #ffffff | Modals, popovers, command palette (lifted by shadow) |
| bg-overlay | rgba(0,0,0,0.4) | Backdrop behind modals and sheets |

### Text

| Token | Usage | Min contrast vs bg-base |
|-------|-------|------------------------|
| text-primary | Titles, body | 15:1 |
| text-secondary | Descriptions, previews | 7:1 |
| text-tertiary | Timestamps, labels, placeholder | 4.5:1 |
| text-disabled | Non-interactive text | Not required (not interactive) |

### Borders

| Token | Opacity | Usage |
|-------|---------|-------|
| border-subtle | 0.05 | Hairlines, card edges |
| border-default | 0.08 | Standard container borders |
| border-strong | 0.12 | Focused input base |

### Accent and semantic

| Purpose | Value | Usage |
|---------|-------|-------|
| Accent | #007AFF (Apple system blue) | CTAs, focus rings, active state, links |
| Destructive | #FF3B30 | Delete, error, danger — never use accent here |
| Success | #34C759 | Confirmed, completed |
| Warning | #FF9500 | Caution, degraded state |

### Emphasis scale

9 opacity levels (emphasis.highest → emphasis.faint) via rgba(0,0,0,x).
Used for hover overlays, pressed states, and layered surfaces — never for text.

### Accessibility — contrast requirements

- Body text (body-1, body-2): **4.5:1 minimum** against its background (WCAG AA)
- Large text (display, heading-1–2): **3:1 minimum**
- UI components and borders: **3:1 minimum**
- Aim for AAA (7:1) on primary body text wherever possible

### Rules

- Never use hex literals outside of the token files
- Never use opacity to dim text — use the correct text tier token
- Never use raw Tailwind gray-*/blue-* palette classes directly
- Dark mode: do not add dark: variants speculatively

---

## Spacing

8px primary grid. 4px secondary for fine internal spacing only.

| Step | Value | Usage |
|------|-------|-------|
| 1 | 4px | Icon gaps, tight internal spacing |
| 2 | 8px | Component internal (small) |
| 3 | 12px | Component padding (compact) |
| 4 | 16px | Component padding (standard), page mobile gutter |
| 5 | 24px | Section spacing, page desktop gutter |
| 6 | 32px | Large section gap |
| 7 | 48px | Page-level breathing room |
| 8 | 64px | Hero sections, max vertical spacing |

Exception: 1px for hairline borders only. No other values permitted.

---

## Elevation

Elevation = shadow tier + surface token together. Never mismatch.

| Level | Shadow token | Surface token | Use case |
|-------|-------------|---------------|----------|
| 0 | none | bg-base | Page root, feed |
| 1 | shadows.low | bg-surface | Cards, sidebar, panels |
| 2 | shadows.medium | bg-elevated | Dropdowns, tooltips, popovers |
| 3 | shadows.high | bg-elevated | Modals, sheets, command palette |

Shadow values:
- low: 0 2px 8px rgba(0,0,0,0.35)
- medium: 0 8px 24px rgba(0,0,0,0.45)
- high: 0 20px 60px rgba(0,0,0,0.55)

Never apply shadows.high to inline elements.
Never change shadow on hover — use background-color instead.
Never animate box-shadow directly — use a pseudo-element opacity trick.

Native (React Native) equivalents in shadows.native token — never use CSS box-shadow strings in native code.

---

## Border Radius

| Token | Value (web) | Value (native) | Usage |
|-------|------------|----------------|-------|
| radii.sm | 6px | 6 | Badges, pills, small tags |
| radii.md | 10px | 10 | Buttons, inputs, text fields |
| radii.lg | 14px | 14 | Cards, feed rows, panels |
| radii.xl | 20px | 20 | Sheets, modals, large panels |
| radii.icon | 22% | 20 | Squircle avatars and app icons |

Rules:
- Never use rounded-full except on circular avatars or toggle indicators
- Never mix radius tiers on the same component
- Nested surfaces use one tier smaller than their parent

---

## Z-index scale

| Token | Value | Usage |
|-------|-------|-------|
| z-base | 0 | Static page elements |
| z-raised | 10 | Sticky headers, floating action buttons, HyperForm |
| z-dropdown | 100 | Dropdowns, popovers, tooltips |
| z-overlay | 200 | Modal/sheet backdrop |
| z-modal | 300 | Modals and sheets |
| z-toast | 400 | Toast notifications |
| z-max | 9999 | Emergency override only — justify with inline comment |

Never hardcode a z-index value. Never use values between defined steps.
Dropdowns triggered from inside a modal must portal to document.body to render above z-modal.

---

## Breakpoints

| Name | Min width | Grid columns | Gutter |
|------|-----------|-------------|--------|
| (base) | 0 | 4 | 16px |
| sm | 640px | 4 | 16px |
| md | 768px | 8 | 24px |
| lg | 1024px | 12 | 24px |
| xl | 1280px | 12 | 24px |

Rules:
- Mobile-first always. Base styles = mobile. Layer up with md:, lg:, xl:.
- Never use max-width media queries. Never style down.
- Sidebar + main layout: sidebar 240px fixed, main takes remaining width, collapses to drawer below md.
- Content max widths: 768px body, 640px search, 480px modal, 416px workspace aside.

---

## Sizing and touch targets

- Touch target minimum: 44px × 44px (Apple HIG + WCAG 2.5.5)
- If visual element is smaller, add invisible padding (web) or hitSlop (native)

### Icon sizing grid

| Context | Size |
|---------|------|
| Inline with body text | 16px |
| Button / toolbar action | 20px |
| Navigation tab | 24px |
| Empty state / illustration | 48px |

Icon libraries: named imports only from the project's configured library (lucide-react web, @expo/vector-icons native).
Never import entire icon sets. Never use emoji as icons in UI chrome.

### Avatar sizing grid

| Context | Size | Radius |
|---------|------|--------|
| Comment / message inline | 24px | radii.icon |
| List row | 32px | radii.icon |
| Profile header | 48px | radii.icon |
| Hero / settings page | 80px | radii.icon |
