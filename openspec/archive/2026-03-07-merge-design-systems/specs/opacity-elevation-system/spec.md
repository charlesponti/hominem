## ADDED Requirements

### Requirement: White opacity overlays for elevation
The system SHALL use white overlays with varying opacity to create visual elevation and emphasis, replacing sharp color transitions.

#### Scenario: Elevated surface appears lifted
- **WHEN** rendering a card on top of background
- **THEN** it uses `rgba(255,255,255,0.04)` overlay, appearing subtly elevated without new background color

#### Scenario: Hover state appears interactive
- **WHEN** hovering over an interactive element
- **THEN** opacity increases to `rgba(255,255,255,0.08)`, signaling interactivity

#### Scenario: Active state becomes prominent
- **WHEN** clicking or focusing an element
- **THEN** opacity jumps to `rgba(255,255,255,0.15)`, clearly indicating active state

#### Scenario: Text emphasis uses opacity scale
- **WHEN** needing to deemphasize text
- **THEN** foreground opacity reduces: primary (1.0), secondary (0.7), tertiary (0.5), disabled (0.4)

### Requirement: Opacity layers create elevation hierarchy without color complexity
The system SHALL allow developers to build complete UIs with subtle depth using only white opacity, maintaining cohesion.

#### Scenario: Modal sits above all other UI
- **WHEN** modal is visible
- **THEN** it layers background (0.04) + surface (0.08) + elevated (0.15) = clear hierarchy without new colors

#### Scenario: Nested components maintain visual hierarchy
- **WHEN** building nested card structures
- **THEN** each level uses next-higher opacity, creating readable depth without palette expansion

#### Scenario: Borders use same opacity scale
- **WHEN** adding borders to separated regions
- **THEN** border opacity `rgba(255,255,255,0.08)` creates visual separation without new colors

#### Scenario: Glass-morphism effect emerges naturally
- **WHEN** layering semi-transparent white on dark background
- **THEN** natural glass effect appears without explicit backdrop-filter (though CSS can enhance it)

### Requirement: Opacity transitions between states
The system SHALL support smooth transitions between opacity levels for interactive feedback.

#### Scenario: Button opacity smoothly increases on hover
- **WHEN** mouse enters button
- **THEN** opacity smoothly transitions from 0.08 to 0.12 over ~150ms

#### Scenario: Active state opacity transitions back to normal
- **WHEN** mouse leaves button
- **THEN** opacity smoothly transitions back to 0.08

#### Scenario: Disabled elements don't transition
- **WHEN** element is disabled
- **THEN** opacity stays at 0.04 (minimum) without animation

### Requirement: Emphasis utility scale for consistent opacity usage
The system SHALL provide standardized emphasis utilities that map to specific opacities, enabling consistent implementation.

#### Scenario: Developer chooses emphasis level
- **WHEN** styling a background
- **THEN** they use utility: `.bg-emphasis-highest` (0.9), `.bg-emphasis-high` (0.7), `.bg-emphasis-medium` (0.5), `.bg-emphasis-low` (0.3), `.bg-emphasis-subtle` (0.15), `.bg-emphasis-minimal` (0.1)

#### Scenario: Opacity utility applies to text as well
- **WHEN** styling text emphasis
- **THEN** opacity utilities work on color as well: `.text-emphasis-high` sets color to white at 0.7 opacity

#### Scenario: System works on all backgrounds
- **WHEN** applying emphasis on any dark background (#0F1113, #14171A, #1A1E22)
- **THEN** white overlays remain visible and readable across all surface colors

### Requirement: No shadow-based elevation for dark mode
The system SHALL NOT use shadows as primary elevation indicator (previous design pattern), instead relying entirely on opacity changes.

#### Scenario: Cards don't rely on drop shadow alone
- **WHEN** rendering a card
- **THEN** elevation comes from background color/opacity, not just shadow (though shadow can enhance)

#### Scenario: Modals elevated via opacity and z-index
- **WHEN** modal appears
- **THEN** visual lift comes from lighter background (higher opacity) and higher z-index, not shadow-only
