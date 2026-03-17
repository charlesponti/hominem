## ADDED Requirements

### Requirement: Package Structure
The invites-react package SHALL provide a well-organized directory structure for invite management React components and hooks.

#### Scenario: Import structure
- **WHEN** a consumer imports from `@hominem/invites-react`
- **THEN** they SHALL be able to import individual components: `import { ReceivedInviteItem } from '@hominem/invites-react'`
- **AND** they SHALL be able to import via namespaces: `import { Invites } from '@hominem/invites-react'` and use `Invites.ReceivedItem`

### Requirement: Component Exports
The invites-react package SHALL export all invite management components that were previously in apps/rocco.

#### Scenario: Received invites components export
- **WHEN** importing received invite components
- **THEN** the following SHALL be available: ReceivedInviteItem, InvitesEmptyState

#### Scenario: Sent invites components export
- **WHEN** importing sent invite components
- **THEN** the following SHALL be available: SentInviteForm, SentInviteItem, SentInvites

#### Scenario: Invite action components export
- **WHEN** importing invite action components
- **THEN** the following SHALL be available: DeleteInviteButton

### Requirement: Hooks Exports
The invites-react package SHALL export the invite management hook for data fetching and mutations.

#### Scenario: Invites data hook
- **WHEN** importing the invites hook
- **THEN** useInvites SHALL be available with operations: fetch received invites, fetch sent invites, send invite, accept invite, decline invite, cancel invite

### Requirement: Dependencies
The invites-react package SHALL declare appropriate peer and dev dependencies.

#### Scenario: Peer dependencies
- **WHEN** installing the package
- **THEN** it SHALL declare React, React DOM, and React Query as peer dependencies
- **AND** it SHALL depend on `@hominem/ui`, `@hominem/invites-services`, `@hominem/hono-client`, and `@hominem/hono-rpc`

### Requirement: Type Safety
The invites-react package SHALL maintain full TypeScript type safety.

#### Scenario: Type exports
- **WHEN** using the package
- **THEN** all component props, hook parameters, and return types SHALL be properly typed and exported
- **AND** invite-related types from services SHALL be re-exported for convenience
- **AND** no `any` types SHALL be used

### Requirement: Build Configuration
The invites-react package SHALL be buildable and publishable.

#### Scenario: Build output
- **WHEN** running the build command
- **THEN** it SHALL generate CommonJS and ESM outputs
- **AND** it SHALL generate TypeScript declaration files
- **AND** the package SHALL be usable in both CJS and ESM consuming applications
