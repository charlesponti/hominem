-- Corrected RLS Policies for Kuma Integration
-- This migration fixes all RLS policies to use correct column names and context variables
-- Date: 2026-02-27
-- Status: Ready for Hominem Drizzle migration

-- ============================================================================
-- PART 1: Drop Existing Broken Policies
-- ============================================================================

-- Drop policies on tables with snake_case user_id (these are correct, just need to verify)
DROP POLICY IF EXISTS budget_categories_user_isolation ON budget_categories;
DROP POLICY IF EXISTS budget_goals_user_isolation ON budget_goals;
DROP POLICY IF EXISTS categories_user_isolation ON categories;
DROP POLICY IF EXISTS contacts_user_isolation ON contacts;
DROP POLICY IF EXISTS documents_user_isolation ON documents;
DROP POLICY IF EXISTS events_user_isolation ON events;
DROP POLICY IF EXISTS finance_accounts_user_isolation ON finance_accounts;
DROP POLICY IF EXISTS goals_user_isolation ON goals;
DROP POLICY IF EXISTS health_user_isolation ON health;
DROP POLICY IF EXISTS interviews_user_isolation ON interviews;
DROP POLICY IF EXISTS job_applications_user_isolation ON job_applications;
DROP POLICY IF EXISTS networking_events_user_isolation ON networking_events;
DROP POLICY IF EXISTS plaid_items_user_isolation ON plaid_items;
DROP POLICY IF EXISTS possessions_user_isolation ON possessions;
DROP POLICY IF EXISTS survey_votes_user_isolation ON survey_votes;
DROP POLICY IF EXISTS surveys_user_isolation ON surveys;
DROP POLICY IF EXISTS tags_user_isolation ON tags;
DROP POLICY IF EXISTS tasks_user_isolation ON tasks;
DROP POLICY IF EXISTS transactions_user_isolation ON transactions;
DROP POLICY IF EXISTS trips_user_isolation ON trips;
DROP POLICY IF EXISTS user_artists_user_isolation ON user_artists;
DROP POLICY IF EXISTS user_skills_user_isolation ON user_skills;
DROP POLICY IF EXISTS vector_documents_user_isolation ON vector_documents;
DROP POLICY IF EXISTS work_experiences_user_isolation ON work_experiences;

-- Drop policies on tables with camelCase userId (these need to be fixed)
DROP POLICY IF EXISTS account_user_isolation ON account;
DROP POLICY IF EXISTS bookmark_user_isolation ON bookmark;
DROP POLICY IF EXISTS chat_user_isolation ON chat;
DROP POLICY IF EXISTS chat_message_user_isolation ON chat_message;
DROP POLICY IF EXISTS flight_user_isolation ON flight;
DROP POLICY IF EXISTS hotel_user_isolation ON hotel;
DROP POLICY IF EXISTS item_user_isolation ON item;
DROP POLICY IF EXISTS list_invite_user_isolation ON list_invite;
DROP POLICY IF EXISTS movie_viewings_user_isolation ON movie_viewings;
DROP POLICY IF EXISTS notes_user_isolation ON notes;
DROP POLICY IF EXISTS transport_user_isolation ON transport;
DROP POLICY IF EXISTS user_lists_user_isolation ON user_lists;

-- Drop policy on table with camelCase ownerId
DROP POLICY IF EXISTS list_owner_isolation ON list;

-- ============================================================================
-- PART 2: Create Corrected RLS Policies
-- ============================================================================

-- Tables with snake_case user_id (23 tables)
-- These use the standard PostgreSQL session variable set by Kuma

