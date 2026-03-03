-- Fix Better Auth timestamp columns to use timestamp with time zone
-- This allows Drizzle's mode: 'date' to properly handle Date serialization
-- from Better Auth library

ALTER TABLE "better_auth_user" ALTER COLUMN "created_at" TYPE timestamp with time zone;
ALTER TABLE "better_auth_user" ALTER COLUMN "updated_at" TYPE timestamp with time zone;

ALTER TABLE "better_auth_session" ALTER COLUMN "expires_at" TYPE timestamp with time zone;
ALTER TABLE "better_auth_session" ALTER COLUMN "created_at" TYPE timestamp with time zone;
ALTER TABLE "better_auth_session" ALTER COLUMN "updated_at" TYPE timestamp with time zone;

ALTER TABLE "better_auth_account" ALTER COLUMN "access_token_expires_at" TYPE timestamp with time zone;
ALTER TABLE "better_auth_account" ALTER COLUMN "refresh_token_expires_at" TYPE timestamp with time zone;
ALTER TABLE "better_auth_account" ALTER COLUMN "created_at" TYPE timestamp with time zone;
ALTER TABLE "better_auth_account" ALTER COLUMN "updated_at" TYPE timestamp with time zone;

ALTER TABLE "better_auth_verification" ALTER COLUMN "expires_at" TYPE timestamp with time zone;
ALTER TABLE "better_auth_verification" ALTER COLUMN "created_at" TYPE timestamp with time zone;
ALTER TABLE "better_auth_verification" ALTER COLUMN "updated_at" TYPE timestamp with time zone;

ALTER TABLE "better_auth_passkey" ALTER COLUMN "created_at" TYPE timestamp with time zone;

ALTER TABLE "better_auth_api_key" ALTER COLUMN "last_refill_at" TYPE timestamp with time zone;
ALTER TABLE "better_auth_api_key" ALTER COLUMN "last_request" TYPE timestamp with time zone;
ALTER TABLE "better_auth_api_key" ALTER COLUMN "expires_at" TYPE timestamp with time zone;
ALTER TABLE "better_auth_api_key" ALTER COLUMN "created_at" TYPE timestamp with time zone;
ALTER TABLE "better_auth_api_key" ALTER COLUMN "updated_at" TYPE timestamp with time zone;

ALTER TABLE "better_auth_device_code" ALTER COLUMN "expires_at" TYPE timestamp with time zone;
ALTER TABLE "better_auth_device_code" ALTER COLUMN "last_polled_at" TYPE timestamp with time zone;
