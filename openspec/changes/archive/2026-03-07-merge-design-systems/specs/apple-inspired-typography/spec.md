## ADDED Requirements

### Requirement: Inter font as primary UI typography
The system SHALL use Inter as the primary font for all UI elements, optimized for readability and modern aesthetics.

#### Scenario: Headings render in Inter
- **WHEN** any heading renders
- **THEN** it uses Inter font with weight 400-700 depending on size

#### Scenario: Body text uses Inter
- **WHEN** reading paragraph or body text
- **THEN** it renders in Inter with optimal line spacing and letter tracking

#### Scenario: System font fallback provides SF Pro on Apple
- **WHEN** viewing on macOS or iOS
- **THEN** system font stack includes SF Pro for native feel: `Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

#### Scenario: Sans-serif fallback on non-Apple systems
- **WHEN** on Windows or Linux without Inter
- **THEN** Segoe UI or system sans-serif provides acceptable fallback

### Requirement: JetBrains Mono for code and technical content
The system SHALL use JetBrains Mono for code blocks, terminal output, and technical UI elements.

#### Scenario: Code block renders in monospace
- **WHEN** displaying a code block or inline code
- **THEN** it uses JetBrains Mono: `JetBrains Mono, 'SF Mono', monospace`

#### Scenario: Technical metadata uses monospace
- **WHEN** showing technical information (IDs, hashes, data)
- **THEN** monospace font applies for distinction and clarity

### Requirement: Dynamic typography scale based on viewport
The system SHALL provide responsive font sizes that scale smoothly with viewport width using clamp(), ensuring legibility across devices.

#### Scenario: Display text scales for large screens
- **WHEN** viewport is 1920px
- **THEN** `display-1` renders at maximum comfortable size (clamp(2.5rem, 5vw, 6rem))

#### Scenario: Display text scales for mobile
- **WHEN** viewport is 375px (mobile)
- **THEN** `display-1` renders at minimum comfortable size (2.5rem, readable without overflow)

#### Scenario: Heading scales proportionally
- **WHEN** building responsive layouts
- **THEN** heading scales (h1-h6) use clamp() with vw units: `clamp(2.25rem, 3vw, 3rem)` for h1, smaller for h2-h6

#### Scenario: Body text maintains readability at all sizes
- **WHEN** reading body content
- **THEN** body scale uses reasonable clamp: `clamp(0.875rem, 1vw, 1rem)` minimum 14px, maximum 16px

### Requirement: Apple HIG typography standards
The system SHALL follow Apple Human Interface Guidelines spacing and weight standards for optimal readability.

#### Scenario: Large titles have proper line height
- **WHEN** using Large Title (34px)
- **THEN** line height is 41px, weight is Bold (700)

#### Scenario: Body text has proper spacing
- **WHEN** using Body text (17px)
- **THEN** line height is 22px, weight is Regular (400), letter spacing is -0.41px

#### Scenario: Headline has semibold weight
- **WHEN** using Headline (17px)
- **THEN** weight is Semibold (600), letter spacing is -0.41px

#### Scenario: Small text gets increased letter spacing for legibility
- **WHEN** using Caption or Footnote (12-13px)
- **THEN** letter spacing increases to 0.0px to prevent ink bleed in dark mode

### Requirement: Utility classes for all typography scales
The system SHALL provide Tailwind utility classes for each typography scale, enabling consistent usage.

#### Scenario: Developer applies display heading
- **WHEN** styling a large heading
- **THEN** they use `.display-1`, `.display-2` or `.heading-1` through `.heading-4`

#### Scenario: Developer applies body styles
- **WHEN** styling paragraph text
- **THEN** they use `.body-1`, `.body-2`, `.body-3`, or `.body-4`

#### Scenario: Developer applies subheading styles
- **WHEN** styling section subheadings
- **THEN** they use `.subheading-1` through `.subheading-4`

### Requirement: No more monospace-only mandate
The system SHALL allow any appropriate font for any purpose, removing VOID's restriction that all text be monospace.

#### Scenario: Monospace optional, not mandatory
- **WHEN** a developer chooses font for UI element
- **THEN** they can use Inter or monospace depending on context

#### Scenario: Navigation uses proportional font
- **WHEN** rendering navigation
- **THEN** Inter is preferred for scannability (can use monospace if product aesthetic requires)
