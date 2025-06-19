-- Add unique constraint on budget categories name per user
-- This ensures that each user can only have one budget category with a given name

ALTER TABLE "budget_categories" 
ADD CONSTRAINT "budget_categories_name_user_id_unique" 
UNIQUE ("name", "user_id");
