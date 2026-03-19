# Design

## Summary

This change establishes the canonical Hominem design system as a strict shared component system with tokenized visual rules. The desired direction is `Airbnb + Claude warm utility`: calm, hospitable, dense, trustworthy, and highly usable.

## Ownership Model

- `packages/ui` owns tokens, primitives, composites, and approved interaction variants
- app code owns content, flow, and screen composition
- app code does not own visual reinvention of repeated product patterns

## Shared Component Strategy

- provide both primitives and composites
- prefer composites for repeated product patterns
- use primitives only when a pattern is genuinely new or exceptional
- promote repeated primitive compositions into composites in `packages/ui`

## Token Laws

### Colors

- use canonical tokens only
- no raw hex, rgba, or ad hoc opacity values in app code
- default surface language is light-only
- accent use is reserved for primary actions, focus, and critical highlights

### Typography

- all product text uses approved tokenized text styles
- no arbitrary local font sizes in product UI
- hierarchy is driven by size and weight before color
- all-caps is not the default design language

### Spacing

- use the spacing scale only
- layout wrappers do not own decorative padding by default
- content containers own their spacing
- prefer a single spacing decision per layer rather than stacked padding

### Radius

- radius comes from a small approved scale only
- full-pill shapes are reserved for chips, icon buttons, and segmented controls
- rows use smaller radius, cards use medium radius, composer docks and sheets use larger radius

### Borders and Depth

- borders are subtle by default
- use borders to separate or group, not decorate
- elevation is rare and intentional

### Motion

- motion tokens are required
- no hardcoded timing or easing values
- motion clarifies transitions rather than decorating them
- all animation patterns require reduced-motion behavior

## Component Anatomy Laws

### TopBar

- top bars are shared composites
- left slot is for brand, title, or contextual back affordance
- right slot is for actions only
- competing navigation systems must not be stacked

### ContextRail

- context switching is a shared composite
- dense mobile variants should be icon-first
- contextual destinations like `Note` and `Chat` appear only when relevant

### IconButton

- icon buttons use approved size and shape variants only
- active, inactive, pressed, and disabled states are standardized
- icon-only controls must always expose semantic labels

### FeedRow

- feed rows are the default inbox and archive list pattern
- rows are compact, content-first, and vertically scannable
- metadata is quiet and timestamps are visually recessive
- cards are reserved for meaningful grouped content

### ComposerDock

- the composer is a first-class shared composite
- it may feel more substantial than rows, but still obeys the same token laws
- no one-off local composer redesigns are allowed

## Platform Exception Policy

- shared by default across mobile, web, and desktop
- exceptions are limited to safe areas, gestures, routing primitives, accessibility APIs, keyboard behavior, and necessary host-specific animation implementation details
- undocumented divergence is design drift

## Migration Policy

- repeated app-layer UI outside `packages/ui` is migration debt
- new repeated local UI patterns are not allowed
- when a shared pattern is needed, add or extend it in `packages/ui` first

## Enforcement

- UI PRs are reviewed against the design-system checklist
- PRs should be blocked when they introduce raw visual values, recreate shared patterns locally, or create undocumented platform divergence
- repeated primitive compositions must be promoted into composites
