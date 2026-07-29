# @ponti-studios/auth

Server-side session verification and shared auth helpers for apps that trust
Hominem's Better Auth deployment (`api.ponti.io` in production,
`http://localhost:4040` locally), but live outside this monorepo's pnpm
workspace.

Login itself stays owned by Hominem's hosted `/login` page — this package
does not ship a client-side login form. See `./server` for verifying an
inbound request's session, and `./shared/redirect-policy` for validating a
post-login redirect target against the app's allowlist.

## Installing from an external repo

This package publishes to GitHub Packages under the `ponti-studios` org, not
the public npm registry. Consumers need:

1. A `.npmrc` (repo root, not committed if it embeds a token) mapping the
   scope to GitHub Packages:

   ```
   @ponti-studios:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}
   ```

2. A GitHub personal access token with `read:packages` scope (classic PAT,
   or a fine-grained PAT with read access to package contents for the
   `ponti-studios` org), exported locally as `GITHUB_PACKAGES_TOKEN` and set
   as a CI secret with the same name for automated installs/builds.

3. `pnpm add @ponti-studios/auth`.

## Publishing a new version

Bump `version` in `package.json`, then run the `publish-auth` GitHub Actions
workflow (`workflow_dispatch`, `.github/workflows/publish-auth.yml`) from the
Actions tab, or `gh workflow run publish-auth.yml`. It builds
`packages/auth` (tests excluded from the published output — see
`tsconfig.build.json`) and publishes via `pnpm publish` using the workflow's
own `GITHUB_TOKEN`.
