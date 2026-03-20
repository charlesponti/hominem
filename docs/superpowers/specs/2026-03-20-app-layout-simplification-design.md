# App Layout Simplification Design

Date: 2026-03-20
Area: `packages/ui/src/components/layout/app-layout.tsx`

## Goal

Collapse `AppLayout` to a single top-header shell with one layout contract so it no longer carries multiple navigation patterns or shell-level presentation modes.

## Problems To Solve

- `AppLayout` currently supports multiple shell branches through `sidebar`, `backgroundImage`, and `contentMode`.
- That makes the component an architectural fork instead of a single shared layout primitive.
- The inline legacy comment is a symptom of the same issue: the component already knows it is doing too much.

## Non-Goals

- No redesign of the top-header layout itself.
- No introduction of a replacement sidebar pattern.
- No broad route restructuring beyond adapting current call sites to the simplified API.

## Recommended Approach

Simplify `AppLayout` to one layout path and one public contract:

- keep `children`
- keep `navigation`
- remove `sidebar`
- remove `backgroundImage`
- remove `contentMode`

If a route needs a special background or full-bleed presentation later, that should be implemented inside route content rather than in the shared app shell.

## Architecture

`AppLayout` should become a straightforward top-header app shell:

- navigation progress indicator
- optional top navigation region
- single content container

There should be no conditional shell branching inside the component.

## Migration Shape

Update every `AppLayout` consumer to match the simplified API.

This should include:

- removing any now-invalid props
- moving any page-specific background or layout treatment into route-level content if still needed
- updating tests to assert the single-shell behavior only

## Testing Strategy

Keep verification focused:

- update the `AppLayout` unit test to match the simplified contract
- run the relevant UI and web tests that import `AppLayout`
- run typecheck so any remaining removed-prop usage fails immediately

## Verification

Before completion:

- run the `AppLayout` test
- run the relevant package and web tests
- run typecheck
- run repo safety checks

## Risks

- hidden consumers of removed props may surface only at typecheck time
- page-specific background or full-bleed assumptions may need to move down into route content

## Implementation Outline

1. Add failing tests for the simplified `AppLayout` contract.
2. Remove `sidebar`, `backgroundImage`, and `contentMode` from the component and its types.
3. Update current consumers and tests.
4. Run typecheck and repo verification to catch any remaining removed-prop usage.
