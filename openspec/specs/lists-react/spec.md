## ADDED Requirements

### Requirement: Package Structure
The lists-react package SHALL provide a well-organized directory structure for list management React components and hooks.

#### Scenario: Import structure
- **WHEN** a consumer imports from `@hominem/lists-react`
- **THEN** they SHALL be able to import individual components: `import { ListForm } from '@hominem/lists-react'`
- **AND** they SHALL be able to import via namespaces: `import { Lists } from '@hominem/lists-react'` and use `Lists.Form`

### Requirement: Component Exports
The lists-react package SHALL export all list management components that were previously in apps/rocco.

#### Scenario: List CRUD components export
- **WHEN** importing list management components
- **THEN** the following SHALL be available: ListForm, ListRow, Lists (main component), ListEditDialog, ListEditButton

#### Scenario: Place management in lists export
- **WHEN** importing place-to-list components
- **THEN** the following SHALL be available: AddPlaceControl, AddToListControl, AddToListDrawerContent

#### Scenario: Collaboration components export
- **WHEN** importing list collaboration components
- **THEN** the following SHALL be available: RemoveCollaboratorButton

### Requirement: Hooks Exports
The lists-react package SHALL export the list management hook for data fetching and mutations.

#### Scenario: Lists data hook
- **WHEN** importing the lists hook
- **THEN** useLists SHALL be available with CRUD operations: create, update, delete, fetch lists and list details

### Requirement: Dependencies
The lists-react package SHALL declare appropriate peer and dev dependencies.

#### Scenario: Peer dependencies
- **WHEN** installing the package
- **THEN** it SHALL declare React, React DOM, and React Query as peer dependencies
- **AND** it SHALL depend on `@hominem/ui`, `@hominem/lists-services`, `@hominem/hono-client`, and `@hominem/hono-rpc`

### Requirement: Type Safety
The lists-react package SHALL maintain full TypeScript type safety.

#### Scenario: Type exports
- **WHEN** using the package
- **THEN** all component props, hook parameters, and return types SHALL be properly typed and exported
- **AND** list-related types from services SHALL be re-exported for convenience
- **AND** no `any` types SHALL be used

### Requirement: Build Configuration
The lists-react package SHALL be buildable and publishable.

#### Scenario: Build output
- **WHEN** running the build command
- **THEN** it SHALL generate CommonJS and ESM outputs
- **AND** it SHALL generate TypeScript declaration files
- **AND** the package SHALL be usable in both CJS and ESM consuming applications
