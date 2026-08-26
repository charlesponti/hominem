---
name: omiro-predeploy
description: Run Omiro’s production preflight checks before an EAS/TestFlight release; use for release readiness, not for submitting or publishing a build.
---

# Omiro Predeploy

Use this skill when the user asks whether Omiro is ready for a new production version, wants a release checklist, or requests pre-deployment validation.

This is a preflight skill. Do not run `just mobile release`, `pnpm submit`, `eas submit`, or `just mobile update` unless the user separately authorizes the release or update. Running checks and generating the ignored CNG iOS project are allowed.

## Working-tree and documentation checks

- Inspect `git status --short --branch` and report uncommitted changes. Do not claim release readiness while the intended release changes are uncommitted.
- Read `apps/omiro/README.md`, `apps/omiro/AGENTS.md`, and the current release workflow before making release-specific recommendations.
- Confirm the marketing version in `apps/omiro/app.config.js` is intentionally set. EAS remotely increments the iOS build number; do not invent or manually change a build number unless requested.
- Check `git diff --check`.

## Automated validation

Run the narrow checks first, then the repository gate:

```bash
pnpm --filter=@hominem/omiro format:check
pnpm --filter=@hominem/omiro lint
pnpm --filter=@hominem/omiro typecheck
pnpm --filter=@hominem/omiro test
npx react-doctor@latest --verbose --scope changed
pnpm run check
```

If the change affects shared chat behavior or API contracts, also run the relevant web tests/typecheck and build. Treat failures as blockers unless they are clearly pre-existing and documented with the exact command and error.

## Production identity and embed verification

Before any local Expo/EAS production command, set the environment explicitly:

```bash
export APP_ENV=production
```

Then verify the resolved production identity and bundle embedding:

```bash
pnpm --filter=@hominem/omiro verify:release
pnpm --filter=@hominem/omiro exec expo export:embed --eager --platform ios --dev false
```

The resolved app must be `Omiro` with bundle identifier `com.pontistudios.hakumi`, production updates configuration, and store distribution expectations. If identity verification fails, fix environment resolution; never bypass the guard.

## Native configuration preflight

For changes involving native modules, permissions, app config, assets, entitlements, or a new store binary:

```bash
just mobile prebuild production
```

Inspect the generated production app on an iOS simulator or device. The `apps/omiro/ios` directory is CNG-generated and gitignored; never hand-edit it as the release fix.

Smoke-test the release-critical paths:

- fresh sign-in and app unlock;
- chat-first launch, start chat, resume chat, stop/retry/regenerate;
- offline and missing-chat recovery;
- archive, deep links, All, and Time navigation;
- voice input, audio replies, attachments, notes, tasks, calendar access, and native permissions when affected.

Use Maestro for repeatable iOS acceptance flows when installed. If Maestro is unavailable, record that limitation and collect manual simulator evidence for every changed acceptance state, including Reduce Motion and the smallest supported viewport.

## Release handoff

Report:

1. blockers and exact failing commands;
2. passed checks and test counts;
3. manual or simulator evidence paths;
4. unverified areas and why;
5. the next authorized action.

The actual store release remains the guarded workflow described in `apps/omiro/.eas/workflows/production-release.yml`, normally invoked with `just mobile release`. A production release must pass the workflow’s identity guard and manual approval before TestFlight submission.
