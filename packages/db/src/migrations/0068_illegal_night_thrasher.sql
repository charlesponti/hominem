CREATE TYPE "public"."HealthMeasurementUnit" AS ENUM('MINUTES', 'HOURS', 'CALORIES', 'STEPS', 'KILOMETERS', 'MILES', 'KG', 'LBS', 'CM', 'INCHES', 'BPM', 'MMHG', 'MG_DL', 'CELSIUS', 'FAHRENHEIT', 'GRAMS', 'MILLILITERS', 'PERCENTAGE');--> statement-breakpoint
CREATE TYPE "public"."HealthRecordType" AS ENUM('ACTIVITY', 'MEASUREMENT', 'VITALS', 'SLEEP', 'NUTRITION', 'MEDICATION', 'SYMPTOM', 'PROCEDURE');--> statement-breakpoint
CREATE TYPE "public"."LogType" AS ENUM('AUDIT', 'ACTIVITY', 'SYSTEM');--> statement-breakpoint
CREATE TABLE "health_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"record_type" "HealthRecordType" NOT NULL,
	"activity_type" text,
	"duration_minutes" integer,
	"calories_burned" integer,
	"metric_type" text,
	"value" numeric(10, 2),
	"unit" "HealthMeasurementUnit",
	"notes" text,
	"platform" text,
	"recorded_at" timestamp(3) NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"log_type" "LogType" NOT NULL,
	"user_id" uuid,
	"entity_type" text,
	"entity_id" uuid,
	"action" text NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"domain" text,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "person" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"first_name" text,
	"last_name" text,
	"middle_name" text,
	"email" text,
	"phone" text,
	"linkedin_url" text,
	"notes" text,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp(3),
	"refresh_token_expires_at" timestamp(3),
	"scope" text,
	"password" text,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_api_key" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"start" text,
	"prefix" text,
	"key" text NOT NULL,
	"user_id" uuid NOT NULL,
	"refill_interval" integer,
	"refill_amount" integer,
	"last_refill_at" timestamp(3),
	"enabled" boolean DEFAULT true NOT NULL,
	"rate_limit_enabled" boolean DEFAULT true NOT NULL,
	"rate_limit_time_window" integer,
	"rate_limit_max" integer,
	"request_count" integer DEFAULT 0 NOT NULL,
	"remaining" integer,
	"last_request" timestamp(3),
	"expires_at" timestamp(3),
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) DEFAULT now() NOT NULL,
	"permissions" text,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "user_device_code" (
	"id" text PRIMARY KEY NOT NULL,
	"device_code" text NOT NULL,
	"user_code" text NOT NULL,
	"user_id" uuid,
	"expires_at" timestamp(3) NOT NULL,
	"status" text NOT NULL,
	"last_polled_at" timestamp(3),
	"polling_interval" integer,
	"client_id" text,
	"scope" text
);
--> statement-breakpoint
CREATE TABLE "user_passkey" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"public_key" text NOT NULL,
	"user_id" uuid NOT NULL,
	"credential_id" text NOT NULL,
	"counter" integer NOT NULL,
	"device_type" text NOT NULL,
	"backed_up" boolean NOT NULL,
	"transports" text,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"aaguid" text
);
--> statement-breakpoint
CREATE TABLE "user_session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp(3) NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp(3) NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "health_record" ADD CONSTRAINT "health_record_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log" ADD CONSTRAINT "log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person" ADD CONSTRAINT "person_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_account" ADD CONSTRAINT "user_account_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_api_key" ADD CONSTRAINT "user_api_key_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_device_code" ADD CONSTRAINT "user_device_code_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_passkey" ADD CONSTRAINT "user_passkey_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_session" ADD CONSTRAINT "user_session_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "health_record_user_id_idx" ON "health_record" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "health_record_recorded_at_idx" ON "health_record" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "health_record_user_type_idx" ON "health_record" USING btree ("user_id","record_type");--> statement-breakpoint
CREATE INDEX "health_record_user_metric_idx" ON "health_record" USING btree ("user_id","metric_type");--> statement-breakpoint
CREATE INDEX "health_record_user_recorded_idx" ON "health_record" USING btree ("user_id","recorded_at");--> statement-breakpoint
CREATE INDEX "log_user_id_idx" ON "log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "log_entity_type_entity_id_idx" ON "log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "log_created_at_idx" ON "log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "log_user_action_idx" ON "log" USING btree ("user_id","action");--> statement-breakpoint
CREATE INDEX "log_user_log_type_idx" ON "log" USING btree ("user_id","log_type");--> statement-breakpoint
CREATE INDEX "log_domain_idx" ON "log" USING btree ("domain");--> statement-breakpoint
CREATE UNIQUE INDEX "person_user_id_uidx" ON "person" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "person_email_idx" ON "person" USING btree ("email");--> statement-breakpoint
CREATE INDEX "person_name_idx" ON "person" USING btree ("first_name","last_name");--> statement-breakpoint
CREATE INDEX "person_user_id_idx" ON "person" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_account_user_idx" ON "user_account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_account_provider_account_uidx" ON "user_account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "user_api_key_key_idx" ON "user_api_key" USING btree ("key");--> statement-breakpoint
CREATE INDEX "user_api_key_user_idx" ON "user_api_key" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_device_code_device_uidx" ON "user_device_code" USING btree ("device_code");--> statement-breakpoint
CREATE UNIQUE INDEX "user_device_code_user_uidx" ON "user_device_code" USING btree ("user_code");--> statement-breakpoint
CREATE INDEX "user_device_code_user_idx" ON "user_device_code" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_passkey_user_idx" ON "user_passkey" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_passkey_credential_uidx" ON "user_passkey" USING btree ("credential_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_session_token_uidx" ON "user_session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "user_session_user_idx" ON "user_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_verification_identifier_idx" ON "user_verification" USING btree ("identifier");