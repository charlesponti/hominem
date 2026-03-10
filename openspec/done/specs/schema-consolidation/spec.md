# schema-consolidation Specification

## Purpose
TBD - created by archiving change phased-db-redesign. Update Purpose after archive.
## Requirements
### Requirement: Single source of truth for table definitions
Each database table MUST be defined in exactly ONE schema file. No duplicates.

#### Scenario: Table defined in two places
- **WHEN** attempting to define same table in multiple files
- **THEN** the schema validation fails

#### Scenario: Consuming table from code
- **WHEN** importing a table definition
- **THEN** the import comes from a single canonical location

### Requirement: snake_case column naming
All column names across ALL tables MUST use snake_case.

#### Scenario: New column added
- **WHEN** a new column is added to any table
- **THEN** it uses snake_case (user_id, not userId)

#### Scenario: Legacy camelCase column exists
- **WHEN** a table has camelCase columns
- **THEN** it must be updated to snake_case

### Requirement: UUID primary keys
All tables MUST use UUID as primary key type.

#### Scenario: New table created
- **WHEN** a new table is created
- **THEN** id column uses uuid() with defaultRandom()

### Requirement: Timestamp standardization
All timestamp columns MUST use timestamp() type with mode: 'string'.

#### Scenario: Timestamp column created
- **WHEN** a new timestamp column is added
- **THEN** it uses timestamp() not text()

### Requirement: Foreign key constraints
All relationships to users MUST have explicit foreign key constraints.

#### Scenario: Table with user reference
- **WHEN** a table references users
- **THEN** it has a user_id FK with appropriate cascade behavior

