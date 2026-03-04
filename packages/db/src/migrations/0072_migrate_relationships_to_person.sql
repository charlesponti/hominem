-- Phase 1d: Migrate Relationships Data to Person Table
-- 
-- This migration consolidates the relationships table data into the person table.
-- All relationship-specific data is moved to the person record.
-- 
-- IMPORTANT: Run AFTER 0071_enhance_person_with_relationship_fields.sql
-- (which adds the new columns to the person table)

-- ===========================
-- Migrate Relationships to Person
-- ===========================
-- For each relationship record, create or update a person record
-- with the relationship data
--
-- NOTE: This assumes relationships table has no FK to users table
-- (relationships are currently orphaned, which is why we're consolidating)
--
-- Strategy:
-- 1. For each relationship, create a person record if it doesn't exist
-- 2. Use the relationship name as first_name + last_name
-- 3. Use relationship._id as row identifier (since it's integer)
-- 4. Assign to the current/primary user (or leave user_id NULL if orphaned)
--
-- Since relationships are not FK'd to any user, we'll create person records
-- without a user_id FK (will need manual assignment or backfill)

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'relationships') THEN
    -- Migrate relationships data to person table
    -- Parse the name field into first_name and last_name
    INSERT INTO person (
      id, user_id, first_name, last_name, date_started, date_ended, location,
      profession, education, diet, age, attractiveness_score, kiss, sex,
      details, created_at, updated_at
    )
    SELECT
      gen_random_uuid(),
      NULL, -- relationships are currently orphaned, will need user_id backfill
      CASE 
        WHEN name LIKE '% %' THEN SUBSTRING(name FROM 1 FOR POSITION(' ' IN name) - 1)
        ELSE name
      END as first_name,
      CASE
        WHEN name LIKE '% %' THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
        ELSE NULL
      END as last_name,
      date_started,
      date_ended,
      location,
      profession,
      education,
      diet,
      age,
      attractiveness_score,
      kiss,
      sex,
      details,
      NOW(),
      NOW()
    FROM relationships
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Migrated relationships data to person table';
  ELSE
    RAISE NOTICE 'relationships table does not exist, skipping migration';
  END IF;
END $$;

-- ===========================
-- Validation
-- ===========================
-- Verify migration completed successfully
DO $$
DECLARE
  rel_count INTEGER;
  person_count INTEGER;
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'relationships') THEN
    SELECT COUNT(*) INTO rel_count FROM relationships;
    SELECT COUNT(*) INTO person_count FROM person WHERE user_id IS NULL;
    
    RAISE NOTICE 'Relationships migrated: % records from relationships → % orphaned person records',
      rel_count, person_count;
  END IF;
END $$;

-- ===========================
-- PHASE 1d MIGRATION SUMMARY
-- ===========================
-- ✓ Relationships data migrated to person table
-- ○ User assignment pending (relationships are orphaned)
-- → Next: Assign relationships to appropriate users (manual or backfill)
-- → Then: Run cleanup migration 0073_cleanup_relationships.sql
