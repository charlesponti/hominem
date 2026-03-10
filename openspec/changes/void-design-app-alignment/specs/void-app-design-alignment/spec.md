## ADDED Requirements

### Requirement: App surfaces SHALL follow VOID interaction rules
The apps layer SHALL avoid motion-based presentation patterns that conflict with the VOID design system.

#### Scenario: App page removes motion
- **WHEN** a user views or interacts with a supported app surface
- **THEN** the surface does not depend on animations, delayed transitions, or transform-based hover effects to communicate state

### Requirement: App surfaces SHALL avoid non-VOID visual depth
The apps layer SHALL avoid decorative visual depth treatments that conflict with the VOID design system.

#### Scenario: App page uses flat visual treatment
- **WHEN** a user views a supported app surface
- **THEN** the surface avoids rounded corners, shadows, and blur-based depth effects unless explicitly required by the canonical design rules

### Requirement: App surfaces SHALL use VOID-aligned typography and decoration
The apps layer SHALL use typography and decorative elements consistent with the VOID design system.

#### Scenario: App page uses consistent typography
- **WHEN** a user inspects form labels, headings, or buttons on a supported app surface
- **THEN** those elements follow the approved VOID typography and decoration conventions
