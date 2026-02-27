ALTER TABLE "better_auth_account" DROP CONSTRAINT "better_auth_account_user_id_better_auth_user_id_fk";--> statement-breakpoint
ALTER TABLE "better_auth_session" DROP CONSTRAINT "better_auth_session_user_id_better_auth_user_id_fk";--> statement-breakpoint
ALTER TABLE "better_auth_user" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "better_auth_user" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "better_auth_account" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "better_auth_account" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "better_auth_account" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "better_auth_session" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "better_auth_session" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "better_auth_session" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "better_auth_verification" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "better_auth_verification" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "better_auth_account" ADD CONSTRAINT "better_auth_account_user_id_better_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."better_auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better_auth_session" ADD CONSTRAINT "better_auth_session_user_id_better_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."better_auth_user"("id") ON DELETE cascade ON UPDATE no action;
