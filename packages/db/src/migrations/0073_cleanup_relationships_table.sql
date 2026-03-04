-- Phase 1e: Cleanup - Delete Relationships Table
-- 
-- This migration removes the relationships table after its data has been
-- consolidated into the person table via migration 0072.
--
-- VALIDATION CHECKLIST before applying:
-- [ ] Run: SELECT COUNT(*) FROM relationships; to note row count
-- [ ] Run: SELECT COUNT(*) FROM person WHERE user_id IS NULL; should match above
-- [ ] Verify app is not actively reading/writing relationships table
-- [ ] Relationships data is fully migrated to person records

DROP TABLE IF EXISTS "public"."relationships" CASCADE;

-- ===========================
-- PHASE 1e CLEANUP SUMMARY
-- ===========================
-- ✓ relationships table deleted
-- ✓ Relationships data now in person table
-- ✓ Remaining work: Assign person records to users (user_id backfill)
--
-- PHASE 1 COMPLETE (including Phase 1d/1e)
-- Total tables deleted in Phase 1: 10+
-- Total tables created: 6 consolidated
-- Result: Cleaner, unified data model
