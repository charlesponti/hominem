# Shared Design System Governance

## Why

The product currently allows too much app-layer variation across mobile, web, and desktop. Repeated local components, inconsistent spacing and radius choices, and platform-specific restyling make the product feel less cohesive than it should. We need a strict shared design system with hard rules, shared component ownership in `packages/ui`, and a migration path away from duplicated app-layer UI.

## What Changes

- Define a canonical cross-surface design-system governance model for Hominem
- Establish `packages/ui` as the source of truth for tokens, primitives, composites, and visual interaction rules
- Require shared components for repeated patterns across mobile, web, and desktop
- Add explicit laws for typography, spacing, radius, borders, motion, icon buttons, list rows, cards, top bars, and composer surfaces
- Define platform exception rules, migration rules, and PR enforcement criteria

## Impact

- Creates one approved design language across mobile, web, and desktop
- Reduces design drift and duplicate UI implementations
- Makes `packages/ui` the required path for shared visual patterns
- Turns existing duplicated app-layer UI into explicit migration debt instead of allowing it to linger indefinitely
