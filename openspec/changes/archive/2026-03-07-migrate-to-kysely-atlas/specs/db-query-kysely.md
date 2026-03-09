## ADDED Requirements

### Requirement: Types are generated from database schema
The system SHALL generate TypeScript types for the database by introspecting the database schema using `kysely-codegen`, ensuring types always match the actual database structure.

#### Scenario: Generating types
- **WHEN** running `kysely-codegen --dialect postgres --out-file src/types/database.ts`
- **THEN** a `Database` interface is generated with all tables and columns
- **AND** the interface can be used to type a Kysely instance

### Requirement: Queries are type-safe
The system SHALL provide type safety at compile time for all database queries, catching invalid column names and type mismatches before runtime.

#### Scenario: Invalid column name
- **WHEN** a developer writes a query with a non-existent column name
- **THEN** TypeScript reports a compile-time error

#### Scenario: Type mismatch in where clause
- **WHEN** a developer attempts to compare a text column to a number
- **THEN** TypeScript reports a compile-time type error

### Requirement: Queries use fluent API
The system SHALL use Kysely's fluent query builder API that compiles to raw SQL, providing direct control over the generated queries.

#### Scenario: Select with conditions
- **WHEN** a developer writes: `db.selectFrom('tasks').where('user_id', '=', userId).selectAll().execute()`
- **THEN** the generated SQL is: `SELECT * FROM tasks WHERE user_id = $1`

### Requirement: Queries live in RPC route handlers
The system SHALL place database queries directly in RPC route handlers, without an intermediate service layer abstraction.

#### Scenario: Reading a task
- **WHEN** the `/tasks/:id` endpoint receives a request
- **THEN** the route handler contains the Kysely query directly

### Requirement: Type-checking performance is improved
The system SHALL achieve improved TypeScript type-checking performance compared to the previous Drizzle implementation, with reduced memory usage.

#### Scenario: Type-checking the db package
- **WHEN** running `tsc --noEmit` on the database package
- **THEN** memory usage is under 100MB
- **AND** completion time after typing `.` on a database object is under 500ms

### Requirement: Queries are parameterized
The system SHALL use parameterized queries to prevent SQL injection attacks.

#### Scenario: User input in query
- **WHEN** a developer uses user-provided input in a query
- **THEN** the query uses parameter placeholders (`$1`, `$2`) rather than string interpolation

### Requirement: Database connection is managed centrally
The system SHALL manage the database connection (pool) in a single location, with a singleton Kysely instance.

#### Scenario: Application startup
- **WHEN** the application starts
- **THEN** a single Kysely instance is created with connection pooling
- **AND** this instance is used for all queries
