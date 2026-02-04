---
title: Deep Analysis of Database Schema - Issues and Improvements
type: refactor
date: 2026-02-03
---

# Deep Analysis of Database Schema - Issues and Improvements

## Overview

This plan outlines a comprehensive analysis of the Hominem database schema to identify structural inconsistencies, performance bottlenecks, data integrity risks, and standardization opportunities across 25+ domain schema files.

## Problem Statement

The database schema has evolved organically over time, resulting in:
- **Inconsistent patterns**: Mixed naming conventions (camelCase vs snake_case), varying ID generation strategies, inconsistent timestamp configurations
- **Performance gaps**: Missing indexes on foreign keys and frequently queried columns
- **Data integrity risks**: Inconsistent foreign key constraint patterns, missing cascade behaviors
- **Maintenance overhead**: Scattered Zod schemas, duplicated column definitions, unclear standards

## Goals

1. **Identify all schema inconsistencies** across table definitions, naming conventions, and patterns
2. **Detect missing indexes** that impact query performance
3. **Assess data integrity risks** from inconsistent constraints and nullability
4. **Evaluate migration safety** for proposed schema changes
5. **Establish clear standards** for future schema development
6. **Create actionable roadmap** prioritized by risk and effort

## Technical Approach

### Analysis Phases

#### Phase 1: Pattern Inventory & Baseline (2 hours)
**Goal**: Catalog current state of all schema files

**Tasks**:
- [ ] Create inventory of all 25+ schema files with metadata
- [ ] Document ID generation patterns (uuid vs serial vs mixed)
- [ ] Catalog naming conventions (camelCase vs snake_case) per file
- [ ] Map timestamp column configurations
- [ ] Identify foreign key declaration patterns
- [ ] Locate all Zod schema definitions
- [ ] Review relations.ts coverage completeness

**Deliverables**:
- Schema inventory spreadsheet (`packages/db/schema-inventory.md`)
- Pattern consistency matrix

#### Phase 2: Inconsistency Detection (2 hours)
**Goal**: Identify specific issues requiring standardization

**Tasks**:
- [ ] **ID Pattern Audit**: Check all tables use consistent ID type
  - `health.schema.ts` uses `serial()` instead of `uuid().defaultRandom()`
  - `users.schema.ts` uses plain `uuid()` without `defaultRandom()`
  
- [ ] **Naming Convention Audit**: 
  - `users.schema.ts` uses camelCase columns (`createdAt`, `isAdmin`, `userId`)
  - Other files use snake_case (`created_at`, `user_id`)
  
- [ ] **Timestamp Standardization Check**:
  - Most files use `timestamp('column', { precision: 3, mode: 'string' })`
  - `health.schema.ts` uses plain `timestamp('column')`
  
- [ ] **Foreign Key Pattern Review**:
  - Count inline `.references()` vs explicit `foreignKey()` constraints
  - Identify tables with mixed patterns
  
- [ ] **Zod Schema Location Audit**:
  - Map schemas in `.schema.ts` vs `.validation.ts` files
  - Identify orphaned or duplicate schemas

**Deliverables**:
- Inconsistency report with file:line_number references
- Standardization recommendations

#### Phase 3: Index Coverage Analysis (2 hours)
**Goal**: Identify missing indexes impacting query performance

**Tasks**:
- [ ] List all foreign key columns without indexes
- [ ] Identify frequently filtered columns (userId, status, date ranges)
- [ ] Review composite index opportunities (e.g., userId + status)
- [ ] Check for unique constraints that should exist
- [ ] Assess full-text search index coverage

**Key files to analyze**:
- `packages/db/src/schema/finance.schema.ts` - transactions table (high volume)
- `packages/db/src/schema/calendar.schema.ts` - events table (time-series queries)
- `packages/db/src/schema/tasks.schema.ts` - tasks table (user-scoped queries)

**Deliverables**:
- Missing index report with priority rankings
- Index creation SQL scripts
- Performance impact estimates

#### Phase 4: Data Integrity Assessment (1 hour)
**Goal**: Find potential data integrity risks

