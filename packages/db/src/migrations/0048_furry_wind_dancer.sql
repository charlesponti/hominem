-- First, update all existing rows with null user_id to a valid user id.
-- For this migration, we'll set them to the id of the first user in the users table.

UPDATE "events"
SET "user_id" = (
    SELECT "id" FROM "users" ORDER BY "created_at" LIMIT 1
)
WHERE "user_id" IS NULL;

ALTER TABLE "events" ALTER COLUMN "user_id" SET NOT NULL;
