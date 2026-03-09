## ADDED Requirements

### Requirement: Schema is declared in a single SQL file
The system SHALL use a single `schema.sql` file as the declarative source of truth for the database schema, managed by Atlas.

#### Scenario: Schema file exists
- **WHEN** a developer examines the codebase
- **THEN** they find a `schema.sql` file in the database package that defines all tables, columns, indexes, and constraints

### Requirement: Schema changes are computed via diff
The system SHALL compute required database changes by comparing the declared `schema.sql` against the current database state, rather than running sequential migration files.

#### Scenario: Adding a column
- **WHEN** a developer adds a column to `schema.sql` and runs `atlas schema apply`
- **THEN** Atlas generates only the `ALTER TABLE` statement needed to add that column, without requiring a new migration file

#### Scenario: No changes needed
- **WHEN** `schema.sql` matches the current database state
- **THEN** `atlas schema apply` reports no changes are needed

### Requirement: Schema supports branch-based development
The system SHALL allow developers to work on feature branches with independent database states without migration conflicts.

#### Scenario: Two developers add different columns
- **WHEN** Developer A adds `column_a` to `tasks` and Developer B adds `column_b` to `tasks` in their respective branches
- **THEN** both can test their changes independently using separate development databases
- **AND** when merged, the final `schema.sql` contains both columns

### Requirement: Schema can be inspected from database
The system SHALL be able to generate `schema.sql` by introspecting an existing database.

#### Scenario: Introspecting production database
- **WHEN** running `atlas schema inspect --url $DATABASE_URL`
- **THEN** the output is a valid `schema.sql` that matches the current database structure

### Requirement: Schema changes are linted for safety
The system SHALL lint schema changes before applying them to detect destructive operations.

#### Scenario: Detecting column drop
- **WHEN** a developer modifies `schema.sql` to remove a column and runs `atlas migrate lint`
- **THEN** Atlas reports a warning about the destructive change before it reaches production
