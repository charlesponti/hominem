CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text,
	"email" text,
	"phone" text,
	"linkedin_url" text,
	"title" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "finance_accounts" DROP CONSTRAINT "finance_accounts_plaid_account_id_unique";--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_plaid_transaction_id_unique";--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_event_id_events_id_fk";
--> statement-breakpoint
ALTER TABLE "place" DROP CONSTRAINT "place_userId_user_id_fk";
--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_user_id_idx" ON "contacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contact_email_idx" ON "contacts" USING btree ("email");--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "event_id";--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "investment_details";--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "plaid_transaction_id";--> statement-breakpoint
ALTER TABLE "place" DROP COLUMN "userId";