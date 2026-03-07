## ADDED Requirements

### Requirement: Complete Tailwind CSS v4 theme with CSS custom properties
The system SHALL define all tokens as CSS custom properties in a Tailwind CSS v4 `@theme` block, enabling both utility class usage and direct CSS variable access.

#### Scenario: Tailwind utilities reference tokens
- **WHEN** developer uses utility class `.bg-bg-base`
- **THEN** it compiles to `background-color: var(--color-bg-base)` which resolves to `#0F1113`

#### Scenario: Components access tokens as CSS variables
- **WHEN** component needs a color
- **THEN** it can use `background-color: var(--color-bg-base)` or border-color: var(--color-border-default)` in CSS

#### Scenario: JavaScript can access tokens at runtime
- **WHEN** component needs to read token value
- **THEN** it can use `getComputedStyle(document.documentElement).getPropertyValue('--color-bg-base')`

#### Scenario: All colors defined in @theme section
- **WHEN** Tailwind processes config
- **THEN** all colors, spacing, sizing tokens are available as `--color-*`, `--spacing-*`, etc.

### Requirement: Export all tokens as Tailwind utilities
The system SHALL generate Tailwind utility classes for every token, enabling developers to compose UIs entirely through utility classes without custom CSS.

#### Scenario: Color utilities available
- **WHEN** developer types `.bg-` in IDE
- **THEN** Tailwind autocomplete shows all color utilities: `.bg-bg-base`, `.bg-bg-surface`, `.bg-text-primary`, etc.

#### Scenario: Typography utilities available
- **WHEN** developer needs heading styles
- **THEN** they use `.heading-1`, `.heading-2`, `.display-1`, etc.

#### Scenario: Spacing utilities follow 8px grid
- **WHEN** developer needs margin/padding
- **THEN** Tailwind utilities: `.p-4`, `.p-8`, `.p-12`, `.p-16`, `.p-24`, `.p-32`, etc.

#### Scenario: Radius utilities available
- **WHEN** creating rounded elements
- **THEN** utilities: `.rounded-sm` (6px), `.rounded-md` (10px), `.rounded-lg` (14px), `.rounded-xl` (20px)

#### Scenario: Shadow utilities available
- **WHEN** adding depth
- **THEN** utilities: `.shadow-low`, `.shadow-medium`, `.shadow-high` apply shadow tokens

### Requirement: Per-product accent theming via CSS variable override
The system SHALL allow product-specific accent colors by overriding `--color-accent` at different scope levels.

#### Scenario: Void product uses scoped accent
- **WHEN** CSS selector `[data-product="void"]` is matched
- **THEN** `--color-accent: #7BD3F7` overrides system default

#### Scenario: Kuma product uses different accent
- **WHEN** CSS selector `[data-product="kuma"]` is matched
- **THEN** `--color-accent: #F2E7C9` applies

#### Scenario: Fallback accent for unscoped content
- **WHEN** no data-product attribute present
- **THEN** `:root` level `--color-accent` provides default

#### Scenario: Utilities respect accent override
- **WHEN** developer uses `.text-accent` on element inside `[data-product="kuma"]`
- **THEN** text renders in warm ivory (#F2E7C9)

### Requirement: All typography tokens as CSS variables
The system SHALL define font-family, font-size, line-height, letter-spacing, and font-weight as tokens.

#### Scenario: Font family tokens available
- **WHEN** defining custom styles
- **THEN** tokens available: `--font-family-primary` (Inter), `--font-family-mono` (JetBrains Mono)

#### Scenario: Font size scale available as tokens
- **WHEN** building custom components
- **THEN** size tokens: `--font-size-xs` (12px), `--font-size-sm` (14px), through `--font-size-display` (28px)

#### Scenario: Line height tokens for each scale
- **WHEN** ensuring proper text spacing
- **THEN** tokens like `--line-height-body` (22px), `--line-height-heading` (34px)

#### Scenario: Letter spacing tokens for dark mode legibility
- **WHEN** using small text
- **THEN** tokens apply dark-mode-optimized tracking: `--letter-spacing-caption` (0.0px), `--letter-spacing-body` (-0.41px)

### Requirement: No VOID token conflicts
The system SHALL completely remove all VOID design tokens, ensuring no accidental fallbacks to old system.

#### Scenario: VOID tokens not present
- **WHEN** searching codebase for `--color-void-*` or `--ma-*` tokens
- **THEN** no results found (completely removed)

#### Scenario: VOID utilities not available
- **WHEN** developer tries to use `.void-invert` or `.ascii-texture`
- **THEN** utilities don't exist (removed from stylesheet)

#### Scenario: VOID philosophy names not in tokens
- **WHEN** looking at CSS variables
- **THEN** no variables named `--kanso-*`, `--ma-*`, `--wabi-*` (removed)

### Requirement: Global styles support smooth interactions
The system SHALL enable transitions and animations globally, removing VOID's `transition: none !important` restriction.

#### Scenario: Transitions work on interactive elements
- **WHEN** hovering/clicking
- **THEN** opacity, color, transform can smoothly transition (no global `transition: none`)

#### Scenario: Prefers reduced motion respected
- **WHEN** user sets system preference `prefers-reduced-motion`
- **THEN** all transitions disabled respectfully

#### Scenario: CSS can define motion
- **WHEN** component needs animation
- **THEN** keyframe animations and transitions are allowed (not blocked by global !important rule)
