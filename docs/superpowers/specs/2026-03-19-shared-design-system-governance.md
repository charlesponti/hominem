# Shared Design System Governance

## Summary

This document defines the canonical cross-surface design system for Hominem across mobile, web, and desktop. The system should feel like Airbnb plus Claude warm utility: calm, hospitable, dense, trustworthy, and highly usable. `packages/ui` is the source of truth for tokens, primitives, composites, and interaction rules. App-layer code composes approved shared components instead of inventing local patterns.

## Visual direction

- Warm utility over sterile minimalism
- Soft geometry over playful roundness
- Editorial, conversational hierarchy over mechanical enterprise density
- Calm motion over decorative animation
- Monochrome-first with disciplined accent usage

## System architecture

### Canonical ownership

- `packages/ui` is the canonical design-system package
- Shared tokens, primitives, and composites belong in `packages/ui`
- App code owns content, flows, and layout composition, not visual system reinvention

### Component strategy

- Provide both primitives and composites
- Prefer composites for common product patterns
- Use primitives only when the pattern is genuinely new or exceptional
- Promote repeated primitive compositions into shared composites

### Shared-first rule

- If a pattern appears across surfaces, it belongs in `packages/ui`
- If a component exists in `packages/ui`, apps must use it
- If a needed component does not exist yet, add it to `packages/ui` instead of recreating it locally in apps

## Token laws

### Colors

- Only use canonical design tokens from `packages/ui`
- No raw hex, rgba, or ad hoc opacity values in app code
- Default system language is light-only
- Accent is reserved for primary actions, focus, and critical highlights
- Most UI should remain monochrome or near-monochrome

### Typography

- All text must use approved tokenized text styles
- No arbitrary local font sizes for product UI
- Body text stays readable and human, not compressed for density
- Metadata may be smaller, but never brittle
- Hierarchy should be established by size and weight before color
- All-caps labels are not the default system language

### Spacing

- Use the spacing token scale only
- Layout wrappers should not apply decorative padding by default
- Content containers own their spacing
- Prefer fewer, clearer spacing decisions over stacked padding
- Tighten vertically before sacrificing horizontal readability

### Radius

- Radius must come from a small approved scale
- Full-pill radius is reserved for chips, icon buttons, and segmented controls
- Dense rows use small radius
- Cards and grouped surfaces use medium radius
- Composer docks and sheets use large radius
- Arbitrary radius values are not allowed

### Borders and depth

- Borders are subtle by default
- Use borders to group or separate, not decorate
- Shadows and depth are rare and intentional
- If hierarchy can be expressed with spacing and typography alone, prefer that over stronger elevation

### Motion

- Motion tokens are required
- No hardcoded durations or easing values
- Motion clarifies transitions rather than decorating them
- Every animated pattern must have a reduced-motion path
- Shared motion intent must match across mobile, web, and desktop

### Icon sizing

- Icons use approved size tokens only
- Icon buttons use approved size variants only
- Icons must be optically centered
- Icons communicate function or type, never filler

## Component anatomy laws

### TopBar

- Top bars are shared composites, not screen-local inventions
- Height is compact and stable
- Left slot is for brand, title, or contextual back affordance
- Right slot is for navigation or actions only
- Do not stack multiple competing navigation systems
- Context switching must be part of the approved top bar system

### ContextRail

- Context switching is an approved shared composite
- Dense mobile use should prefer icon-first variants
- Active state must be obvious but calm
- Inactive state must remain legible and tappable
- Contextual destinations like `Note` and `Chat` only appear when relevant
- The rail must not overpower content

### IconButton

- Icon buttons are shared primitives or composites with exact variants
- Use approved sizes only
- Use approved shapes only
- Touch targets remain accessible even when visually compact
- Active, inactive, pressed, and disabled states are standardized
- Icon-only controls must always have semantic labels

### FeedRow

- Feed rows are the default inbox and archive list pattern
- Rows should be compact, vertically scannable, and content-first
- Metadata is quiet and secondary
- One subtle type cue is enough
- Timestamps are visually recessive and consistently positioned
- Rows should feel like a stream, not miniature marketing cards
- Use cards only when grouping meaningfully distinct content

### Card

- Cards are reserved for grouped content, not every repeated item
- Cards use medium radius and restrained padding
- Nested cards are discouraged
- Prefer a row over a card for timeline content
- Cards should feel warm and utility-focused, not ornamental