**Tasks**:
- [ ] Review nullable vs non-nullable column appropriateness
- [ ] Check cascade delete behaviors on foreign keys
- [ ] Identify missing CHECK constraints for data validation
- [ ] Validate enum usage vs reference table decisions
- [ ] Review default value consistency

**Deliverables**:
- Data integrity risk report
- Constraint recommendations

#### Phase 5: Migration Safety Review (1 hour)
**Goal**: Assess impact of proposed changes on existing data

**Tasks**:
- [ ] Review all 16+ existing migrations chronologically
- [ ] Identify tables with existing data (check migration timestamps)
- [ ] Assess safe migration strategies for each proposed change
- [ ] Flag high-risk changes requiring special handling

**Risk classifications**:
- **High Risk**: ID type changes, column renames, NOT NULL additions
- **Medium Risk**: Adding indexes to large tables, precision changes
- **Low Risk**: New indexes on small tables, documentation, Zod relocation

**Deliverables**:
- Migration safety assessment per proposed change
- Risk-mitigation strategies

#### Phase 6: Shared Pattern Analysis (1 hour)
**Goal**: Evaluate shared.schema.ts adoption and opportunities

**Tasks**:
- [ ] Verify `shared.schema.ts` helpers are used consistently
- [ ] Identify duplicated column definitions across files
- [ ] Find opportunities for new shared helpers
- [ ] Review custom type usage consistency

**Current helpers in `packages/db/src/schema/shared.schema.ts`**:
- `createdAtColumn()`, `updatedAtColumn()`
- `requiredTextColumn()`, `optionalTextColumn()`
- `requiredUuidColumn()`, `optionalUuidColumn()`
- `requiredNumericColumn()`, `optionalNumericColumn()`
- `booleanColumn()`, `jsonColumn()`

**Deliverables**:
- Shared pattern adoption report
- Opportunities for new shared helpers

### Implementation Roadmap

#### Phase 1: Non-Breaking Changes (Week 1)
**Priority**: Low risk, immediate value

**Tasks**:
1. Add missing indexes on foreign keys
   - `packages/db/src/schema/finance.schema.ts`: transactions.accountId
   - `packages/db/src/schema/calendar.schema.ts`: events.placeId
   
2. Document current standards in `packages/db/schema-standards.md`

3. Create migration template for future consistency

**Safety**: These changes can be added without affecting existing data

#### Phase 2: Low-Risk Standardization (Week 2)
**Priority**: Consistency without data migration

**Tasks**:
1. Standardize Zod schema locations
   - Move all Zod schemas to `.schema.ts` files (colocated with Drizzle)
   - Deprecate `.validation.ts` pattern
   
2. Add shared helper usage to files not using them
   - Target: `health.schema.ts`, any others identified in Phase 6

3. Document relations patterns

**Safety**: Import path updates only, no data changes

#### Phase 3: Medium-Risk Changes (Week 3)
**Priority**: Data integrity improvements

**Tasks**:
1. Standardize timestamp configurations
   - Update `health.schema.ts` to use `{ precision: 3, mode: 'string' }`
   - Add missing `updatedAt` columns where needed
   
2. Add foreign key constraints where missing
   - Use explicit `foreignKey()` with cascade behaviors
   
3. Validate data before adding NOT NULL constraints

**Safety**: Requires data validation but no transformations

#### Phase 4: High-Risk Changes (Week 4+)
**Priority**: Architectural alignment

**Tasks**:
1. **ID Migration Strategy** (if approved)
   - Migrate `health.schema.ts` from `serial` to `uuid`
   - Add `defaultRandom()` to `users.id`
   
2. **Naming Convention Migration** (if approved)
   - Standardize all column names to snake_case
   - Requires coordinated application code changes

**Safety**: Requires extensive testing, staging validation, and rollback plans

## Deliverables

### 1. Schema Inconsistency Report
**Format**: Markdown table with columns:
| File | Issue Type | Current State | Recommended State | Effort | Risk |

**Categories**:
- ID Pattern Issues (Critical)
- Naming Convention Violations (High)
- Timestamp Inconsistencies (Medium)
- Foreign Key Pattern Variations (Medium)
- Zod Schema Location Issues (Low)

