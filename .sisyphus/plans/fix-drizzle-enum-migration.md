# Fix Drizzle Enum Migration for Production

## TL;DR

> **Quick Summary**: Fix blocking migration error "type 'interview_type' does not exist" by creating a new migration that safely recreates missing PostgreSQL enums before table creation.
> 
> **Deliverables**:
> - New migration file 0051 with enum recreation SQL
> - Verification queries confirming enum existence
> - Rollback procedure documentation
> - Dev environment test confirmation
> 
> **Estimated Effort**: Short (1-2 hours)
> **Parallel Execution**: NO - sequential (verify each step before proceeding)
> **Critical Path**: Generate migration → Test in dev → Verify enums → Apply to production

---

## Context

### Original Request

User attempted to run `bun run db:migrate` in the `packages/db` directory and encountered a blocking error:

```
DrizzleQueryError: Failed query: CREATE TABLE "interviews" (...)
PostgresError: type "interview_type" does not exist
```

Migration 0050 tries to create tables referencing interview enums that don't exist in the database.

### Interview Summary

**Key Discussions**:
- **Error Analysis**: Migration 0050 attempts to create `interviews` table with columns referencing enum types `interview_type`, `interview_format`, and `interview_status`, but these enums were never created.
- **Migration History**: Enums were initially created in migration 0036, dropped in migration 0037 (schema reset), and migration 0050 attempts to recreate tables but forgot to recreate the enums first.
- **Database State Verified**: `psql -c "\dT interview_*"` returned 0 rows, confirming enums don't exist.
- **User Constraint**: Requires production-safe solution (no data loss, reversible changes).