### SettingsRow

- Settings patterns must be shared composites
- Rows should clearly communicate action, destination, or state
- Icon, label, helper text, and trailing affordance follow a fixed structure
- Settings screens should feel calmer and more structured than inbox feeds

### ComposerDock

- The composer is a first-class shared composite
- It is the highest-importance input surface in the product
- It may feel more substantial than feed rows, but must still obey token laws
- Controls, spacing, and corner treatment come from system variants
- No one-off local composer redesigns are allowed

### EmptyState

- Empty states are shared composites
- Tone is calm, useful, and warm
- Empty states should not dominate the screen
- Use one heading, one supporting line, and optional action
- No decorative illustration unless explicitly part of the system

### SectionHeader

- Section headers are shared composites
- Use them sparingly
- They provide rhythm and grouping, not decoration
- If a section header can be removed without losing comprehension, remove it

## Platform exception policy

### Shared by default

- Mobile, web, and desktop use the same tokens, component anatomy, hierarchy, and interaction intent by default
- Platform-specific divergence is an exception, not a parallel system

### Allowed exceptions

- Safe area handling
- Native keyboard behavior
- Gesture systems
- Routing and navigation primitives
- Accessibility API differences
- Animation implementation details required by platform runtime
- Pointer versus touch affordance adjustments
- Desktop viewport and window-management constraints

### Disallowed exceptions

- Different visual hierarchy for the same pattern
- Different spacing, radius, or type rules for the same component family
- Different row or card anatomy without explicit design-system approval
- Different active, inactive, or pressed states invented locally
- Different icon semantics for the same action
- Replacing shared composites with local platform-specific lookalikes

### Exception documentation rule

- Every approved platform exception must be documented
- Documentation must state why the exception exists, which platform it applies to, and what remains invariant
- Undocumented divergence is design drift

## Migration policy

### Strict migration mandate

- Duplicated app-layer components are migration debt
- If a repeated pattern exists outside `packages/ui`, it must be queued for migration
- New app-specific copies of shared patterns are not allowed

### Shared-first implementation rule

- When building or revising UI, check `packages/ui` first
- If the component exists, use it
- If it almost exists, extend it there
- If it does not exist, add the shared version before introducing the pattern across apps

### Promotion rule

- Once a primitive composition repeats across surfaces or feature areas, it must be promoted into a composite in `packages/ui`
- Repeated local primitive compositions indicate an incomplete design system

### Legacy rule

- Legacy components may temporarily remain during migration
- They should be treated as deprecated
- They must not become the template for new work

## Enforcement policy

### Review rule

- UI PRs must be reviewed against the design-system checklist
- Review asks:
  - is this using tokens only
  - is this using an approved shared component
  - if not, why not
  - is this creating a repeated local pattern that belongs in `packages/ui`

### Rejection criteria

- PRs should be blocked when they:
  - introduce repeated local UI patterns
  - use raw visual values outside tokens
  - recreate an existing composite locally
  - introduce undocumented platform divergence
  - add decorative motion or styling outside system rules

### Component ownership rule

- Shared component behavior belongs to the design system, not individual app features
- App teams may propose extensions, but those extensions must be encoded back into `packages/ui`

### Escape hatch rule

- Primitives are an escape hatch, not the default path
- Exceptional primitive compositions must not silently become recurring product patterns
- If the same exceptional pattern appears again, formalize it in `packages/ui`

### Audit rule

- Core surfaces should be periodically audited for drift:
  - navigation
  - lists and feeds
  - cards and surfaces
  - icon buttons
  - composer and input systems
  - empty states
- Audit findings should create explicit migration work

### Deprecation rule

- When a shared component replaces a legacy one, the legacy component should be marked deprecated and scheduled for removal
- Deprecation should be visible in code ownership and planning

## Initial shared component inventory

### Primitives

- `Text`
- `Icon`
- `IconButton`
- `Divider`
- `Surface`
- `Stack`
- `Inline`
- `InputField`

### Composites

- `TopBar`
- `ContextRail`
- `FeedRow`
- `SettingsRow`
- `ComposerDock`
- `EmptyState`
- `ArchiveRow`
- `SectionHeader`

## Adoption intent

This system is not optional guidance. It is the intended design contract for new UI work across mobile, web, and desktop, and the migration target for legacy shared patterns that currently live outside `packages/ui`.