### 2. Missing Index Analysis
**Priority ranking** based on:
- Query frequency estimates
- Table size (from migration history)
- Foreign key relationships

**Example format**:
```sql
-- HIGH PRIORITY: Missing FK index on transactions.accountId
CREATE INDEX CONCURRENTLY "transactions_account_id_idx" 
ON "transactions" ("account_id");
```

### 3. Data Integrity Risk Assessment
- Missing constraints by table
- Orphaned record risks
- Cascade behavior gaps
- Nullable column appropriateness

### 4. Migration Safety Assessment
**For each proposed change**:
- Change description
- Tables affected
- Estimated data volume
- Risk level (Safe/Caution/High Risk)
- Recommended approach
- Rollback strategy

### 5. Standardization Guide
Create `packages/db/SCHEMA_STANDARDS.md` with:
- ID generation: `uuid('id').primaryKey().defaultRandom()`
- Column naming: snake_case for DB, camelCase for TS
- Timestamps: `{ precision: 3, mode: 'string' }` with `.defaultNow()`
- Foreign keys: Inline `.references()` for simple, explicit `foreignKey()` for cascade
- Zod schemas: Colocated in `.schema.ts` files
- Indexes: All FK columns, frequently filtered columns, search columns

### 6. Implementation Roadmap
Phased approach with:
- Effort estimates per phase
- Dependency mapping
- Risk mitigation strategies
- Success criteria

## Acceptance Criteria

### Functional Requirements
- [ ] All 25+ schema files reviewed for consistency
- [ ] Missing indexes identified with priority rankings
- [ ] Data integrity risks documented with mitigation strategies
- [ ] Migration safety assessed for all proposed changes
- [ ] Standards documentation created

### Non-Functional Requirements
- [ ] Zero breaking changes in Phases 1-3
- [ ] All recommendations include risk assessment
- [ ] Documentation follows existing project patterns
- [ ] Implementation roadmap includes rollback plans

### Quality Gates
- [ ] Report reviewed by at least one team member
- [ ] High-risk recommendations validated in staging
- [ ] Standards document approved
- [ ] Migration scripts tested on copy of production schema

## Risks and Mitigation

### High Risk

**1. ID Type Migration Data Loss**
- **Risk**: Changing `serial` to `uuid` in `health.schema.ts` could corrupt existing data
- **Mitigation**: Create new column, migrate data with transformation, drop old column
- **Fallback**: Maintain parallel columns during transition period

**2. Column Rename Breaking Changes**
- **Risk**: Standardizing `createdAt` to `created_at` breaks application code
- **Mitigation**: Requires coordinated deployment; use views as aliases during transition
- **Fallback**: Phased rollout with feature flags

**3. Foreign Key Constraint Violations**
- **Risk**: Adding missing FK constraints fails due to orphaned records
- **Mitigation**: Validate data integrity before adding constraints
- **Fallback**: Clean up orphaned records before constraint addition

### Medium Risk

**4. Index Creation on Large Tables**
- **Risk**: Adding indexes to large tables locks tables during creation
- **Mitigation**: Use `CONCURRENTLY` option; schedule during low-traffic windows
- **Fallback**: Online index creation strategies

**5. Timestamp Precision Changes**
- **Risk**: Changing timestamp precision may affect data interpretation
- **Mitigation**: Test with copy of production data
- **Fallback**: Migration script with data transformation

### Low Risk

**6. Zod Schema Relocation**
- **Risk**: Import path changes may break code
- **Mitigation**: Update imports simultaneously with schema moves
- **Fallback**: Barrel exports to maintain backward compatibility

## Tools and Methodology

### Static Analysis Commands
```bash
# Schema file inventory
find packages/db/src/schema -name "*.schema.ts" -type f | sort

# Pattern detection
grep -r "primaryKey\|serial\|uuid" packages/db/src/schema/*.schema.ts
grep -r "timestamp(" packages/db/src/schema/*.schema.ts | grep -v "precision: 3"
grep -r "camelCase\|isAdmin\|createdAt" packages/db/src/schema/*.schema.ts

# Index analysis
grep -r "index(" packages/db/src/schema/*.schema.ts
```

