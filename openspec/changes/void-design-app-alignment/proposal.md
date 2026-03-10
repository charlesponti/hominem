## Why

The app layer still contains motion, depth, and decorative patterns that conflict with the established VOID visual system. The repo needs this work represented as an OpenSpec change instead of a standalone plan document.

## What Changes

- Remove app-layer motion, transitions, and transform-driven hover effects that violate VOID interaction rules.
- Eliminate rounded corners, shadows, blur, and decorative visual treatments from the apps layer.
- Standardize app typography and icon usage to the approved VOID presentation style.
- Capture the work as an OpenSpec change so future implementation and verification happen in one workflow.

## Capabilities

### New Capabilities

- `void-app-design-alignment`: Enforces VOID design-system behavior across app surfaces and interaction patterns.

### Modified Capabilities

None.

## Impact

- Affected code: app routes, shared app-level UI usage, styling, and any related verification docs.
- Affected systems: app UX consistency, design-system enforcement, and planning workflow hygiene.
