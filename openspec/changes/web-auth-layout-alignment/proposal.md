## Why

The web apps do not treat auth surfaces consistently. `finance` and `notes` render `/auth/*` inside the authenticated app shell, while `rocco` keeps auth routes outside that shell. That causes misaligned auth screens, duplicated auth-specific behavior in parent layouts, and inconsistent post-login flow handling.

The local `react-doctor` workflow is also broken in this workspace because `npx` conflicts with repo-level package overrides, so the code health tool cannot be run reliably.

## What Changes

- Move web auth entry and verification surfaces onto a shared auth-only route layout across `finance`, `notes`, and `rocco`.
- Reuse shared UI components for auth route layout behavior so all auth screens align consistently.
- Remove auth-specific parent-shell behavior from non-auth layouts where it leaks into public auth pages.
- Add a repo-native `react-doctor` workflow that runs without the current package-manager override failure.

## Capabilities

### New Capabilities

- `web-auth-layout-alignment`: Ensures web auth surfaces use a dedicated shared layout and consistent routing boundaries.

### Modified Capabilities

- `auth-system-cleanup`: Extends local verification workflow to include a working React layout audit path.

## Impact

- Affected code: web app route configs, shared auth UI components, and repo tooling scripts.
- Affected systems: auth UX consistency, route composition, and local React code health checks.
