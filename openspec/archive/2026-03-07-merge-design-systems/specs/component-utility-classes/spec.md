## ADDED Requirements

### Requirement: Button utility classes
The system SHALL provide standardized button styles via composable utility classes, enabling consistent button UI across products.

#### Scenario: Developer creates primary button
- **WHEN** using `.btn-primary`
- **THEN** button has correct background, text color, padding, rounded corners, and hover state

#### Scenario: Developer creates secondary button
- **WHEN** using `.btn-secondary`
- **THEN** button has subtle background and proper contrast

#### Scenario: Developer creates destructive button
- **WHEN** using `.btn-destructive`
- **THEN** button uses red accent with white text

#### Scenario: Button hover state is smooth
- **WHEN** hovering over button
- **THEN** background opacity increases smoothly over ~150ms

#### Scenario: Button active/focus state is clear
- **WHEN** clicking or focusing button
- **THEN** opacity increases further, focus ring appears via outline

### Requirement: Card and surface utility classes
The system SHALL provide card and surface patterns using opacity-based elevation.

#### Scenario: Developer creates basic card
- **WHEN** using `.card` or `.surface`
- **THEN** element has correct background color, border, padding, and shadow

#### Scenario: Developer creates elevated card
- **WHEN** using `.card-elevated`
- **THEN** card appears lifted via higher opacity and shadow

#### Scenario: Card border is subtle
- **WHEN** rendering card
- **THEN** border uses `rgba(255,255,255,0.08)` for gentle separation

#### Scenario: Card padding is consistent
- **WHEN** styling card content
- **THEN** default padding is 16px (`.p-4` or `.space-4`)

### Requirement: Input field utility classes
The system SHALL provide form input styling with proper focus states and dark-mode optimization.

#### Scenario: Developer styles text input
- **WHEN** using `.input` or `.input-base`
- **THEN** input has dark background, light text, readable placeholder, and visible focus ring

#### Scenario: Input focus state is visible
- **WHEN** focusing input
- **THEN** focus ring appears and background opacity changes

#### Scenario: Input error state is clear
- **WHEN** input has validation error
- **THEN** border turns red and error message visible

#### Scenario: Input placeholder is readable
- **WHEN** input is empty
- **THEN** placeholder text is visible but dimmed

### Requirement: Text utility classes for semantic emphasis
The system SHALL provide text utilities that align with semantic color tokens.

#### Scenario: Developer applies primary text
- **WHEN** using `.text-primary`
- **THEN** text renders in `color-text-primary` (#E7EAEE)

#### Scenario: Developer applies secondary text
- **WHEN** using `.text-secondary`
- **THEN** text renders in `color-text-secondary` (#B3BAC2)

#### Scenario: Developer applies disabled text
- **WHEN** using `.text-disabled`
- **THEN** text renders in `color-text-disabled` (#545B62)

#### Scenario: Status text utilities available
- **WHEN** styling status messages
- **THEN** utilities: `.text-success`, `.text-warning`, `.text-destructive` apply semantic colors

### Requirement: Badge and label utilities
The system SHALL provide utilities for badges, labels, and small UI indicators.

#### Scenario: Developer creates info badge
- **WHEN** using `.badge` or `.label`
- **THEN** badge has appropriate background, text color, small font, and rounded corners

#### Scenario: Badge uses accent color
- **WHEN** badge is highlighted
- **THEN** it uses product accent color for focus

#### Scenario: Badge has proper padding
- **WHEN** rendering badge
- **THEN** padding is small (4px vertical, 8px horizontal)

### Requirement: Grid and layout utilities
The system SHALL provide spacing and grid utilities aligned to 8px grid system.

#### Scenario: Developer uses gap utilities
- **WHEN** using `.gap-4`, `.gap-8`, `.gap-12`
- **THEN** gaps are 16px, 32px, 48px respectively (8px grid)

#### Scenario: Developer uses padding utilities
- **WHEN** using `.p-4`, `.px-6`, `.py-8`
- **THEN** padding values follow 8px grid

#### Scenario: Developer uses margin utilities
- **WHEN** using `.m-4`, `.my-6`, `.mx-auto`
- **THEN** margins follow 8px grid (4 = 16px, 6 = 24px, etc.)

### Requirement: Hover and focus state utilities
The system SHALL provide standardized interaction states that work across component types.

#### Scenario: Hover state increases opacity
- **WHEN** hovering interactive element
- **THEN** background opacity increases (e.g., 0.04 → 0.08)

#### Scenario: Focus ring appears on keyboard focus
- **WHEN** focusing element via keyboard
- **THEN** 2px focus ring appears with `--color-ring` (#FFFFFF on dark)

#### Scenario: Active state is pronounced
- **WHEN** element is active/pressed
- **THEN** opacity increases to highest level (0.15+)

#### Scenario: Disabled state is clear
- **WHEN** element is disabled
- **THEN** opacity reduces and cursor shows disabled

### Requirement: Transition utilities for smooth interactions
The system SHALL provide utilities that enable smooth state transitions without excessive animation.

#### Scenario: Developer applies smooth color transition
- **WHEN** using `.transition-colors`
- **THEN** color changes over ~150ms with cubic-bezier(0.4, 0, 0.2, 1)

#### Scenario: Developer applies smooth opacity transition
- **WHEN** using `.transition-opacity`
- **THEN** opacity changes smoothly

#### Scenario: Developer respects reduced motion
- **WHEN** user prefers-reduced-motion
- **THEN** transitions are removed (transition: none)

#### Scenario: All transitions use same timing curve
- **WHEN** viewing any UI interaction
- **THEN** timing curve is consistent across product: `cubic-bezier(0.4, 0, 0.2, 1)` or similar

### Requirement: Modal and overlay utilities
The system SHALL provide utilities for modal dialogs and overlay backgrounds.

#### Scenario: Developer creates modal backdrop
- **WHEN** using `.modal-backdrop`
- **THEN** backdrop is dark semi-transparent overlay with high z-index

#### Scenario: Developer styles modal content
- **WHEN** using `.modal` or `.modal-content`
- **THEN** modal has elevated background, proper padding, rounded corners, and shadow

#### Scenario: Modal appears above all content
- **WHEN** modal is visible
- **THEN** z-index is high enough to appear above everything

### Requirement: Link and anchor utilities
The system SHALL provide consistent link styling.

#### Scenario: Developer applies link style
- **WHEN** using `.link` or styling `<a>` tags
- **THEN** link is visible (accent color or underline), has hover state

#### Scenario: Link hover state is clear
- **WHEN** hovering link
- **THEN** color intensifies or underline appears

#### Scenario: Visited link state optional
- **WHEN** link is visited
- **THEN** optional visited styling applies (can be disabled)
