# V. Developer

The system is only real when a clean checkout, a deployment, and a production failure all behave as deliberately as local development.

## Developer law

- `just` and root `pnpm` scripts are the repository-level command interface. Package scripts are Turbo primitives, not contributor instructions.
- Run the smallest relevant validation lane first: `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test`, each scoped with `--filter=@hominem/<package>...` (e.g. `--filter=@hominem/api...`, `--filter=@hominem/omiro...`, `--filter=@hominem/career...`, `--filter=@hominem/finance...`).
- Source-first workspace exports are the local-development model. Production deployables build explicit artifacts; stale `build/` directories are never a second source of truth.
- One Node and pnpm line governs local development, CI, Docker, Railway, and EAS. Version drift is a defect.
- `@hominem/env` owns shared environment semantics. Framework prefixes adapt a variable for a runtime; they do not invent a second meaning.

## Deployment law

Every production service has one deployment authority. A GitHub-managed Railway service must not also use Railway linked-source auto-deploy.

A deployment target is one versioned tuple:

```text
repository + logical service + immutable Railway service ID
+ checked-in configuration path + triggering workflow
```

Upload acceptance is not deployment success. Automation verifies the resolved target identity and the final remote deployment state.

## Omiro mobile delivery

Omiro uses Expo Continuous Native Generation. The checked-in source of truth is the app config, local Expo Modules, and config plugins; `apps/omiro/ios` is generated output and is excluded from Git and EAS uploads.

The release path is deliberately linear:

```text
local development client -> production TestFlight candidate -> phased App Store release
```

TestFlight candidates and App Store releases use the same production bundle, backend, update channel, and native binary. There is no separate staging binary. Production releases are manual GitHub workflow dispatches protected by the `omiro-testflight` and `omiro-production` environments. The old automatic `main`-to-store path is prohibited.

The marketing version is committed in app config and is the EAS Update runtime version. EAS remotely increments only the iOS build number. A native compatibility fingerprint is recorded in the release manifest and must match before an OTA update can be published.

Production OTA updates are manually rolled out at 10%, 50%, and 100%, with rollback available at every stage. Native changes require a new TestFlight candidate and App Store release.
