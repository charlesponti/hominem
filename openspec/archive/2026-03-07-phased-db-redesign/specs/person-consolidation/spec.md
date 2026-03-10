## REMOVED Requirements

### Requirement: Separate contacts table
**Reason**: Merged into unified persons table with type discriminator
**Migration**: Use persons table with person_type = 'contact'

### Requirement: Separate people table
**Reason**: Merged into unified persons table with type discriminator
**Migration**: Use persons table

### Requirement: Separate relationships table
**Reason**: Merged into unified persons table with type discriminator
**Migration**: Use persons table with person_type = 'relationship'

## ADDED Requirements

### Requirement: Unified persons table
A single `persons` table MUST store all person/contact data with a person_type enum for discrimination.

#### Scenario: User's own profile created
- **WHEN** user account is created
- **THEN** person record created with person_type = 'self'

#### Scenario: Contact added
- **WHEN** user adds a contact
- **THEN** person record created with person_type = 'contact'

#### Scenario: Relationship tracked
- **WHEN** user tracks a relationship
- **THEN** person record created with person_type = 'relationship'

### Requirement: Person types enumeration
The persons table MUST support these types: self, contact, relationship, family, colleague.

#### Scenario: Query contacts only
- **WHEN** querying only user's contacts
- **THEN** filter by person_type = 'contact'

### Requirement: Persons linked to user
All person records MUST be associated with a user via foreign key.

#### Scenario: User's persons queried
- **WHEN** querying persons for a user
- **THEN** results include records where user_id matches

### Requirement: Flexible fields
The persons table MUST include all fields from merged tables as nullable columns.

#### Scenario: Relationship-specific fields
- **WHEN** person_type is 'relationship'
- **THEN** date_started, date_ended fields may be populated

### Requirement: Column naming
All column names in persons table MUST use snake_case.

#### Scenario: Schema inspection
- **WHEN** persons table is inspected
- **THEN** all columns use snake_case (first_name, last_name, linkedin_url, etc.)
