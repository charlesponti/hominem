## Why

Mobile release workflows currently allow local preview and production env files to coexist with EAS-managed release environments, which has already caused runtime fingerprint drift and OTA incompatibility. We need to enforce a professional release env model so local development remains flexible while preview and production builds and updates stay reproducible across machines and CI.

## What Changes

- Restrict local env file sourcing to `dev` and `e2e` variants only.
- Route preview and production build/update workflows through EAS-managed environments and validate those environments before release commands run.
- Remove local preview and production env files from the supported workflow and update docs to reflect the release env matrix.

## Capabilities

### New Capabilities
- `mobile-release-env-hardening`: Ensure release variants use validated EAS-managed env configuration and cannot silently fall back to local env files.

### Modified Capabilities

## Impact

- `apps/mobile/scripts/run-variant.sh`
- `apps/mobile/scripts/verify-release-env.sh`
- `apps/mobile/config/release-env-policy.js`
- `apps/mobile/package.json`
- `.github/workflows/mobile-ota-deploy.yml`
- `apps/mobile/README.md`
- `apps/mobile/.env.preview.local`
- `apps/mobile/.env.production.local`
