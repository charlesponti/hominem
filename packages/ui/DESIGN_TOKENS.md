# Design Tokens Guide

This guide explains the design token system used in `@hominem/ui` and provides best practices for consuming and extending tokens.

## Overview

Design tokens are the single source of truth for design decisions: colors, typography, spacing, shadows, motion, and layout constraints. They are defined in two places:

1. **TypeScript tokens** (`src/tokens/*.ts`) — Consumed by JavaScript/TypeScript code
2. **CSS variables** (`src/styles/globals.css`) — Consumed by Tailwind CSS and inline styles

Both sources must remain synchronized.

---

## Token Categories

### 1. Colors

**Location**: `src/tokens/colors.ts` and `src/styles/globals.css`

Colors follow Apple HIG semantic naming conventions: backgrounds, text hierarchy, borders, and status colors.

#### Usage Patterns

**Light backgrounds (semantic):**
- `bg-base` (`#ffffff`) — App background
- `bg-surface` (`#f5f5f7`) — Cards, panels
- `bg-elevated` (`#f2f2f7`) — Modals, overlays

**Text hierarchy:**
- `text-primary` (`#000000`) — Main text
- `text-secondary` (`#555555`) — Subtext, labels
- `text-tertiary` (`#888888`) — Metadata, secondary hints
- `text-disabled` (`#cccccc`) — Disabled text

**Semantic status colors:**
- `success` (`#34c759`) — Positive actions, validation
- `warning` (`#ff9500`) — Warnings, non-blocking issues
- `destructive` (`#ff3b30`) — Destructive actions, errors

**Emphasis scale** (for opacity-based layering):
- `emphasis-highest` through `emphasis-faint` — 9 levels of opacity on black
- Use for data visualization, secondary text, and subtle differentiation

#### Do's and Don'ts

✅ **Do:**
```tsx
className={cn(
  'text-text-secondary',  // Semantic name
  'bg-surface'
)}
```

❌ **Don't:**
```tsx
className="text-gray-600 bg-gray-100"  // Hardcoded colors
style={{ color: '#555555' }}           // Inline colors
```

---

### 2. Typography

**Location**: `src/tokens/typography.ts`

#### Font Families

- **Primary**: Geist (sans-serif)
  - Weights: 400, 500, 600, 700
  - Use for all body text, headings, UI text

- **Mono**: Geist Mono
  - Weights: 400, 500, 600, 700
  - Use for code blocks, terminal output, technical content

#### Font Sizes

- `font-size-xs` (12px) — Small labels, captions
- `font-size-sm` (14px) — Secondary text, hints
- `font-size-md` (16px) — Body text, default
- `font-size-lg` (18px) — Subheadings
- `font-size-xl` (20px) — Section headings
- `font-size-display` (28px) — Page titles

#### Line Heights

- `line-height-tight` (1.2) — Headings, compact text
- `line-height-normal` (1.4) — Body text, labels
- `line-height-relaxed` (1.6) — Long-form content, accessibility

#### Usage

✅ **Do:**
```tsx
<heading className="text-font-size-xl font-semibold leading-line-height-tight">
  Page Title
</heading>
```

Or use the `Heading` / `Text` components:
```tsx
import { Heading, Text } from '@hominem/ui';

<Heading level="1">Page Title</Heading>
<Text variant="body">Body text here</Text>
```

❌ **Don't:**
```tsx
<h1 style={{ fontSize: '20px', lineHeight: 1.2 }}>  // Hardcoded
```

---

### 3. Spacing

**Location**: `src/tokens/spacing.ts`

Spacing uses a **4px + 8px grid**:
- Level 1: 4px (gap between inline elements)
- Level 2: 8px (standard spacing)
- Level 3: 12px (small grouping)
- Level 4: 16px (standard component padding)
- Level 5: 24px (section spacing)
- Level 6: 32px (large section spacing)
- Level 7: 48px (XL spacing)
- Level 8: 64px (XXL spacing)

#### Content Widths

**New in v1.1**: Content width tokens for constraining max-width:
- `contentWidths.bubble` (36rem / 576px) — Compact message bubbles
- `contentWidths.transcript` (44rem / 704px) — Standard transcript/content areas

#### Usage

✅ **Do:**
```tsx
import { spacing, contentWidths } from '@hominem/ui/tokens';

// In Tailwind
<div className="p-4 gap-3">  // spacing tokens: 16px padding, 12px gap

// In TypeScript
const containerPadding = spacing[4];  // 16px
const maxWidth = contentWidths.transcript;  // 44rem

// In inline styles
<div style={{ paddingTop: `${spacing[5]}px` }}>  // 24px
```

❌ **Don't:**
```tsx
<div className="p-5 gap-3.5">  // Arbitrary Tailwind values
<div style={{ padding: '20px' }}>  // Hardcoded spacing
```

---

### 4. Border Radius

