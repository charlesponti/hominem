DROP INDEX "better_auth_passkey_credential_idx";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "better_auth_user_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_better_auth_user_id_better_auth_user_id_fk" FOREIGN KEY ("better_auth_user_id") REFERENCES "public"."better_auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE "users" AS "u"
SET "better_auth_user_id" = "s"."provider_subject"
FROM "auth_subjects" AS "s"
WHERE "u"."better_auth_user_id" IS NULL
  AND "u"."primary_auth_subject_id" = "s"."id"
  AND "s"."provider" IN ('apple', 'google')
  AND "s"."unlinked_at" IS NULL;--> statement-breakpoint
UPDATE "users" AS "u"
SET "better_auth_user_id" = "bau"."id"
FROM "better_auth_user" AS "bau"
WHERE "u"."better_auth_user_id" IS NULL
  AND lower("u"."email") = lower("bau"."email");--> statement-breakpoint
CREATE UNIQUE INDEX "better_auth_account_provider_account_uidx" ON "better_auth_account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "better_auth_device_code_device_uidx" ON "better_auth_device_code" USING btree ("device_code");--> statement-breakpoint
CREATE UNIQUE INDEX "better_auth_device_code_user_uidx" ON "better_auth_device_code" USING btree ("user_code");--> statement-breakpoint
CREATE INDEX "better_auth_device_code_user_idx" ON "better_auth_device_code" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "better_auth_passkey_credential_uidx" ON "better_auth_passkey" USING btree ("credential_id");--> statement-breakpoint
CREATE INDEX "users_better_auth_user_id_idx" ON "users" USING btree ("better_auth_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_better_auth_user_id_uidx" ON "users" USING btree ("better_auth_user_id");
