# health-records-unified Specification

## Purpose
TBD - created by archiving change phased-db-redesign. Update Purpose after archive.
## Requirements
### Requirement: Unified health records table
A single `health_records` table MUST store all health and fitness data with a record_type enum for discrimination.

#### Scenario: Activity record created
- **WHEN** user logs a workout activity
- **THEN** record is created in `health_records` with record_type = 'activity'

#### Scenario: Metric record created
- **WHEN** user logs a health metric (steps, heart rate, weight, etc.)
- **THEN** record is created in `health_records` with appropriate record_type

### Requirement: Record types enumeration
The health_records table MUST support these record types: activity, metric_steps, metric_heart_rate, metric_weight, metric_bp_systolic, metric_bp_diastolic, metric_sleep.

#### Scenario: Querying by record type
- **WHEN** querying health records filtered by type
- **THEN** only records matching the specified type are returned

### Requirement: Health records linked to user
All health records MUST be associated with a user via foreign key.

#### Scenario: User health data queried
- **WHEN** querying health records for a user
- **THEN** results include records where user_id matches the requested user

### Requirement: Timestamps on health records
Health records MUST include recorded_at, created_at, and updated_at timestamps.

#### Scenario: Record time tracking
- **WHEN** health record is created
- **THEN** recorded_at reflects when the health event occurred, created_at reflects insert time

### Requirement: Platform source tracking
Health records MUST track the data source platform (apple_health, google_fit, garmin, manual).

#### Scenario: Platform filtering
- **WHEN** querying health records by platform
- **THEN** results are filtered to records from that platform