**Research Findings**:
- **Explore Agent**: Confirmed enum definitions exist correctly in `packages/db/src/schema/interviews.schema.ts` with proper ordering (enums defined before tables).
- **Librarian Agent**: Identified this as a known Drizzle Kit bug (#5121) where `drizzle-kit generate` sometimes fails to include `CREATE TYPE` statements in migrations. Industry best practice: use `generate` + `migrate` workflow, not `push` for production.
- **Root Cause**: Drizzle Kit beta had enum ordering bugs. Migration 0050 was generated without the required `CREATE TYPE` statements.

---

## Work Objectives

### Core Objective

Create a production-safe migration that recreates the three interview-related PostgreSQL enum types (`interview_type`, `interview_format`, `interview_status`) so that migration 0050 can successfully create the `interviews` table without error.

### Concrete Deliverables

- `packages/db/src/migrations/0051_*` - New migration file with enum creation SQL
- Verification output showing enums exist in database
- Documentation of rollback procedure
- Test results from dev environment

### Definition of Done

- [ ] `bun run db:migrate` completes successfully without errors
- [ ] `psql -c "\dT interview_*"` shows all 3 enum types
- [ ] `interviews` table exists and can insert/query data with enum values
- [ ] Rollback procedure documented and tested
- [ ] Changes committed to `chore/monorepo-refactor` branch

### Must Have

- Idempotent enum creation (use `IF NOT EXISTS` to handle both fresh DBs and DBs where enums might exist)
- Verification queries that prove enums were created
- Clear rollback instructions for emergency situations
- Dev environment testing before production deployment

### Must NOT Have (Guardrails)

- **DO NOT modify migration 0050** - this would break migration history and cause issues for environments where 0050 already succeeded
- **DO NOT modify schema TypeScript files** - they are already correct (enums properly defined)
- **DO NOT use `DROP DATABASE`** - must preserve all existing data
- **DO NOT skip dev environment testing** - must verify migration works before production
- **DO NOT use `drizzle-kit push`** - use proper `generate` + `migrate` workflow
- **DO NOT create tables in this migration** - only recreate enums; let existing migration 0050 handle tables

---

## Verification Strategy

### Test Decision

- **Infrastructure exists**: YES (project uses Drizzle ORM with PostgreSQL)
- **User wants tests**: Manual-only (production safety verification)
- **Framework**: None - manual verification with SQL queries

### Automated Verification Only (NO User Intervention)

Each TODO includes EXECUTABLE verification procedures that agents can run directly:

**For Database Migration changes** (using Bash with psql):

```bash
# Agent runs after migration:
psql "postgresql://postgres:postgres@localhost:5432/hominem" -c "\dT interview_*"
# Assert: Output shows 3 enum types (interview_type, interview_format, interview_status)

psql "postgresql://postgres:postgres@localhost:5432/hominem" -c "\d interviews"
# Assert: Table exists with enum columns

psql "postgresql://postgres:postgres@localhost:5432/hominem" -c "
  INSERT INTO interviews (user_id, job_application_id, type, format, scheduled_at)
  VALUES (
    gen_random_uuid(),
    gen_random_uuid(),
    'Technical'::interview_type,
    'VideoCall'::interview_format,
    NOW()
  )
  RETURNING id;
"
# Assert: INSERT succeeds, returns UUID
```

**Evidence to Capture:**
- [ ] Terminal output from `bun run db:migrate` showing success
- [ ] psql query results showing all 3 enums exist
- [ ] Test INSERT/SELECT query results
- [ ] Migration journal JSON showing 0051 entry

---

## Execution Strategy

### Sequential Execution (Safety-First)

> Each step must complete and be verified before proceeding to the next.
> NO parallel execution - database migrations must be sequential.

```
Step 1: Generate Migration 0051
  ↓ (wait for file creation)
Step 2: Edit Migration SQL
  ↓ (wait for SQL verification)
Step 3: Test in Dev Environment
  ↓ (wait for success confirmation)
Step 4: Verify Enums Created
  ↓ (wait for enum verification)
Step 5: Re-run Migration 0050
  ↓ (wait for table creation success)
Step 6: Verify Full Schema
  ↓ (wait for integration test)
Step 7: Document Rollback
  ↓
Step 8: Commit Changes

Critical Path: All steps are sequential
Parallel Speedup: N/A (safety requires sequential execution)
```

---

## TODOs

- [ ] 1. Generate new migration file 0051

  **What to do**:
  - Run `bun run db:generate` from `packages/db` directory
  - This creates a new timestamped migration file like `0051_<adjective>_<name>.sql`
  - File will be in `packages/db/src/migrations/`
  - Verify the file was created and note its exact name

  **Must NOT do**:
  - Do NOT modify migration 0050
  - Do NOT edit schema TypeScript files
  - Do NOT skip this step and manually create the file

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple single-command execution with file creation verification
  - **Skills**: []
    - No specialized skills needed - standard Bash command

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential only
  - **Blocks**: Task 2 (editing the generated file)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Command Reference**:
  - `packages/db/drizzle.config.ts` - Drizzle configuration showing `out: './src/migrations'` path
  - `packages/db/package.json` - Script `db:generate` runs `drizzle-kit generate`

  **Migration Pattern Reference**:
  - `packages/db/src/migrations/0036_funny_fat_cobra.sql:1-7` - Example of enum creation syntax (CREATE TYPE statements)
  - `packages/db/src/migrations/meta/_journal.json` - Journal file that tracks migration entries

  **Schema Reference** (for enum values):
  - `packages/db/src/schema/interviews.schema.ts:17-43` - Complete enum definitions with exact values

  **WHY Each Reference Matters**:
  - `drizzle.config.ts` tells you where the new file will be created
  - `0036_funny_fat_cobra.sql` shows you the exact SQL syntax format Drizzle uses for enums
  - `interviews.schema.ts` provides the source of truth for enum values that must match exactly
  - `_journal.json` helps verify the migration was properly registered

  **Acceptance Criteria**:

  **Automated Verification**:
  ```bash
  # Agent executes:
  cd /Users/charlesponti/Developer/hominem/packages/db
  bun run db:generate
  # Assert: Exit code 0
  # Assert: Output contains "New migration generated"
  
  ls -1 src/migrations/ | tail -1
  # Assert: Output shows file starting with "0051_"
  # Assert: File exists and is readable
  ```

  **Evidence to Capture**:
  - [ ] Terminal output from `bun run db:generate` command
  - [ ] File listing showing new 0051_*.sql file
  - [ ] Content preview of generated file (first 20 lines)

  **Commit**: NO (group with task 8)

---

- [ ] 2. Edit migration 0051 to add enum creation statements

  **What to do**:
  - Open the generated `packages/db/src/migrations/0051_*.sql` file
  - Add the following SQL at the **TOP of the file** (before any other statements):
  
  ```sql
  -- Recreate interview enums (dropped in migration 0037, needed by migration 0050)
  CREATE TYPE IF NOT EXISTS "public"."interview_type" AS ENUM('PhoneScreen', 'Technical', 'Behavioral', 'Panel', 'CaseStudy', 'Final', 'Informational', 'Other');--> statement-breakpoint
  CREATE TYPE IF NOT EXISTS "public"."interview_format" AS ENUM('Phone', 'VideoCall', 'OnSite', 'TakeHomeAssignment', 'Other');--> statement-breakpoint
  CREATE TYPE IF NOT EXISTS "public"."interview_status" AS ENUM('Scheduled', 'Completed', 'Cancelled', 'Rescheduled', 'PendingFeedback');--> statement-breakpoint
  ```
  
  - Save the file
  - Verify the SQL syntax is correct (no typos in enum values)

  **Must NOT do**:
  - Do NOT modify any other migration files
  - Do NOT change the enum values (must match schema exactly)
  - Do NOT remove the `--> statement-breakpoint` comments (Drizzle uses these)
  - Do NOT add table creation statements (only enums)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple file edit with specific SQL insertion at known location
  - **Skills**: []
    - No specialized skills needed - straightforward text editing

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential only
  - **Blocks**: Task 3 (testing in dev)
  - **Blocked By**: Task 1 (must have file generated first)

  **References**:

  **SQL Syntax Reference**:
  - `packages/db/src/migrations/0036_funny_fat_cobra.sql:1-7` - Example of correct enum creation syntax with statement-breakpoint comments

  **Enum Values Reference** (CRITICAL - must match exactly):
  - `packages/db/src/schema/interviews.schema.ts:17-26` - interviewTypeEnum values
  - `packages/db/src/schema/interviews.schema.ts:28-34` - interviewFormatEnum values  
  - `packages/db/src/schema/interviews.schema.ts:36-43` - interviewStatusEnum values

  **Migration Format Reference**:
  - `packages/db/src/migrations/0036_funny_fat_cobra.sql:1-4` - Shows use of `CREATE TYPE` with `IF NOT EXISTS` is NOT in this example, but we need it for idempotency

  **PostgreSQL Documentation** (for IF NOT EXISTS syntax):
  - Official PostgreSQL docs confirm `CREATE TYPE IF NOT EXISTS` syntax is valid (PostgreSQL 9.6+)

  **WHY Each Reference Matters**:
  - `0036_funny_fat_cobra.sql` shows the exact statement-breakpoint format Drizzle expects
  - `interviews.schema.ts` is the source of truth - any mismatch will cause type errors
  - We use `IF NOT EXISTS` for idempotency (safe to run multiple times)

  **Acceptance Criteria**:

  **Automated Verification**:
  ```bash
  # Agent executes:
  cd /Users/charlesponti/Developer/hominem/packages/db
  MIGRATION_FILE=$(ls -1 src/migrations/0051_*.sql | head -1)
  
  # Verify file contains all three CREATE TYPE statements
  grep -c "CREATE TYPE IF NOT EXISTS.*interview_type" "$MIGRATION_FILE"
  # Assert: Output is "1"
  
  grep -c "CREATE TYPE IF NOT EXISTS.*interview_format" "$MIGRATION_FILE"
  # Assert: Output is "1"
  
  grep -c "CREATE TYPE IF NOT EXISTS.*interview_status" "$MIGRATION_FILE"
  # Assert: Output is "1"
  
  # Verify enum values match schema (spot check)
  grep "interview_type.*PhoneScreen.*Technical.*Behavioral" "$MIGRATION_FILE"
  # Assert: Match found (enum values present)
  
  head -10 "$MIGRATION_FILE"
  # Assert: CREATE TYPE statements are at the top of file
  ```

  **Evidence to Capture**:
  - [ ] Output of grep commands showing 3 CREATE TYPE statements found
  - [ ] First 10 lines of migration file showing enums at top
  - [ ] Confirmation that enum values match schema

  **Commit**: NO (group with task 8)

---

- [ ] 3. Test migration in development environment

  **What to do**:
  - Ensure you're working with the dev database (not production)
  - Verify connection: `echo $DATABASE_URL` should show localhost
  - Run `bun run db:migrate` to apply the new migration 0051
  - Observe the output for any errors or warnings
  - If successful, proceed to verification step

  **Must NOT do**:
  - Do NOT run this on production database first
  - Do NOT skip error analysis if migration fails
  - Do NOT proceed to production if ANY errors occur
  - Do NOT ignore warnings about duplicate enums (expected if re-running)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single command execution with output verification
  - **Skills**: []
    - Standard Bash command, no special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential only
  - **Blocks**: Task 4 (enum verification)
  - **Blocked By**: Task 2 (must have SQL edited first)

  **References**:

  **Configuration Reference**:
  - `packages/db/drizzle.config.ts:6-9` - Shows DATABASE_URL logic (test vs dev vs prod)
  - `packages/db/.env.example` - Example of proper DATABASE_URL format for localhost

  **Migration Command Reference**:
  - `packages/db/package.json` - Script `db:migrate` runs `drizzle-kit migrate`

  **Expected Behavior Reference**:
  - `packages/db/src/migrations/meta/_journal.json` - After success, will contain new entry for 0051

  **Error Pattern Reference** (what to watch for):
  - Original error message shows what happens when enums are missing
  - If you see "type already exists" warnings, that's OK (IF NOT EXISTS handles this)
  - If you see "syntax error", check SQL formatting in migration file

  **WHY Each Reference Matters**:
  - `drizzle.config.ts` ensures you're hitting the right database (dev, not prod)
  - `_journal.json` is proof the migration was applied (Drizzle tracks migrations here)
  - Understanding expected errors vs warnings helps you know when to stop and fix vs proceed

  **Acceptance Criteria**:

  **Automated Verification**:
  ```bash
  # Agent executes:
  cd /Users/charlesponti/Developer/hominem/packages/db
  
  # Verify environment
  echo "$DATABASE_URL" | grep -c "localhost"
  # Assert: Output is "1" (confirms dev environment)
  
  # Run migration
  bun run db:migrate 2>&1 | tee migration_output.txt
  # Assert: Exit code 0
  # Assert: Output contains "Migration completed" or similar success message
  # Assert: Output does NOT contain "Failed query" or "ERROR"
  
  # Check journal was updated
  JOURNAL_FILE=src/migrations/meta/_journal.json
  grep -c "0051_" "$JOURNAL_FILE"
  # Assert: Output is "1" (migration registered)
  ```

  **Evidence to Capture**:
  - [ ] Full terminal output from `bun run db:migrate`
  - [ ] Contents of `_journal.json` showing 0051 entry
  - [ ] Confirmation of DATABASE_URL pointing to localhost

  **Commit**: NO (group with task 8)

---

- [ ] 4. Verify enums were created successfully

  **What to do**:
  - Connect to the dev database with psql
  - Run `\dT interview_*` to list all interview-related enum types
  - Verify all 3 enums exist: `interview_type`, `interview_format`, `interview_status`
  - For each enum, run `\dT+ <enum_name>` to see its values
  - Confirm values match the schema definitions exactly

  **Must NOT do**:
  - Do NOT skip this verification step
  - Do NOT assume success without checking enum values
  - Do NOT proceed if any enum is missing
  - Do NOT proceed if enum values don't match schema

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple SQL queries to verify database state
  - **Skills**: []
    - Standard psql commands, no special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential only
  - **Blocks**: Task 5 (re-running migration 0050)
  - **Blocked By**: Task 3 (must migrate first)

  **References**:

  **Database Connection Reference**:
  - `packages/db/drizzle.config.ts:6-9` - Shows how DATABASE_URL is constructed

  **Expected Values Reference** (for comparison):
  - `packages/db/src/schema/interviews.schema.ts:17-26` - interview_type values
  - `packages/db/src/schema/interviews.schema.ts:28-34` - interview_format values
  - `packages/db/src/schema/interviews.schema.ts:36-43` - interview_status values

  **PostgreSQL Enum Commands**:
  - `\dT` - List all types (enums are types in PostgreSQL)
  - `\dT+ <name>` - Show detailed info including enum values
  - `SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'interview_type';` - Query enum values programmatically

  **WHY Each Reference Matters**:
  - Schema files are source of truth - verification must confirm values match exactly
  - psql commands give you immediate visual confirmation of database state
  - Programmatic query allows automated verification without manual checking

  **Acceptance Criteria**:

  **Automated Verification**:
  ```bash
  # Agent executes:
  DB_URL="postgresql://postgres:postgres@localhost:5432/hominem"
  
  # List enum types
  psql "$DB_URL" -c "\dT interview_*" | tee enum_list.txt
  # Assert: Output contains "interview_type"
  # Assert: Output contains "interview_format"
  # Assert: Output contains "interview_status"
  
  # Verify interview_type values
  psql "$DB_URL" -c "SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'interview_type' ORDER BY enumsortorder;" -t
  # Assert: Output contains all 8 values: PhoneScreen, Technical, Behavioral, Panel, CaseStudy, Final, Informational, Other
  
  # Verify interview_format values  
  psql "$DB_URL" -c "SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'interview_format' ORDER BY enumsortorder;" -t
  # Assert: Output contains all 5 values: Phone, VideoCall, OnSite, TakeHomeAssignment, Other
  
  # Verify interview_status values
  psql "$DB_URL" -c "SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'interview_status' ORDER BY enumsortorder;" -t
  # Assert: Output contains all 5 values: Scheduled, Completed, Cancelled, Rescheduled, PendingFeedback
  ```

  **Evidence to Capture**:
  - [ ] Output of `\dT interview_*` showing 3 enums
  - [ ] Full enum value lists for all 3 types
  - [ ] Confirmation values match schema definitions

  **Commit**: NO (group with task 8)

---

- [ ] 5. Verify migration 0050 can now succeed

  **What to do**:
  - Check if migration 0050 has already been applied (check `_journal.json`)
  - If 0050 is NOT in journal: Run `bun run db:migrate` again (will apply 0050)
  - If 0050 IS in journal: Migration already succeeded, skip to verification
  - Verify the `interviews` table was created successfully
  - Confirm table schema includes enum columns

  **Must NOT do**:
  - Do NOT manually create the interviews table
  - Do NOT skip this if 0050 is already in journal (still verify table exists)
  - Do NOT proceed if table creation fails
  - Do NOT modify migration 0050

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Conditional migration run and table verification
  - **Skills**: []
    - Standard Bash and psql commands

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential only
  - **Blocks**: Task 6 (full schema verification)
  - **Blocked By**: Task 4 (enums must exist first)

  **References**:

  **Migration Journal Reference**:
  - `packages/db/src/migrations/meta/_journal.json` - Check for entry with tag `0050_nostalgic_beyonder`

  **Table Schema Reference**:
  - `packages/db/src/schema/interviews.schema.ts:45-76` - Complete table definition including enum columns
  - `packages/db/src/migrations/0050_nostalgic_beyonder.sql:9-27` - CREATE TABLE statement that should now succeed

  **Migration Reference**:
  - `packages/db/src/migrations/0050_nostalgic_beyonder.sql:14-15,22` - Lines using enum types (type, format, status)

  **WHY Each Reference Matters**:
  - `_journal.json` tells you if 0050 was already applied (affects whether you need to run migrate)
  - `interviews.schema.ts` shows what columns should exist in the created table
  - `0050_nostalgic_beyonder.sql` is the actual SQL that should now execute without error

  **Acceptance Criteria**:

  **Automated Verification**:
  ```bash
  # Agent executes:
  cd /Users/charlesponti/Developer/hominem/packages/db
  DB_URL="postgresql://postgres:postgres@localhost:5432/hominem"
  
  # Check if 0050 is in journal
  grep -c "0050_nostalgic_beyonder" src/migrations/meta/_journal.json
  # If 0, then run: bun run db:migrate
  # If 1, skip migration (already applied)
  
  # Verify interviews table exists
  psql "$DB_URL" -c "\d interviews" | tee table_schema.txt
  # Assert: Output shows table definition
  # Assert: Output contains column "type" with type "interview_type"
  # Assert: Output contains column "format" with type "interview_format"
  # Assert: Output contains column "status" with type "interview_status"
  
  # Check table row count (should be 0 for new table)
  psql "$DB_URL" -c "SELECT COUNT(*) FROM interviews;"
  # Assert: Output is "0" (table exists but empty)
  ```

  **Evidence to Capture**:
  - [ ] Journal check output showing 0050 status
  - [ ] Table schema from `\d interviews` showing enum columns
  - [ ] Confirmation of table creation success

  **Commit**: NO (group with task 8)

---

- [ ] 6. Perform integration test with real data

  **What to do**:
  - Insert a test interview record with enum values
  - Query the record back to confirm enum values are stored correctly
  - Update the record with different enum values
  - Delete the test record (cleanup)
  - Verify all operations work without enum-related errors

  **Must NOT do**:
  - Do NOT skip cleanup (delete test record after verification)
  - Do NOT use invalid enum values (must match schema definitions)
  - Do NOT leave test data in the database
  - Do NOT proceed if any operation fails

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple CRUD operations to verify enum functionality
  - **Skills**: []
    - Standard SQL operations via psql

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential only
  - **Blocks**: Task 7 (rollback documentation)
  - **Blocked By**: Task 5 (table must exist first)

  **References**:

  **Table Schema Reference** (for required columns):
  - `packages/db/src/schema/interviews.schema.ts:45-76` - Shows all columns, which are NOT NULL, which have defaults

  **Required Columns for Insert**:
  - `user_id` (uuid, NOT NULL) - needs valid UUID
  - `job_application_id` (uuid, NOT NULL) - needs valid UUID
  - `type` (interview_type, NOT NULL) - enum value
  - `format` (interview_format, NOT NULL) - enum value
  - `scheduled_at` (timestamp, NOT NULL) - date/time value

  **Enum Values Reference** (for test data):
  - `packages/db/src/schema/interviews.schema.ts:17-43` - Valid enum values to use in test

  **WHY Each Reference Matters**:
  - Schema shows which columns are required for INSERT to succeed
  - Enum definitions show valid values you can use for testing
  - This integration test proves the entire migration chain works end-to-end

  **Acceptance Criteria**:

  **Automated Verification**:
  ```bash
  # Agent executes:
  DB_URL="postgresql://postgres:postgres@localhost:5432/hominem"
  
  # Insert test record
  psql "$DB_URL" -c "
    INSERT INTO interviews (
      user_id, 
      job_application_id, 
      type, 
      format, 
      scheduled_at,
      status
    ) VALUES (
      gen_random_uuid(),
      gen_random_uuid(),
      'Technical'::interview_type,
      'VideoCall'::interview_format,
      NOW(),
      'Scheduled'::interview_status
    )
    RETURNING id;
  " -t | tee test_record_id.txt
  # Assert: Returns a UUID (record created)
  
  TEST_ID=$(cat test_record_id.txt | tr -d ' ')
  
  # Query record back
  psql "$DB_URL" -c "SELECT type, format, status FROM interviews WHERE id = '$TEST_ID';"
  # Assert: Output shows "Technical | VideoCall | Scheduled"
  
  # Update with different enum values
  psql "$DB_URL" -c "
    UPDATE interviews 
    SET type = 'Behavioral'::interview_type,
        format = 'OnSite'::interview_format,
        status = 'Completed'::interview_status
    WHERE id = '$TEST_ID';
  "
  # Assert: Exit code 0 (update succeeded)
  
  # Verify update
  psql "$DB_URL" -c "SELECT type, format, status FROM interviews WHERE id = '$TEST_ID';"
  # Assert: Output shows "Behavioral | OnSite | Completed"
  
  # Cleanup: delete test record
  psql "$DB_URL" -c "DELETE FROM interviews WHERE id = '$TEST_ID';"
  # Assert: Exit code 0
  
  # Verify deletion
  psql "$DB_URL" -c "SELECT COUNT(*) FROM interviews WHERE id = '$TEST_ID';"
  # Assert: Output is "0"
  ```

  **Evidence to Capture**:
  - [ ] INSERT output showing UUID of created record
  - [ ] SELECT output confirming enum values stored correctly
  - [ ] UPDATE output confirming enum values can be changed
  - [ ] DELETE confirmation showing cleanup succeeded

  **Commit**: NO (group with task 8)

---

- [ ] 7. Document rollback procedure

  **What to do**:
  - Create a rollback SQL script in case migration needs to be reversed
  - Document the rollback steps in comments within the script
  - Save script as `packages/db/src/migrations/ROLLBACK_0051.sql`
  - Include verification queries to confirm rollback success
  - Add warning comments about when rollback is safe vs dangerous

  **Must NOT do**:
  - Do NOT execute the rollback script (documentation only)
  - Do NOT skip warning comments about data loss
  - Do NOT forget to document the order of operations
  - Do NOT assume rollback is always safe (depends on data)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Create documentation file with SQL rollback commands
  - **Skills**: []
    - Standard file creation and SQL documentation

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential only
  - **Blocks**: Task 8 (commit)
  - **Blocked By**: Task 6 (verify migration works first)

  **References**:

  **Migration to Rollback**:
  - `packages/db/src/migrations/0051_*.sql` - The migration being documented for rollback

  **Rollback Pattern Reference**:
  - PostgreSQL DROP TYPE syntax: `DROP TYPE IF EXISTS type_name CASCADE;`
  - CASCADE is needed if tables reference the enum

  **Danger Zone Reference** (for warnings):
  - If `interviews` table has data, dropping enums will CASCADE delete the table
  - Rollback should only be done if no production data exists

  **Journal Cleanup Reference**:
  - Rollback should also remove entry from `_journal.json` manually

  **WHY Each Reference Matters**:
  - Rollback script needs to reverse exactly what migration 0051 did
  - CASCADE warning is critical - prevents accidental data loss
  - Journal cleanup ensures Drizzle doesn't think migration is still applied

  **Acceptance Criteria**:

  **Automated Verification**:
  ```bash
  # Agent executes:
  cd /Users/charlesponti/Developer/hominem/packages/db
  
  # Verify rollback script exists
  test -f src/migrations/ROLLBACK_0051.sql
  # Assert: Exit code 0 (file exists)
  
  # Verify script contains DROP TYPE statements
  grep -c "DROP TYPE.*interview_type" src/migrations/ROLLBACK_0051.sql
  # Assert: Output is "1"
  
  grep -c "DROP TYPE.*interview_format" src/migrations/ROLLBACK_0051.sql
  # Assert: Output is "1"
  
  grep -c "DROP TYPE.*interview_status" src/migrations/ROLLBACK_0051.sql
  # Assert: Output is "1"
  
  # Verify script contains warnings
  grep -c "WARNING" src/migrations/ROLLBACK_0051.sql
  # Assert: Output >= 1 (at least one warning present)
  
  # Verify script contains CASCADE
  grep -c "CASCADE" src/migrations/ROLLBACK_0051.sql
  # Assert: Output >= 3 (CASCADE used for all DROP TYPE statements)
  ```

  **Evidence to Capture**:
  - [ ] Contents of ROLLBACK_0051.sql file
  - [ ] Grep output confirming all DROP statements present
  - [ ] Verification of warning comments

  **Commit**: NO (group with task 8)

---

- [ ] 8. Commit changes to repository

  **What to do**:
  - Stage the new migration file (`0051_*.sql`)
  - Stage the updated migration journal (`meta/_journal.json`)
  - Stage the rollback documentation (`ROLLBACK_0051.sql`)
  - Create commit with descriptive message following conventional commits format
  - Verify no unintended files are included in commit
  - Push to `chore/monorepo-refactor` branch

  **Must NOT do**:
  - Do NOT commit migration 0050 changes (should be unchanged)
  - Do NOT commit schema TypeScript files (should be unchanged)
  - Do NOT skip journal file (required for Drizzle to track migrations)
  - Do NOT use generic commit message (must be descriptive)
  - Do NOT push to main/master directly (use the feature branch)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard git operations with file staging and commit
  - **Skills**: [`git-master`]
    - `git-master`: Needed for atomic commits following best practices

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential only (final task)
  - **Blocks**: None (final task)
  - **Blocked By**: Task 7 (all work must be complete)

  **References**:

  **Files to Commit**:
  - `packages/db/src/migrations/0051_*.sql` - New migration with enum creation
  - `packages/db/src/migrations/meta/_journal.json` - Updated with 0051 entry
  - `packages/db/src/migrations/ROLLBACK_0051.sql` - Rollback documentation

  **Commit Message Format** (Conventional Commits):
  - Type: `fix` (this fixes a broken migration)
  - Scope: `db` (affects database package)
  - Subject: Clear description of what was fixed
  - Body: Optional explanation of why enums were needed
  - Example: `fix(db): recreate interview enums for migration 0050`

  **Git Best Practices**:
  - Verify no untracked files with `git status`
  - Use `git diff --staged` to review changes before commit
  - Check branch with `git branch` (should show `chore/monorepo-refactor`)

  **WHY Each Reference Matters**:
  - All three files are required for migration to work correctly
  - Conventional commit format maintains clean git history
  - Feature branch ensures safe review before merging to main

  **Acceptance Criteria**:

  **Automated Verification**:
  ```bash
  # Agent executes:
  cd /Users/charlesponti/Developer/hominem
  
  # Verify branch
  git branch --show-current
  # Assert: Output is "chore/monorepo-refactor"
  
  # Stage files
  MIGRATION_FILE=$(ls -1 packages/db/src/migrations/0051_*.sql | head -1)
  git add "$MIGRATION_FILE"
  git add packages/db/src/migrations/meta/_journal.json
  git add packages/db/src/migrations/ROLLBACK_0051.sql
  
  # Verify staging
  git diff --cached --name-only | tee staged_files.txt
  # Assert: Contains 0051_*.sql
  # Assert: Contains _journal.json
  # Assert: Contains ROLLBACK_0051.sql
  # Assert: Does NOT contain 0050_*.sql
  # Assert: Does NOT contain schema TypeScript files
  
  # Create commit
  git commit -m "fix(db): recreate interview enums for migration 0050

Migration 0050 attempted to create interviews table with enum columns,
but the required enums (interview_type, interview_format, interview_status)
were dropped in migration 0037 and never recreated.

This migration adds the three enum types using IF NOT EXISTS for
idempotency, allowing migration 0050 to succeed.

Includes rollback documentation in ROLLBACK_0051.sql."
  # Assert: Exit code 0 (commit succeeded)
  
  # Verify commit
  git log -1 --oneline
  # Assert: Output contains "fix(db): recreate interview enums"
  
  # Show commit details
  git show --stat HEAD
  # Assert: Shows 3 files changed
  ```

  **Evidence to Capture**:
  - [ ] Output of `git status` before and after staging
  - [ ] Output of `git diff --cached` showing staged changes
  - [ ] Commit message and SHA from `git log`
  - [ ] Confirmation commit is on correct branch

  **Commit**: YES
  - Message: `fix(db): recreate interview enums for migration 0050`
  - Files: `0051_*.sql`, `_journal.json`, `ROLLBACK_0051.sql`
  - Pre-commit: None (final commit of work)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 8 (final) | `fix(db): recreate interview enums for migration 0050` | `0051_*.sql`, `_journal.json`, `ROLLBACK_0051.sql` | `git log -1 --stat` shows 3 files |

---

## Success Criteria

### Verification Commands

```bash
# Verify enums exist
psql "postgresql://postgres:postgres@localhost:5432/hominem" -c "\dT interview_*"
# Expected: List showing 3 enum types

# Verify interviews table exists
psql "postgresql://postgres:postgres@localhost:5432/hominem" -c "\d interviews"
# Expected: Table definition with enum columns

# Verify migration can run successfully
cd packages/db && bun run db:migrate
# Expected: "Migration completed" (no errors)

# Verify integration test
psql "postgresql://postgres:postgres@localhost:5432/hominem" -c "
  INSERT INTO interviews (user_id, job_application_id, type, format, scheduled_at)
  VALUES (gen_random_uuid(), gen_random_uuid(), 'Technical'::interview_type, 'VideoCall'::interview_format, NOW())
  RETURNING id;
"
# Expected: Returns UUID (successful insert)
```

### Final Checklist

- [ ] All "Must Have" present: idempotent enum creation, verification queries, rollback docs, dev testing
- [ ] All "Must NOT Have" absent: no modification of 0050, no schema changes, no data loss
- [ ] All automated verification tests pass
- [ ] Commit pushed to `chore/monorepo-refactor` branch
- [ ] Ready for production deployment (after code review and PR approval)
