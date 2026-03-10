## Why

The notes application currently relies on `react-router` for routing, which is heavier and more configuration-driven than modern alternatives. Migrating to `@tanstack/start` offers faster startup, built-in routing conventions, and better integration with our existing tooling, leading to simpler code and improved DX.

## What Changes

- Replace `react-router` routing with `@tanstack/start` conventions in the notes app
- Update navigation components and route definitions accordingly
- Remove React Router dependencies and related boilerplate
- Adjust any test utilities or e2e flows that depend on `react-router`

## Capabilities

### New Capabilities
- `tanstack-start-routing`: Defines how the notes app uses `@tanstack/start` for route configuration and navigation.

### Modified Capabilities
- `notes-app-routing`: Existing routing behavior will be redefined under the new framework; requirements may shift to align with `@tanstack/start` conventions.

## Impact

- Code in `apps/notes` (routes, layouts, navigation components)
- Dependencies (remove `react-router`, add `@tanstack/start` packages)
- Tests in `apps/notes/tests` and any shared route helpers
- Build and CI configuration for notes app
