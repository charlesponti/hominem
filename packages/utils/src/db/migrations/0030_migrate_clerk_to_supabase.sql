-- Custom SQL migration file, put your code below! --

-- Rename clerk_id column to supabase_id
ALTER TABLE "users" RENAME COLUMN "clerk_id" TO "supabase_id";

-- Rename the unique constraint
ALTER TABLE "users" RENAME CONSTRAINT "users_clerk_id_unique" TO "users_supabase_id_unique";

-- Drop the old index and create a new one
DROP INDEX IF EXISTS "clerk_id_idx";
CREATE INDEX "supabase_id_idx" ON "users" USING btree ("supabase_id");