### Drizzle Kit Introspection
```bash
# Generate migration from current schema
bun run db:generate

# Validate schema compiles
bun run build --filter @hominem/db

# Run type checks
bun run typecheck
```

### Database Queries (if production access)
```sql
-- Table sizes
SELECT schemaname, relname, n_live_tup 
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- Missing FK indexes
SELECT tc.table_name, kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = tc.table_name 
    AND indexdef LIKE '%' || kcu.column_name || '%'
  );
```

## Success Metrics

- **Completeness**: 100% of schema files reviewed (25+ files)
- **Issues Found**: Minimum 10 inconsistencies documented
- **Index Coverage**: All foreign keys have corresponding indexes (or documented exceptions)
- **Standards**: Clear documentation created and approved
- **Risk Assessment**: Every proposed change has risk level assigned
- **Roadmap**: Phased implementation plan with clear priorities

## Future Considerations

### Extensibility
- Schema standards should accommodate new domains without breaking existing patterns
- Index recommendations should be revisited as query patterns evolve
- Migration templates should support zero-downtime deployments

### Maintenance
- Quarterly schema audits to catch drift from standards
- Automated linting for schema pattern compliance
- Documentation updates when standards evolve

## References & Research

### Internal References
- Schema organization: `packages/db/src/schema/tables.ts`
- Relations architecture: `packages/db/src/schema/relations.ts:1-394`
- Shared helpers: `packages/db/src/schema/shared.schema.ts`
- Drizzle config: `packages/db/drizzle.config.ts`

### Schema Files Inventory
**Users & Auth**:
- `packages/db/src/schema/users.schema.ts` - Uses camelCase columns
- `packages/db/src/schema/auth.schema.ts`

**Content**:
- `packages/db/src/schema/notes.schema.ts` - Good pattern example
- `packages/db/src/schema/documents.schema.ts`
- `packages/db/src/schema/bookmarks.schema.ts`

**Finance** (High volume, needs index review):
- `packages/db/src/schema/finance.schema.ts` - Well-structured, good pattern

**Calendar & Events**:
- `packages/db/src/schema/calendar.schema.ts`

**Tasks**:
- `packages/db/src/schema/tasks.schema.ts`

**Travel**:
- `packages/db/src/schema/trips.schema.ts`
- `packages/db/src/schema/trip_items.schema.ts`
- `packages/db/src/schema/travel.schema.ts`
- `packages/db/src/schema/places.schema.ts`

**Career**:
- `packages/db/src/schema/career.schema.ts`
- `packages/db/src/schema/skills.schema.ts`
- `packages/db/src/schema/interviews.schema.ts`
- `packages/db/src/schema/networking_events.schema.ts`

**Health** (Needs attention):
- `packages/db/src/schema/health.schema.ts` - Uses serial() IDs, plain timestamps

**Media**:
- `packages/db/src/schema/movies.schema.ts`
- `packages/db/src/schema/music.schema.ts`

**Other**:
- `packages/db/src/schema/contacts.schema.ts`
- `packages/db/src/schema/chats.schema.ts`
- `packages/db/src/schema/goals.schema.ts`
- `packages/db/src/schema/surveys.schema.ts`
- `packages/db/src/schema/lists.schema.ts`
- `packages/db/src/schema/items.schema.ts`
- `packages/db/src/schema/possessions.schema.ts`
- `packages/db/src/schema/vector-documents.schema.ts`
- `packages/db/src/schema/categories.schema.ts`
- `packages/db/src/schema/tags.schema.ts`
- `packages/db/src/schema/company.schema.ts`

### Related Work
- Migration history: `packages/db/src/migrations/*.sql` (16+ migrations)
- Brainstorm from 2026-01-29: `docs/brainstorms/2026-01-29-resolve-type-errors-migration-brainstorm.md`

---

**Next Steps**: Begin Phase 1 - Pattern Inventory & Baseline by creating the schema inventory spreadsheet.