## ADDED Requirements

### Requirement: Semantic color tokens for functional naming
The system SHALL use functional color names (primary, secondary, background, surface, elevated, destructive, success, warning) that map to the unified dark palette, enabling consistent naming across all products.

#### Scenario: Developer uses semantic token for primary action
- **WHEN** styling a primary button or action
- **THEN** they reference `color-primary` (which resolves to #FFFFFF in base, with product accents as overrides)

#### Scenario: Developer uses semantic token for backgrounds
- **WHEN** needing a background color
- **THEN** they use functional names: `color-background` (app background), `color-surface` (cards), `color-elevated` (modals, hover states)

#### Scenario: Developer applies text emphasis levels
- **WHEN** styling text with different priority
- **THEN** they can use semantic levels: `color-text-primary` (main content), `color-text-secondary` (subtext), `color-text-tertiary` (metadata), `color-text-disabled` (inactive)

#### Scenario: Developer indicates success, warning, error states
- **WHEN** showing status indicators
- **THEN** they use semantic tokens: `color-success` (green), `color-warning` (amber), `color-destructive` (red)

#### Scenario: Token maps to both CSS variable and Tailwind utility
- **WHEN** a developer uses a semantic token
- **THEN** they can access it as CSS variable `var(--color-primary)` or as Tailwind utility `.bg-primary`, `.text-primary`, etc.

### Requirement: Per-product accent theming
The system SHALL enable product-specific accent colors through CSS variable scoping without requiring separate CSS files or build processes.

#### Scenario: Void product accent overrides system default
- **WHEN** Void app initializes with data-product="void"
- **THEN** `--color-accent` resolves to #7BD3F7 instead of system default

#### Scenario: Multiple products coexist in same DOM
- **WHEN** multiple product iframes or scoped components render
- **THEN** each respects its product-specific accent without cross-contamination

#### Scenario: Fallback accent applies when product not specified
- **WHEN** no data-product attribute is present
- **THEN** system default accent applies gracefully

### Requirement: Opacity emphasis scale for subtle differentiation
The system SHALL provide standardized opacity levels for creating visual emphasis without color changes, enabling consistent opacity-based elevation.

#### Scenario: Developer applies subtle background emphasis
- **WHEN** hovering over an element
- **THEN** they can apply `rgba(255,255,255,0.05)` via `bg-emphasis-minimal` or similar

#### Scenario: Developer creates emphasis hierarchy
- **WHEN** building an interactive component
- **THEN** they have 8 opacity levels: `color-emphasis-highest` (0.9), `high` (0.7), `medium` (0.5), `low` (0.3), `lower` (0.2), `subtle` (0.15), `minimal` (0.1), `faint` (0.05)

#### Scenario: Emphasis scale creates readable text on dark background
- **WHEN** applying emphasis to create contrast
- **THEN** even lowest opacity levels maintain readability on #0F1113 backgrounds

### Requirement: Token documentation and migration guide
The system SHALL provide clear documentation mapping old VOID tokens to new semantic tokens, enabling smooth developer migration.

#### Scenario: Developer migrates from VOID to new system
- **WHEN** referencing old VOID token documentation
- **THEN** they find mapping guide: `color-void-background` → `color-background`, `color-void-surface` → `color-surface`, etc.

#### Scenario: Developer searches for equivalent of removed token
- **WHEN** a VOID token is removed entirely
- **THEN** documentation explains why and provides recommended replacement pattern