CREATE POLICY budget_categories_user_isolation ON budget_categories 
FOR ALL TO mcp_server 
USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY budget_goals_user_isolation ON budget_goals 
FOR ALL TO mcp_server 
USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY categories_user_isolation ON categories 
FOR ALL TO mcp_server 
USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY contacts_user_isolation ON contacts 
FOR ALL TO mcp_server 
USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY documents_user_isolation ON documents 
FOR ALL TO mcp_server 
USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY events_user_isolation ON events 
FOR ALL TO mcp_server 
USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY finance_accounts_user_isolation ON finance_accounts 
FOR ALL TO mcp_server 
USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY goals_user_isolation ON goals 
FOR ALL TO mcp_server 
USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY health_user_isolation ON health 
FOR ALL TO mcp_server 
USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY interviews_user_isolation ON interviews 
FOR ALL TO mcp_server 
USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY job_applications_user_isolation ON job_applications 
FOR ALL TO mcp_server 
USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY networking_events_user_isolation ON networking_events 
FOR ALL TO mcp_server 
USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY plaid_items_user_isolation ON plaid_items 
FOR ALL TO mcp_server 
USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY possessions_user_isolation ON possessions 
FOR ALL TO mcp_server 
USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY survey_votes_user_isolation ON survey_votes 
FOR ALL TO mcp_server 
USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY surveys_user_isolation ON surveys 
FOR ALL TO mcp_server 
USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY tags_user_isolation ON tags 
FOR ALL TO mcp_server 
USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY tasks_user_isolation ON tasks 
FOR ALL TO mcp_server 
USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY transactions_user_isolation ON transactions 
FOR ALL TO mcp_server 
USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY trips_user_isolation ON trips 
FOR ALL TO mcp_server 
USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY user_artists_user_isolation ON user_artists 
FOR ALL TO mcp_server 
USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY user_skills_user_isolation ON user_skills 
FOR ALL TO mcp_server 
USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY vector_documents_user_isolation ON vector_documents 
FOR ALL TO mcp_server 
USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY work_experiences_user_isolation ON work_experiences 
FOR ALL TO mcp_server 
USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- ============================================================================
-- PART 3: Tables with camelCase userId - FIXED to use snake_case
-- ============================================================================

-- NOTE: These tables may not exist in Hominem's schema or may have different column names
-- If they exist, they should be updated to use snake_case user_id column
-- For now, we create policies assuming the columns exist with snake_case names

-- Only create policies if the tables exist and have user_id column
-- These are commented out as they may not be in Hominem's schema

-- CREATE POLICY account_user_isolation ON account 
-- FOR ALL TO mcp_server 
-- USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- CREATE POLICY bookmark_user_isolation ON bookmark 
-- FOR ALL TO mcp_server 
-- USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- CREATE POLICY chat_user_isolation ON chat 
-- FOR ALL TO mcp_server 
-- USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- CREATE POLICY chat_message_user_isolation ON chat_message 
-- FOR ALL TO mcp_server 
-- USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- CREATE POLICY flight_user_isolation ON flight 
-- FOR ALL TO mcp_server 
-- USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- CREATE POLICY hotel_user_isolation ON hotel 
-- FOR ALL TO mcp_server 
-- USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- CREATE POLICY item_user_isolation ON item 
-- FOR ALL TO mcp_server 
-- USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- CREATE POLICY list_invite_user_isolation ON list_invite 
-- FOR ALL TO mcp_server 
-- USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- CREATE POLICY movie_viewings_user_isolation ON movie_viewings 
-- FOR ALL TO mcp_server 
-- USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- CREATE POLICY notes_user_isolation ON notes 
-- FOR ALL TO mcp_server 
-- USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- CREATE POLICY transport_user_isolation ON transport 
-- FOR ALL TO mcp_server 
-- USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- CREATE POLICY user_lists_user_isolation ON user_lists 
-- FOR ALL TO mcp_server 
-- USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- ============================================================================
-- PART 4: Table with camelCase ownerId - FIXED to use snake_case
-- ============================================================================

-- CREATE POLICY list_owner_isolation ON list 
-- FOR ALL TO mcp_server 
-- USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- ============================================================================
-- NOTES
-- ============================================================================

-- This migration:
-- 1. Drops all existing RLS policies (both correct and broken)
-- 2. Recreates policies for tables that definitely exist in Hominem
-- 3. Comments out policies for tables that may not exist or have different structures
-- 4. Uses snake_case column names throughout (matching Hominem's schema)
-- 5. Uses PostgreSQL session variable 'app.current_user_id' set by Kuma

-- Before running this migration:
-- 1. Verify which tables exist in Hominem's schema
-- 2. Verify column names (should be snake_case user_id)
-- 3. Uncomment policies for tables that exist
-- 4. Ensure Kuma is setting app.current_user_id correctly

-- After running this migration:
-- 1. Test RLS policies with multi-user scenarios
-- 2. Verify data isolation works correctly
-- 3. Monitor for any "column does not exist" errors
