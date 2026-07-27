# V. Sentry

## Omiro Sentry native build phases

`@sentry/react-native`'s Expo config plugin adds two separate Xcode Run Script phases to the archive, each of which shells out to `@sentry/cli`:

- **"Bundle React Native code and images"** (`sentry-xcode.sh`) — uploads JS sourcemaps during the Metro bundle step.
- **"Upload Debug Symbols to Sentry"** (`sentry-xcode-debug-files.sh`) — uploads native dSYMs during archive, after linking.

`@sentry/cli` is only a transitive dependency of `@sentry/react-native`, and pnpm's strict `node_modules` does not expose transitive dependencies to sibling packages by default — plain `require.resolve('@sentry/cli/package.json')` from `apps/omiro/ios` is not guaranteed to find it.

- **On `@sentry/react-native@8.x` (current)**: both scripts resolve via `require.resolve('@sentry/cli/package.json', { paths: [require.resolve('@sentry/react-native/package.json')] })` — walking up from `@sentry/react-native`'s own install location, which finds its nested `@sentry/cli` regardless of pnpm's isolation. Every resolution attempt is wrapped in `2>/dev/null || true`, with a PNPM-shim-parsing fallback if it still comes up empty, so a resolution failure degrades to a build warning instead of aborting the archive.
- **On `@sentry/react-native@7.x`**: neither script had this fix. `sentry-xcode-debug-files.sh` in particular called plain `require.resolve('@sentry/cli/package.json')` **unconditionally, without `2>/dev/null` or `|| true`**, before ever checking `SENTRY_DISABLE_AUTO_UPLOAD` — if unresolvable, `require.resolve` threw, `set -e` propagated that as a hard archive failure, and it happened *before the disable flag was ever read*. This is what broke Omiro's production builds. Upgrading to 8.x fixed it upstream; the 7.x-era workaround was declaring `@sentry/cli` as a direct `devDependency` in `apps/omiro/package.json` so plain `require.resolve` succeeded without the `{ paths }` fix. That devDependency pin is still in place (kept in sync with whatever `@sentry/react-native` pins internally, currently `@sentry/cli@3.6.1`) as defense-in-depth, but is no longer load bearing on 8.x — the upstream resolution fix covers it independently.

Required for this to work end to end, all set as EAS environment variables (`eas env:list <environment>`), not GitHub secrets:

- `SENTRY_ORG`, `SENTRY_PROJECT` — set directly in `eas.json`'s `build.base.env`.
- `SENTRY_AUTH_TOKEN` — EAS secret, all three EAS environments.
- `EXPO_PUBLIC_SENTRY_DSN` — EAS var, all three EAS environments; read directly via `process.env.EXPO_PUBLIC_SENTRY_DSN` in `apps/omiro/services/observability.ts` (not routed through `app.config.ts`'s `extra`).

With `@sentry/cli` now resolvable, `SENTRY_DISABLE_AUTO_UPLOAD` has been removed from `build.base.env` — sourcemaps and dSYMs upload again on production builds, so crashes are symbolicated in Sentry. If a future Sentry build-phase failure needs a quick unblock, re-adding this flag is a stopgap at best: it does not protect against the `@sentry/cli` resolution failure above, only against the upload call after resolution succeeds.

