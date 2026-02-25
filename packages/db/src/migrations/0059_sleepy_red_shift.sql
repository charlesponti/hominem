CREATE TYPE "public"."auth_provider" AS ENUM('apple', 'google', 'passkey');--> statement-breakpoint
CREATE TYPE "public"."auth_device_code_status" AS ENUM('pending', 'approved', 'denied', 'expired');--> statement-breakpoint
CREATE TABLE "auth_device_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_code_hash" text NOT NULL,
	"user_code" text NOT NULL,
	"client_id" text NOT NULL,
	"scope" text,
	"expires_at" timestamp(3) NOT NULL,
	"interval_sec" integer DEFAULT 5 NOT NULL,
	"status" "auth_device_code_status" DEFAULT 'pending' NOT NULL,
	"subject_id" uuid
);
--> statement-breakpoint
CREATE TABLE "auth_passkeys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"credential_id" text NOT NULL,
	"public_key" text NOT NULL,
	"sign_count" integer DEFAULT 0 NOT NULL,
	"transports" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"last_used_at" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "auth_refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"parent_id" uuid,
	"expires_at" timestamp(3) NOT NULL,
	"used_at" timestamp(3),
	"revoked_at" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_state" text NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"last_seen_at" timestamp(3) DEFAULT now() NOT NULL,
	"revoked_at" timestamp(3),
	"acr" text,
	"amr" text[],
	"ip_hash" text,
	"user_agent_hash" text
);
--> statement-breakpoint
CREATE TABLE "auth_subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "auth_provider" NOT NULL,
	"provider_subject" text NOT NULL,
	"linked_at" timestamp(3) DEFAULT now() NOT NULL,
	"unlinked_at" timestamp(3),
	"is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "supabase_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "primary_auth_subject_id" uuid;--> statement-breakpoint
ALTER TABLE "auth_device_codes" ADD CONSTRAINT "auth_device_codes_subject_id_auth_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."auth_subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_passkeys" ADD CONSTRAINT "auth_passkeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_refresh_tokens" ADD CONSTRAINT "auth_refresh_tokens_session_id_auth_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."auth_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_subjects" ADD CONSTRAINT "auth_subjects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_device_code_hash_uidx" ON "auth_device_codes" USING btree ("device_code_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_device_user_code_uidx" ON "auth_device_codes" USING btree ("user_code");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_passkey_credential_uidx" ON "auth_passkeys" USING btree ("credential_id");--> statement-breakpoint
CREATE INDEX "auth_passkey_user_idx" ON "auth_passkeys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_refresh_family_idx" ON "auth_refresh_tokens" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "auth_refresh_hash_idx" ON "auth_refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "auth_session_user_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_session_state_idx" ON "auth_sessions" USING btree ("session_state");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_subject_provider_subject_uidx" ON "auth_subjects" USING btree ("provider","provider_subject");--> statement-breakpoint
CREATE INDEX "auth_subject_user_idx" ON "auth_subjects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_primary_auth_subject_id_idx" ON "users" USING btree ("primary_auth_subject_id");
