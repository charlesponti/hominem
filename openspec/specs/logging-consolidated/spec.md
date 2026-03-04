# logging-consolidated Specification

## Purpose
TBD - created by archiving change phased-db-redesign. Update Purpose after archive.
## Requirements
### Requirement: Unified logging table
A single `log` table MUST store all log entries with log_type enum for discrimination.

#### Scenario: Audit log entry created
- **WHEN** data is modified (create/update/delete)
- **THEN** log entry created with log_type = 'AUDIT' and old_values/new_values

#### Scenario: Activity log entry created
- **WHEN** user performs an action
- **THEN** log entry created with log_type = 'ACTIVITY' and description

### Requirement: Log type enumeration
The log table MUST support these log types: AUDIT, ACTIVITY, SYSTEM.

#### Scenario: Query by log type
- **WHEN** querying logs filtered by type
- **THEN** only records matching the specified type are returned

### Requirement: User attribution
All log entries MUST be attributed to a user when applicable.

#### Scenario: User action logged
- **WHEN** logged entry is related to user action
- **THEN** user_id column contains the acting user's ID

### Requirement: Entity tracking
Log entries MUST track the entity being acted upon.

#### Scenario: Entity audit
- **WHEN** an entity is modified
- **THEN** log entry includes entity_type and entity_id

### Requirement: JSON value storage
Audit logs MUST store old and new values as JSONB.

#### Scenario: Value change tracking
- **WHEN** updating a record
- **THEN** old_values contains previous state, new_values contains updated state

### Requirement: Time-based queries
Log table MUST support efficient queries by timestamp.

#### Scenario: Recent activity
- **WHEN** querying logs from last 24 hours
- **THEN** created_at index enables efficient retrieval

