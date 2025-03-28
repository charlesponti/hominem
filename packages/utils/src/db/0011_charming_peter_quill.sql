CREATE TABLE "budget_categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"budget_id" uuid,
	"average_monthly_expense" numeric
);
--> statement-breakpoint
CREATE TABLE "budget_goals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"target_amount" numeric NOT NULL,
	"current_amount" numeric NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"category_id" uuid
);
--> statement-breakpoint
ALTER TABLE "finance_accounts" ADD COLUMN "institution_id" text;--> statement-breakpoint
ALTER TABLE "finance_accounts" ADD COLUMN "meta" jsonb;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "account_id" uuid;--> statement-breakpoint
ALTER TABLE "budget_goals" ADD CONSTRAINT "budget_goals_category_id_budget_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."budget_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_finance_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."finance_accounts"("id") ON DELETE no action ON UPDATE no action;