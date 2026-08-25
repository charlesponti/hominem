---
name: omiro-release
description: Build, guard, and submit an Omiro production release via EAS (TestFlight/App Store). Use when asked to release, ship, publish, or submit Omiro to the App Store/TestFlight, cut a production build, bump version/build numbers, run `eas build`/`eas submit`/`just mobile release`, or publish an OTA update.
---

Omiro ships through two EAS Workflows, not ad hoc `eas build`/`eas submit`
calls. Both require a manual approval step and a passing identity check
before anything reaches Apple.

## Overview

| Path | Trigger | Jobs |
| --- | --- | --- |
| Store release | `just mobile release` | `build_ios` → `guard_identity` → `approve` → `submit_ios` |
| OTA update | `just mobile update "<message>"` | `approve` → `publish_update` (production channel only) |

Workflow files: `apps/omiro/.eas/workflows/production-release.yml`,
`apps/omiro/.eas/workflows/ota-update.yml`. Nothing reaches App Store
Connect, or gets published OTA, without passing `guard_identity` and a
human approval.

## Non-negotiable rule: export `APP_ENV=production` before any local EAS command

```bash
export APP_ENV=production
```

Run this before any local `eas build`, `eas submit`, or `eas config`
invocation targeting production — even `eas submit --id <build_id>`, where
it's cosmetically irrelevant to the actual submission. Reason: Expo's CLI
auto-loads `.env.*.local` files during local config evaluation, before
`eas.json`'s per-profile `env` block applies. A gitignored,
machine-local `.env.development.local` with a stray `APP_ENV` can silently
resolve the wrong app identity — this is exactly how a "production" build
once shipped with the dev bundle ID (`com.pontistudios.hakumi.dev`) and got
rejected by Apple with `-19000` ("No suitable application records were
found"). Real EAS Workflow runs aren't exposed to this — they trust
`EAS_BUILD_PROFILE`, not `APP_ENV` — but any locally-initiated command is.

## The identity guard

`apps/omiro/scripts/verify-release-identity.mjs` runs `expo config --json`
(the same resolution path a real build uses) and asserts the result
matches production identity (`com.pontistudios.hakumi`, `Omiro`,
`appEnvironment: production`) before a build or submit proceeds. Wired
into `pnpm build:prod`, `pnpm submit`, and the `guard_identity` job (which
separately re-checks the *built artifact's* `app_identifier` and
`distribution` outputs against the same expected values). If it fails,
trust it — fix the underlying env resolution rather than bypassing it.

## pnpm version pinning gotcha

`eas.json`'s `build.base.pnpm` pin (`11.23.0`) only applies to `type: build`
jobs. `submit` and `update` job types run on a separate generic runner that
installs dependencies independently and never consults that field. If
either fails with:

```
This project is configured to use 11.23.0 of pnpm. Your current pnpm is v11.x
```

the fix is a `before_install_node_modules` hook on *that specific job*
(already present on `submit_ios` and `publish_update` in the workflow
files):

```yaml
hooks:
  before_install_node_modules:
    - run: corepack prepare pnpm@11.23.0 --activate
```

Do **not** fix this by loosening `pmOnFail`, `engineStrict`,
`verifyStoreIntegrity`, `strictStorePkgContentCheck`, `trustPolicy`,
`blockExoticSubdeps`, or `strictDepBuilds` in root `pnpm-workspace.yaml` —
those are deliberate repo-wide supply-chain hardening shared by every app
in the monorepo, not something to relax for one job.

## `apps/omiro/ios/` is gitignored and CNG-generated

Never hand-edit it or expect changes there to persist — a fresh
`just mobile prebuild production` regenerates it from
`apps/omiro/app.config.ts`.

## Commands

```bash
just mobile prebuild <env>       # Expo prebuild (development|production)
just mobile release              # runs production-release.yml end to end
just mobile update "<message>"   # runs ota-update.yml (production channel)
pnpm build:prod                  # ad hoc local build, gated on the identity guard
pnpm submit                      # ad hoc local submit, gated on the identity guard
```

## Troubleshooting

- **`build` job fails on pnpm mismatch** — verify the `"pnpm": "11.23.0"`
  pin is present in `eas.json`'s `build.base`. Do not remove it; a stale
  warning in older notes about Corepack conflicts (`npm ERR! EEXIST`)
  describes a different failure mode than what the current EAS build image
  actually does without the pin.
- **`submit`/`update` job fails on the *same* pnpm error after `build`
  passed** — that job's runner doesn't read `eas.json`'s `build.base.pnpm`.
  Add/verify the `before_install_node_modules` Corepack hook on that job
  (see above), not the base pin.
- **`eas submit --id <build_id>` logs "Looking up credentials configuration
  for com.pontistudios.hakumi.dev"** — alarming but harmless if `APP_ENV`
  wasn't exported: `--id` pins the exact artifact being uploaded, and the
  ASC App ID comes from `eas.json`'s `submit.production` profile, not local
  bundle-id resolution. Still export `APP_ENV=production` first to avoid
  the scare and stay consistent with the rule above.

## See also

- `docs/omiro-release-hardening-2026-08-12.md` — full incident writeup this
  skill was distilled from.
- `eas-app-stores` / `eas-workflows` plugin skills — general EAS build,
  submit, and workflow-YAML mechanics not specific to Omiro.
