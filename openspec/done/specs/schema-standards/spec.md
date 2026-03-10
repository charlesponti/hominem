# schema-standards Specification

## Purpose
TBD - created by archiving change phased-db-redesign. Update Purpose after archive.
## Requirements
### Requirement: Snake_case column naming
All database column names MUST use snake_case (lowercase with underscores).

#### Scenario: Schema introspection
- **WHEN** any table schema is inspected
- **THEN** all column names are in snake_case (created_at, not createdAt)

#### Scenario: Query construction
- **WHEN** queries are written against the database
- **THEN** column references use snake_case

### Requirement: Timestamp with time zone
All timestamp columns MUST use PostgreSQL TIMESTAMP WITH TIME ZONE type.

#### Scenario: Timestamp column created
- **WHEN** a new timestamp column is added to any table
- **THEN** it uses timestamp with time zone (not text, not timestamp without time zone)

#### Scenario: Timezone handling
- **WHEN** timestamp is stored
- **THEN** timezone information is preserved

### Requirement: Foreign key constraints
All relationships to users MUST have explicit foreign key constraints with appropriate cascade behavior.

#### Scenario: User deletion cascades
- **WHEN** a user is deleted
- **THEN** related records are deleted via CASCADE or the FK constraint prevents deletion

### Requirement: Index strategy
Tables MUST have appropriate indices for common query patterns.

#### Scenario: User-scoped queries
- **WHEN** querying records filtered by user_id
- **THEN** index on user_id column enables efficient lookup

#### Scenario: Time-range queries
- **WHEN** querying records by date range
- **THEN** index on timestamp columns enables efficient sorting

### Requirement: UUID primary keys
All tables MUST use UUID as primary key type.

#### Scenario: Primary key type
- **WHEN** new table is created
- **THEN** id column uses UUID type with defaultRandom()

