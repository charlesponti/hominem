## 1. Shared Auth Layout

- [x] 1.1 Add a shared auth route layout component for web auth surfaces
- [x] 1.2 Route all web `/auth/*` pages through the dedicated auth layout boundary

## 2. App Shell Cleanup

- [x] 2.1 Remove auth-specific side effects from parent app layouts when they only belong on authenticated surfaces
- [x] 2.2 Keep authenticated-only UI in authenticated layouts

## 3. Tooling And Verification

- [x] 3.1 Add a repo-native `react-doctor` command that works with workspace overrides
- [x] 3.2 Run targeted auth/layout verification for affected apps
