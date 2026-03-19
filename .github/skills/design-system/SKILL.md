---
name: design-system
description: >
  Apply when writing, reviewing, or modifying any UI code — components, styles,
  animations, tokens, or layout. Enforces the Hominem design system: Apple HIG
  alignment, strict token usage, GSAP-only interactive animations, minimalism,
  and performance.
license: MIT
compatibility: apps/notes, apps/mobile, packages/ui
metadata:
  author: Ponti Studios
  version: "2.0"
  category: Frontend
  tags: [design-system, tokens, gsap, animation, typography, color, spacing, components]
references:
  spec:         docs/design-system.md
  tokens:       packages/ui/src/tokens/index.ts
  colors:       packages/ui/src/tokens/colors.ts
  spacing:      packages/ui/src/tokens/spacing.ts
  typography:   packages/ui/src/tokens/typography.ts
  radii:        packages/ui/src/tokens/radii.ts
  shadows:      packages/ui/src/tokens/shadows.ts
  motion:       packages/ui/src/tokens/motion.ts
  notes:        packages/ui/src/tokens/notes.ts
  chat:         packages/ui/src/tokens/chat.ts
  sequences:    packages/ui/src/lib/gsap/sequences.ts
  globals:      packages/ui/src/styles/globals.css
  animations:   packages/ui/src/styles/animations.css
---

# Design System Skill

You are enforcing the Hominem design system. This is not a style guide — it is law.
Before writing any UI code, read the reference files listed in this skill's frontmatter.
The token files are the authoritative source of truth. The spec at `docs/design-system.md`
explains intent and rules. Both must be consulted.

## When this skill applies

Invoke whenever you are:
- Writing or modifying a React component (web or mobile)
- Adding or changing CSS / Tailwind classes
- Adding or changing an animation or transition
- Creating a new token or referencing an existing one
- Reviewing any of the above for correctness

## Core rules (enforced without exception)

### Tokens
- Import from `@hominem/ui/tokens`. Read `packages/ui/src/tokens/index.ts` first.
- Never hardcode a color, font size, spacing value, radius, shadow, or duration.
- If a needed token doesn't exist, add it to the correct file in `packages/ui/src/tokens/` before using it.
- Platform divergence (web vs. native) is handled inside the token files — always use the platform-correct key.

### Animation
- **All interactive animations on web use GSAP via `@hominem/ui/lib/gsap`.**
- Read `packages/ui/src/lib/gsap/sequences.ts` before writing any animation code.
- Never reimplement a canonical sequence locally. Import it.
- CSS `void-anim-*` classes from `packages/ui/src/styles/animations.css` are for Radix UI component states only.
- Never add a new CSS `@keyframes` for a product surface.
- Every GSAP call must respect `reducedMotion()` — the sequences handle this automatically when used correctly.
- Never animate `width`, `height`, `top`, `left`, `right`, or `bottom`. Use `transform` only.
- Never animate `box-shadow`. Use a pseudo-element opacity trick if shadow must change.
- On mobile, use `react-native-reanimated` worklets. Never use `Animated` from React Native core.

### Typography
- Use only the composed Tailwind utilities: `.display-1`, `.heading-1`–`.heading-4`, `.body-1`–`.body-4`, `.subheading-1`–`.subheading-4`.
- Never mix raw Tailwind size/weight classes (e.g. `text-sm font-medium`) for text styling.
- Minimum font size on mobile inputs: 16px — prevents iOS auto-zoom.
- Never set `font-weight` above 700.

### Color
- All color references go through CSS custom properties. Never use Tailwind's `gray-*`, `blue-*` etc. palette directly.
- Text dimming: use the correct text tier token (`text-secondary`, `text-tertiary`) — never `opacity`.
- Accent is `#007AFF` (Apple system blue). Destructive is `#FF3B30`. Never use accent for destructive actions.

### Spacing
- 8px primary grid. 4px secondary grid (internal component fine-tuning only).
- Never use values outside `spacing[1]`–`spacing[8]` (4px–64px), except `1px` for hairlines.

### Components
Before implementing any Button, Input, Card, Sheet, or Badge, read the component
specifications in `docs/design-system.md`. Every variant, state, and property is defined.
Do not invent new variants — extend the spec first if a new variant is genuinely needed.

### Interaction states
Every interactive element must implement: hover, focus-visible, active/pressed, disabled.
Loading and error states where applicable. Missing states are bugs, not omissions.

- **Hover**: CSS `transition` 120ms only (exception to GSAP rule).
- **Focus-visible**: `outline: 2px solid #007AFF; outline-offset: 2px`. Never `outline: none` without a replacement.
- **Active/pressed**: GSAP `scale(0.97)` on `pointerdown`, reversed on `pointerup`.
- **Disabled**: `opacity: 0.4`, `cursor: not-allowed`, `pointer-events: none`. Never change color.

### Touch targets
Minimum 44px × 44px on all interactive elements (Apple HIG + WCAG 2.5.5).
Use invisible padding or `hitSlop` (mobile) to meet this without visual change.

### Performance
- Lists > 50 items: virtualise (`react-window` web, `FlashList` mobile).
- `React.memo` on all feed/stream row components.
- Lazy-load routes with `React.lazy` + `Suspense`.
- Never import icon sets wholesale — named imports only from `lucide-react` (web) or `@expo/vector-icons/Feather` (mobile).
- Never import `lodash`.
- Target 60fps for all animations. If it can't hold 60fps on a mid-range device, remove it.

## Reference files — read before acting

| Purpose | File |
|---|---|
| Full spec + rules | `docs/design-system.md` |
| Token barrel export | `packages/ui/src/tokens/index.ts` |
| Colors | `packages/ui/src/tokens/colors.ts` |
| Spacing | `packages/ui/src/tokens/spacing.ts` |
| Typography | `packages/ui/src/tokens/typography.ts` |
| Radii | `packages/ui/src/tokens/radii.ts` |
| Shadows | `packages/ui/src/tokens/shadows.ts` |
| Motion constants | `packages/ui/src/tokens/motion.ts` |
| Notes tokens | `packages/ui/src/tokens/notes.ts` |
| Chat tokens | `packages/ui/src/tokens/chat.ts` |
| GSAP sequences | `packages/ui/src/lib/gsap/sequences.ts` |
| Global CSS | `packages/ui/src/styles/globals.css` |
| CSS animations (Radix) | `packages/ui/src/styles/animations.css` |

## Review checklist

When reviewing UI code, verify all of the following. Fail the review if any are violated.

- [ ] No hardcoded colors, sizes, radii, durations, or font values
- [ ] All animations use GSAP sequences from `@hominem/ui/lib/gsap` (or Radix CSS for Radix states)
- [ ] `reducedMotion()` is respected — no sequences bypass it
- [ ] No animation of layout-triggering properties (`width`, `height`, `top`, `left`)
- [ ] Typography uses composed utilities only
- [ ] Every interactive element has all required states (hover, focus-visible, active, disabled)
- [ ] Touch targets ≥ 44px × 44px
- [ ] Lists > 50 items are virtualised
- [ ] `React.memo` on feed/stream row components
- [ ] Platform-correct token keys used (web vs. native)
- [ ] No new variants created without updating `docs/design-system.md` first
