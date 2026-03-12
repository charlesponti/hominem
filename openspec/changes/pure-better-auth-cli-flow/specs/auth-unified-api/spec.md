## MODIFIED Requirements

### Requirement: The `@hominem/auth` package SHALL export exactly one `AuthProvider` component at
The `@hominem/auth` package SHALL export exactly one `AuthProvider` component at
`client.tsx` and SHALL NOT accept `initialSession` or other legacy props.

#### Scenario: App imports provider
- **WHEN** a consumer imports `{ AuthProvider }` from `@hominem/auth`
- **THEN** the imported symbol refers to the client.tsx implementation

#### Scenario: API authentication accepts both canonical contracts
- **WHEN** a protected API route receives an `Authorization: Bearer` header
- **THEN** the API first attempts Better Auth bearer-session resolution
- **AND** if Better Auth resolution does not authenticate the request the API falls back to the legacy custom JWT verifier
- **AND** a valid token from either contract authenticates the request successfully
