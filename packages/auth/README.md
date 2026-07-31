# @ponti-studios/auth

Compiled server-side session verification, identity types, and pure auth helpers for apps that trust
Hominem's Better Auth deployment (`api.ponti.io` in production,
`http://localhost:4040` locally), but live outside this monorepo's pnpm
workspace.

This package deliberately does not ship React clients, session storage, or login
UI. Apps own their configured Better Auth client and authentication flow. Use
`./server` to verify an inbound request's session, `./types` for serializable
identity DTOs, and `./shared/redirect-policy` for validating a post-login
redirect target against an app allowlist.

## Installing from an external repo

This package publishes compiled JavaScript and declarations publicly to npm. Consumers only need:

```sh
pnpm add @ponti-studios/auth
```

## Publishing a new version

Bump `version` in `package.json`, then run the `publish-auth` GitHub Actions
workflow (`workflow_dispatch`, `.github/workflows/publish-auth.yml`) from the
Actions tab. The package builds before packing and publishes to public npm
using npm trusted publishing.
