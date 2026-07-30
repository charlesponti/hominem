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

This package publishes publicly to npm. Consumers only need:

```sh
pnpm add @ponti-studios/auth
```

## Publishing a new version

Bump `version` in `package.json`, then run the `publish-auth` GitHub Actions
workflow (`workflow_dispatch`, `.github/workflows/publish-auth.yml`) from the
Actions tab. It builds `packages/auth` (tests excluded from the published
output — see `tsconfig.build.json`) and publishes to public npm using npm
trusted publishing.
