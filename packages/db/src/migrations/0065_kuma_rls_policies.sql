-- Migration: 0065_kuma_rls_policies
-- Fix RLS policies to use correct column names and context variables for Kuma Integration
-- Date: 2026-02-27
-- This migration recrees RLS policies that were previously run manually

-- Drop existing policies (safe to run again - IF EXISTS handles missing ones)
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

-- Create corrected RLS policies using PostgreSQL session variable set by Kuma
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
