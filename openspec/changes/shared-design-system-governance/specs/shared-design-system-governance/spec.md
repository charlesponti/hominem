## ADDED Requirements

### Requirement: Shared UI ownership SHALL live in packages/ui
Hominem SHALL use `packages/ui` as the canonical source of truth for design tokens, shared primitives, shared composites, and approved interaction variants across mobile, web, and desktop.

#### Scenario: Repeated cross-surface pattern exists
- **WHEN** a visual pattern appears across more than one surface or platform
- **THEN** that pattern is defined in `packages/ui`
- **AND** app-layer code composes it rather than re-implementing it locally

### Requirement: Product UI SHALL use tokenized visual rules only
All product UI SHALL use approved design tokens for color, typography, spacing, radius, borders, depth, motion, and icon sizing.

#### Scenario: Engineer styles a shared or app-layer component
- **WHEN** an engineer implements or updates product UI
- **THEN** the component uses approved tokens
- **AND** the implementation does not introduce raw hex values, arbitrary font sizes, or ad hoc spacing and radius values

### Requirement: Shared composites SHALL be preferred for repeated product patterns
Hominem SHALL provide both primitives and composites, but repeated product patterns SHALL default to approved shared composites.

#### Scenario: Common product pattern is needed
- **WHEN** a screen needs a top bar, feed row, settings row, context rail, empty state, or composer dock
- **THEN** the screen uses the approved shared composite
- **AND** app-layer code does not recreate that pattern with local styling

#### Scenario: Primitive composition repeats
- **WHEN** the same primitive composition appears repeatedly across surfaces or features
- **THEN** that composition is promoted into a shared composite in `packages/ui`

### Requirement: Platform divergence SHALL be explicit and narrow
Mobile, web, and desktop SHALL share the same visual hierarchy and interaction intent by default, with platform-specific exceptions limited to documented host constraints.

#### Scenario: Platform-specific adjustment is required
- **WHEN** a platform requires a safe-area, gesture, keyboard, pointer, routing, or accessibility adjustment
- **THEN** the exception is documented
- **AND** the component preserves the same underlying visual and semantic contract

#### Scenario: Local platform restyling is proposed
- **WHEN** a platform implementation attempts to change a shared component’s hierarchy, spacing, radius, icon semantics, or interaction states without a documented exception
- **THEN** the change is treated as design drift and is not accepted

### Requirement: Duplicated app-layer UI SHALL be migration debt
Repeated app-layer components that overlap with shared UI responsibilities SHALL be treated as explicit migration debt and replaced over time by `packages/ui` equivalents.

#### Scenario: Existing duplicated UI is discovered
- **WHEN** repeated local UI exists in mobile, web, or desktop applications
- **THEN** the duplicated UI is queued for migration into `packages/ui`
- **AND** it is not used as the template for new work

### Requirement: UI review SHALL enforce design-system compliance
Hominem SHALL review UI changes against design-system compliance rules before accepting them.

#### Scenario: UI pull request is reviewed
- **WHEN** a pull request changes product UI
- **THEN** review verifies token usage, shared component usage, platform parity, and absence of repeated local patterns

#### Scenario: Non-compliant UI is proposed
- **WHEN** a pull request introduces raw visual values, recreates an existing shared pattern locally, or adds undocumented platform divergence
- **THEN** the pull request is rejected until it conforms to the design system
