# UI Primitive System Specification

## Purpose
Eliminate raw platform elements from feature code by providing a shared higher-level component layer in `packages/ui`. Feature code should express product intent; the component layer handles rendering mechanics, accessibility, and cross-platform differences.

## Requirements
### Requirement: Raw platform primitives are banned in feature code
Raw platform primitives (`<input>`, `<button>`, `TextInput`, `Pressable`, and similar elements) SHALL NOT be used in feature code. They are only allowed inside `packages/ui`, for platform/performance edge cases with an explicit justification, or where no suitable abstraction exists.

#### Scenario: Raw web form elements are replaced in feature code
- **WHEN** web or Electron feature code renders form controls or actions
- **THEN** it uses shared primitives such as `TextField`, `TextArea`, `SelectField`, `Button`, `Form`, `Field`, `Heading`, and `Text` instead of raw `<input>`, `<textarea>`, `<select>`, `<button>`, `<form>`, `<label>`, `<h1>`-`<h4>`, `<p>`, or `<span>`

#### Scenario: Raw native controls are replaced in feature code
- **WHEN** React Native feature code renders text input, press targets, typography, or repeated layout wrappers
- **THEN** it uses shared primitives such as `TextField`, `TextArea`, `Button`, `IconButton`, `Text`, `Heading`, `Stack`, `Inline`, `Screen`, and `Page` instead of direct `TextInput`, `Pressable`, `TouchableOpacity`, ad hoc `Text`, or repeated layout wrappers

#### Scenario: Legitimate exceptions are documented
- **WHEN** a feature must use a raw platform primitive because no abstraction exists or platform APIs require it
- **THEN** the code includes an explicit design-system exception note explaining why the primitive is required

### Requirement: Shared UI primitives expose a consistent cross-platform API
The shared primitive layer SHALL provide stable, cross-platform component contracts for common actions, inputs, layout, and typography.

#### Scenario: Shared primitive implementations are platform-specific behind a shared API
- **WHEN** a primitive needs different web and native rendering mechanics
- **THEN** it uses shared prop types with platform-specific implementations such as `*.tsx` and `*.native.tsx`
- **AND** feature code does not branch on `Platform.OS`

#### Scenario: Shared primitives include accessibility and composition defaults
- **WHEN** a primitive is used in feature code
- **THEN** it provides built-in accessibility wiring, token-based variants and sizing, and escape hatches such as `className` or `style` where appropriate

### Requirement: Inputs and form controls use shared primitives
All common text-entry and form-composition patterns SHALL use shared primitives from `packages/ui`.

#### Scenario: Text entry uses shared field primitives
- **WHEN** a feature needs single-line or multiline text entry
- **THEN** it uses `TextField` or `TextArea`

#### Scenario: Label, help text, and error text are wired through a field primitive
- **WHEN** a feature renders a labeled form control with helper or error copy
- **THEN** it uses `Field` so label association and assistive text semantics are applied consistently

#### Scenario: Web forms use a semantic wrapper
- **WHEN** a web feature renders a form submission flow
- **THEN** it uses the shared `Form` wrapper for semantic form structure and consistent spacing

### Requirement: Shared action primitives replace raw buttons and press targets
All standard action triggers SHALL use shared button primitives.

#### Scenario: Standard actions use Button
- **WHEN** a feature renders a primary, secondary, destructive, ghost, or link-style action
- **THEN** it uses the shared `Button` primitive with approved variants and sizes

#### Scenario: Icon-only actions use IconButton semantics
- **WHEN** a feature renders an icon-only action
- **THEN** it uses an icon button abstraction and provides an accessible label

### Requirement: Shared layout primitives replace repeated wrapper patterns
Repeated spacing and alignment wrappers SHALL be expressed through layout primitives instead of ad hoc flex containers.

#### Scenario: Vertical grouping uses Stack
- **WHEN** feature code needs a vertical layout with canonical spacing
- **THEN** it uses `Stack`

#### Scenario: Horizontal grouping uses Inline
- **WHEN** feature code needs horizontal alignment with canonical spacing or wrapping
- **THEN** it uses `Inline`

#### Scenario: Top-level screens use shared shells
- **WHEN** a route or screen needs canonical page padding, safe area, or scroll behavior
- **THEN** it uses `Page`, `Screen`, `Container`, or other approved layout shells instead of custom wrappers

### Requirement: Shared typography primitives replace raw text styling
Feature code SHALL use shared typography primitives for headings and body copy.

#### Scenario: Headings use Heading
- **WHEN** a feature renders heading content
- **THEN** it uses the shared `Heading` primitive mapped to the approved scale

#### Scenario: Body and supporting copy use Text
- **WHEN** a feature renders body, caption, label, or supporting copy
- **THEN** it uses the shared `Text` primitive mapped to the approved scale

### Requirement: Shared primitives are documented and testable
New primitives SHALL include stories, state coverage, and enforcement hooks so future feature work stays aligned.

#### Scenario: Primitives include Storybook coverage
- **WHEN** a new primitive is added to the shared UI layer
- **THEN** Storybook stories cover default usage, variants, and key states such as focus, disabled, error, and loading

#### Scenario: Primitive usage is enforceable in reviews and tooling
- **WHEN** feature code is reviewed or linted
- **THEN** banned raw primitive usage can be detected through review checklists and automated enforcement rules
