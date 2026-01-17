CREATE TYPE "public"."institution_status" AS ENUM('active', 'error', 'pending_expiration', 'revoked');--> statement-breakpoint
ALTER TYPE "public"."account_type" ADD VALUE 'depository';--> statement-breakpoint
ALTER TYPE "public"."account_type" ADD VALUE 'brokerage';--> statement-breakpoint
ALTER TYPE "public"."account_type" ADD VALUE 'other';--> statement-breakpoint
CREATE TABLE "financial_institutions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text,
	"logo" text,
	"primary_color" text,
	"country" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plaid_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" text NOT NULL,
	"access_token" text NOT NULL,
	"institution_id" text NOT NULL,
	"status" "institution_status" DEFAULT 'active' NOT NULL,
	"consent_expires_at" timestamp,
	"transactions_cursor" text,
	"error" text,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "plaid_items_item_id_unique" UNIQUE("item_id")
);
--> statement-breakpoint
ALTER TABLE "finance_accounts" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "finance_accounts" ADD COLUMN "plaid_account_id" text;--> statement-breakpoint
ALTER TABLE "finance_accounts" ADD COLUMN "plaid_item_id" uuid;--> statement-breakpoint
ALTER TABLE "finance_accounts" ADD COLUMN "mask" text;--> statement-breakpoint
ALTER TABLE "finance_accounts" ADD COLUMN "iso_currency_code" text;--> statement-breakpoint
ALTER TABLE "finance_accounts" ADD COLUMN "subtype" text;--> statement-breakpoint
ALTER TABLE "finance_accounts" ADD COLUMN "official_name" text;--> statement-breakpoint
ALTER TABLE "finance_accounts" ADD COLUMN "limit" numeric;--> statement-breakpoint
ALTER TABLE "finance_accounts" ADD COLUMN "last_updated" timestamp;--> statement-breakpoint
ALTER TABLE "finance_accounts" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "finance_accounts" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "merchant_name" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "plaid_transaction_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "pending" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "payment_channel" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "location" jsonb;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "source" text DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE "plaid_items" ADD CONSTRAINT "plaid_items_institution_id_financial_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."financial_institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_items" ADD CONSTRAINT "plaid_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_accounts" ADD CONSTRAINT "finance_accounts_institution_id_financial_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."financial_institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_accounts" ADD CONSTRAINT "finance_accounts_plaid_item_id_plaid_items_id_fk" FOREIGN KEY ("plaid_item_id") REFERENCES "public"."plaid_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_accounts" ADD CONSTRAINT "finance_accounts_plaid_account_id_unique" UNIQUE("plaid_account_id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_plaid_transaction_id_unique" UNIQUE("plaid_transaction_id");