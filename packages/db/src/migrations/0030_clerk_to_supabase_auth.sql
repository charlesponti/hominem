-- Migration: Replace Clerk auth with Supabase auth
-- This migration renames the clerk_id column to supabase_user_id

-- Drop the old index
DROP INDEX IF EXISTS clerk_id_idx;

-- Rename the column
ALTER TABLE users RENAME COLUMN clerk_id TO supabase_user_id;

-- Create the new index
CREATE INDEX supabase_user_id_idx ON users(supabase_user_id);
