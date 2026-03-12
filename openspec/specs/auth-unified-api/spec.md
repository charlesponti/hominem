# auth-unified-api Specification

## Purpose
TBD - created by archiving change 2026-03-01-unify-auth-provider. Update Purpose after archive.
## Requirements
### Requirement: Single exported AuthProvider
The `@hominem/auth` package SHALL export exactly one `AuthProvider` component at
its top level.  This provider SHALL accept props matching `AuthProviderProps` in
`client.tsx` and SHALL NOT accept `initialSession` or other legacy props.

#### Scenario: Importing provider in app
- **WHEN** a consumer imports `{ AuthProvider }` from `@hominem/auth`
- **THEN** the imported symbol refers to the client.tsx implementation
- **AND** TypeScript reports no additional required props beyond `config` and
  optional `onAuthEvent`

### Requirement: Unified AuthContext object
The `AuthContext` context object SHALL be defined once in
`packages/auth/src/AuthContext.tsx` and re-used by both the client provider and
any mock providers.  No other context object SHALL be created for auth.

#### Scenario: React context identity
- **WHEN** a component obtains the context via `useContext(AuthContext)` and the
  provider rendered above it is the client `AuthProvider`
- **THEN** the returned value is non-null

### Requirement: Safe hook for shared layouts
The package SHALL export a hook `useSafeAuth()` that returns
`AuthContextType | null` without throwing.  This hook SHALL be suitable for
layouts and SSR scenarios where the provider may not yet be initialized.

#### Scenario: Header uses useSafeAuth
- **WHEN** `Header` calls `useSafeAuth()` on the server
- **THEN** it receives `null` instead of throwing
- **AND** the component can render guest UI

### Requirement: Mock provider is non-public
The simple/mock provider component used for tests SHALL be named
`LocalMockAuthProvider` and SHALL NOT be re-exported from the package root.
External code shall only access it via explicit path
`@hominem/auth/src/AuthContext` or test helpers.

#### Scenario: App code attempting to import mock
- **WHEN** app code writes `import { LocalMockAuthProvider } from '@hominem/auth'`
- **THEN** TypeScript reports an error indicating the symbol is not exported

### Requirement: API authentication accepts both canonical bearer contracts
Protected API routes SHALL attempt Better Auth bearer-session resolution before
falling back to the legacy custom JWT verifier so browser-originated and CLI
machine flows can share the same API surface.

#### Scenario: Better Auth bearer authenticates protected route
- **WHEN** a protected API route receives an `Authorization: Bearer` header for a valid Better Auth session
- **THEN** the API authenticates the request via Better Auth session resolution
- **AND** the request succeeds without requiring a legacy custom JWT

#### Scenario: Legacy JWT bearer still authenticates protected route
- **WHEN** a protected API route receives an `Authorization: Bearer` header for a valid legacy custom JWT
- **THEN** the API authenticates the request via the legacy verifier
- **AND** the request succeeds
