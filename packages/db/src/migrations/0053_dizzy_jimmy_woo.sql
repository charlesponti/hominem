ALTER TABLE "categories" DROP CONSTRAINT "categories_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "events" DROP CONSTRAINT "events_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "job_applications" DROP CONSTRAINT "job_applications_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "job_applications" DROP CONSTRAINT "job_applications_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "budget_goals" ALTER COLUMN "start_date" SET DATA TYPE timestamp(3);--> statement-breakpoint
ALTER TABLE "budget_goals" ALTER COLUMN "end_date" SET DATA TYPE timestamp(3);--> statement-breakpoint
ALTER TABLE "finance_accounts" ALTER COLUMN "last_updated" SET DATA TYPE timestamp(3);--> statement-breakpoint
ALTER TABLE "finance_accounts" ALTER COLUMN "created_at" SET DATA TYPE timestamp(3);--> statement-breakpoint
ALTER TABLE "finance_accounts" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "finance_accounts" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(3);--> statement-breakpoint
ALTER TABLE "finance_accounts" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "financial_institutions" ALTER COLUMN "created_at" SET DATA TYPE timestamp(3);--> statement-breakpoint
ALTER TABLE "financial_institutions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "financial_institutions" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(3);--> statement-breakpoint
ALTER TABLE "financial_institutions" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "health" ALTER COLUMN "created_at" SET DATA TYPE timestamp(3);--> statement-breakpoint
ALTER TABLE "health" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "health" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "plaid_items" ALTER COLUMN "consent_expires_at" SET DATA TYPE timestamp(3);--> statement-breakpoint
ALTER TABLE "plaid_items" ALTER COLUMN "last_synced_at" SET DATA TYPE timestamp(3);--> statement-breakpoint
ALTER TABLE "plaid_items" ALTER COLUMN "created_at" SET DATA TYPE timestamp(3);--> statement-breakpoint
ALTER TABLE "plaid_items" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "plaid_items" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(3);--> statement-breakpoint
ALTER TABLE "plaid_items" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "date" SET DATA TYPE timestamp(3);--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "created_at" SET DATA TYPE timestamp(3);--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(3);--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "health" ADD COLUMN "updated_at" timestamp(3) DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookmark_user_id_idx" ON "bookmark" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_place_id_idx" ON "events" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_status_date_idx" ON "events" USING btree ("status","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_user_id_date_idx" ON "events" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_transactions_event_id_idx" ON "events_transactions" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_transactions_transaction_id_idx" ON "events_transactions" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_users_event_id_idx" ON "events_users" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_users_person_id_idx" ON "events_users" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_accounts_institution_id_idx" ON "finance_accounts" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_accounts_plaid_item_id_idx" ON "finance_accounts" USING btree ("plaid_item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_user_id_idx" ON "health" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_date_idx" ON "health" USING btree ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_applications_company_id_idx" ON "job_applications" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_applications_job_id_idx" ON "job_applications" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_applications_user_id_idx" ON "job_applications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "movie_viewings_movie_id_idx" ON "movie_viewings" USING btree ("movieId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "movie_viewings_user_id_idx" ON "movie_viewings" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plaid_items_institution_id_idx" ON "plaid_items" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_from_account_id_idx" ON "transactions" USING btree ("from_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_to_account_id_idx" ON "transactions" USING btree ("to_account_id");