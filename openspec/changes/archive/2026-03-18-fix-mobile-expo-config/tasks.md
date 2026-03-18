## 1. Expo identity alignment

- [x] 1.1 Confirm the canonical Expo owner, project ID, and slug for the mobile app from the currently working release setup.
- [x] 1.2 Update mobile runtime config and checked-in reference files so they expose the same Expo identity values.

## 2. Expo config resolution

- [x] 2.1 Reproduce the failing Expo config command path and isolate the Bun/npm invocation issue causing `npx expo config` to fail.
- [x] 2.2 Add the smallest config or script change needed so the supported Expo config verification command succeeds from the monorepo root.

## 3. Release verification

- [x] 3.1 Add or update a verification command that checks Expo config resolution and owner/project consistency before release workflows.
- [x] 3.2 Run the relevant mobile verification commands and capture the resulting release-safe command path for OTA and TestFlight workflows.
