## ADDED Requirements

### Requirement: Complete dark-mode color palette system
The system SHALL provide a comprehensive dark-mode color palette with off-black backgrounds, off-white foreground, and opacity-based elevation layers that create visual hierarchy without introducing excessive colors.

#### Scenario: Developer accesses background colors
- **WHEN** a developer imports or references background tokens
- **THEN** they have access to `color-bg-base` (#0F1113), `color-bg-surface` (#14171A), `color-bg-elevated` (#1A1E22)

#### Scenario: Developer applies text colors
- **WHEN** a developer needs text styling
- **THEN** they can use `color-text-primary` (#E7EAEE), `color-text-secondary` (#B3BAC2), `color-text-tertiary` (#7A828A), `color-text-disabled` (#545B62)

#### Scenario: Developer creates visual separation with borders
- **WHEN** a developer needs borders or dividers
- **THEN** they have three opacity-based border colors: `color-border-default` (rgba(255,255,255,0.08)), `color-border-subtle` (rgba(255,255,255,0.04)), `color-border-focus` (rgba(255,255,255,0.16))

#### Scenario: Entire application renders with consistent dark palette
- **WHEN** the app loads in any browser
- **THEN** all UI elements use the unified palette with no light-mode fallbacks

### Requirement: Shadow and elevation system
The system SHALL define shadow tokens for creating depth and visual hierarchy through subtle, professional shadows.

#### Scenario: Developer applies shadows for elevation
- **WHEN** creating a card or modal component
- **THEN** they can choose from `shadow-low` (0 2px 8px rgba(0,0,0,0.35)), `shadow-medium` (0 8px 24px rgba(0,0,0,0.45)), or `shadow-high` (0 20px 60px rgba(0,0,0,0.55))

#### Scenario: Shadows adapt to dark backgrounds
- **WHEN** rendering shadows on dark surfaces
- **THEN** shadows remain visible and distinct (not lost on dark background)

### Requirement: Product-specific accent colors
The system SHALL allow each Ponti Studios product to have a unique accent color while maintaining system cohesion through a unified token structure.

#### Scenario: Void product uses cool blue accent
- **WHEN** Void app loads
- **THEN** accent colors resolve to #7BD3F7 (cool blue)

#### Scenario: Kuma product uses warm ivory accent
- **WHEN** Kuma app loads
- **THEN** accent colors resolve to #F2E7C9 (warm ivory)

#### Scenario: Accents apply only to highlights and graphs
- **WHEN** developer builds an interactive element
- **THEN** accent color is used sparingly for active states, focus indicators, and data visualizations (not primary UI elements)

### Requirement: Icon and line color tokens
The system SHALL provide dedicated tokens for icon coloring that align with the overall palette aesthetic.

#### Scenario: Developer colors icons
- **WHEN** applying color to an icon
- **THEN** they use `color-icon-primary` (#F5F7FA) for prominent icons and `color-icon-muted` (#AEB5BD) for secondary icons

#### Scenario: Thin lines match icon style
- **WHEN** drawing lines or strokes
- **THEN** they can use the same icon colors for visual consistency