**Location**: `src/tokens/radii.ts`

- `radius-sm` (6px) — Small elements (buttons, badges)
- `radius-md` (8px) — Standard elements (cards, inputs)
- `radius-lg` (12px) — Large containers (modals, popovers)
- `radius-xl` (16px) — XL containers, maximum radius
- `radius-icon` (22%) — Squircular appearance (Apple HIG)

#### Usage

```tsx
<button className="rounded-md">  // radius-md (8px)
<div className="rounded-lg">     // radius-lg (12px)
<img className="rounded-[22%]">  // radius-icon (squircular)
```

---

### 5. Shadows

**Location**: `src/tokens/shadows.ts`

Shadows provide elevation and depth:

- **Shadow-low** — Subtle cards, hover states
- **Shadow-medium** — Popovers, small modals
- **Shadow-high** — Full-screen modals, prominent elements

#### Usage

```tsx
<div className="shadow-lg">  // shadow-high in Tailwind
<card style={{ boxShadow: tokens.shadows.medium }}>
```

---

### 6. Motion & Animation

**Location**: `src/tokens/motion.ts` and `src/styles/animations.css`

Predefined animation durations and easing functions:

- `duration-fast` (150ms) — Micro interactions (hover, focus)
- `duration-normal` (300ms) — Standard transitions
- `duration-slow` (500ms) — Page transitions, important changes

GSAP sequences are also available:
```tsx
import { playEnterRow } from '@hominem/ui/lib/gsap/sequences';
playEnterRow(element);  // Plays a staggered entry animation
```

---

## Best Practices

### 1. Use Semantic Token Names

Always prefer semantic tokens over primitive values:

```tsx
// ✅ Semantic
className="bg-surface text-text-secondary"

// ❌ Primitive (avoid)
className="bg-gray-100 text-gray-600"
```

**Why?** Semantic tokens scale to dark mode, brand changes, and accessibility requirements.

### 2. Keep Tokens Synchronized

When adding new tokens:

1. **Add to TypeScript** (`src/tokens/*.ts`)
2. **Add to CSS variables** (`src/styles/globals.css` `@theme` block)
3. **Update this guide** with usage examples
4. **Run tests** to verify no tokens are missing

```bash
npm run test
npm run lint  # Check for unused tokens
```

### 3. Document Non-Standard Usage

If a component needs a custom value (e.g., a specific max-width), document why:

```tsx
function MessageContent({ width = 'transcript' }: Props) {
  // Use transcript width token (44rem) for standard content
  // or bubble width (36rem) for compact message displays
  const maxWidth = width === 'bubble'
    ? contentWidths.bubble
    : contentWidths.transcript;
}
```

### 4. Test Token Changes

Before merging token updates:
- Run Storybook to verify visual consistency
- Test responsive behavior on mobile
- Check color contrast with WCAG validator
- Verify animations on low-end devices

```bash
npm run storybook
npm run test
npm run lint
```

### 5. Accessibility Considerations

- **Color contrast**: All text must meet WCAG AA (4.5:1 for text, 3:1 for large text)
- **Focus states**: Always provide visible focus indicators
- **Motion**: Respect `prefers-reduced-motion` for animations

Tokens have been tested for WCAG AA compliance. If you create custom colors, verify contrast:

```
text-primary (#000000) on bg-base (#ffffff) = 21:1 ✓
text-secondary (#555555) on bg-base (#ffffff) = 7.6:1 ✓
text-tertiary (#888888) on bg-base (#ffffff) = 4.5:1 ✓
```

---

## Common Tasks

### Adding a New Component

1. Use semantic tokens for all styling:
   ```tsx
   className={cn(
     'bg-surface',
     'text-text-primary',
     'p-4 gap-3',  // spacing-4 and spacing-3
     'rounded-md'   // radius-md
   )}
   ```

2. Create a Storybook story with token variations
3. Add unit tests with token-based selectors

### Extending Colors for a Product

Override the accent color per-product:

```html
<body data-product="acme">
  <!-- CSS overrides --color-accent and --color-accent-foreground -->
</body>
```

### Creating a New Token Category

1. Create `src/tokens/new-category.ts`
2. Export type and constants
3. Add CSS variables to `src/styles/globals.css` `@theme` block
4. Update `src/tokens/index.ts` to export
5. Document in this guide

---

## Token Synchronization Checklist

When updating tokens, verify:

- [ ] TypeScript token value matches CSS variable value
- [ ] CSS variable is documented in this guide
- [ ] All components using the token are updated
- [ ] Tests pass: `npm run test`
- [ ] Lint passes: `npm run lint`
- [ ] Storybook renders correctly: `npm run storybook`
- [ ] Contrast checker validates for colors
- [ ] Mobile-responsive behavior is correct

---

## References

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Design Tokens Community](https://www.designtokens.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [WCAG 2.1 Color Contrast](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
