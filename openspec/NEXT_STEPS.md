# OpenSpec Next Steps

Created: 2026-03-06

## Current State

Archived completed changes:
- `2025-03-04-update-db-schema-references`
- `2026-02-28-phase-2-api-rebuild`
- `2026-02-27-move-db-services-to-db-package`
- `2026-03-01-unify-auth-provider`

Remaining in-progress changes:
- `harden-auth-email-otp-passkey-e2e` (6/33)
- `fix-mobile-architecture-issues` (69/107)
- `mobile-expo-55-upgrade` (0/23)
- `2026-02-29-2-remove-mock-apple-auth-add-passkey` (31/37)
- `2026-03-03-phased-db-redesign` (0/109)

## Recommended Execution Order

1. `harden-auth-email-otp-passkey-e2e`
2. `fix-mobile-architecture-issues`
3. `mobile-expo-55-upgrade`
4. `2026-02-29-2-remove-mock-apple-auth-add-passkey`
5. `2026-03-03-phased-db-redesign`

## Why This Order

- Complete auth hardening before broader mobile/platform work.
- Finish active mobile architecture cleanup before framework upgrade risk.
- Resolve older auth changes before large DB redesign and app migration.
- Defer largest-scope foundational rewrites until auth/mobile baselines are stable.

## Immediate Actions

1. Repoint `openspec/ACTIVE_CHANGE.md` to the next active item before implementation.
2. Run `openspec list --json` and confirm no additional completed changes need archive.
3. Resume implementation from the first change in the order above.

## Layout Reminder

- Open work lives in `openspec/inbox`
- Completed canonical specs live in `openspec/done/specs`
- Completed delivery records live in `openspec/done/records`
- Raw historical change folders live in `openspec/archive`

Legacy paths under `openspec/changes`, `openspec/specs`, and `openspec/merged` are compatibility shims for the current CLI.
