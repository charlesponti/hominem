CREATE TABLE "content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text DEFAULT 'tweet' NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"excerpt" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"tags" json DEFAULT '[]'::json,
	"social_media_metadata" json,
	"seo_metadata" json,
	"user_id" uuid NOT NULL,
	"content_strategy_id" uuid,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) DEFAULT now() NOT NULL,
	"published_at" timestamp(3),
	"scheduled_for" timestamp(3)
);
--> statement-breakpoint
-- ALTER TABLE "users" DROP CONSTRAINT "users_clerk_id_unique";--> statement-breakpoint
-- DROP INDEX "clerk_id_idx";--> statement-breakpoint
-- ALTER TABLE "users" ADD COLUMN "supabase_id" text;--> statement-breakpoint
-- CREATE INDEX "supabase_id_idx" ON "users" USING btree ("supabase_id");--> statement-breakpoint
-- ALTER TABLE "users" DROP COLUMN "clerk_id";--> statement-breakpoint
-- ALTER TABLE "users" ADD CONSTRAINT "users_supabase_id_unique" UNIQUE("supabase_id");

ALTER TABLE "content" ADD CONSTRAINT "content_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content" ADD CONSTRAINT "content_content_strategy_id_content_strategies_id_fk" FOREIGN KEY ("content_strategy_id") REFERENCES "public"."content_strategies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_search_idx" ON "content" USING gin ((
        setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
        setweight(to_tsvector('english', "content"), 'B') ||
        setweight(to_tsvector('english', coalesce("excerpt", '')), 'C') ||
        setweight(to_tsvector('english', coalesce("tags"::text, '')), 'D')
      ));--> statement-breakpoint
CREATE INDEX "content_user_idx" ON "content" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "content_status_idx" ON "content" USING btree ("status");--> statement-breakpoint
CREATE INDEX "content_type_idx" ON "content" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "budget_categories_name_user_id_unique" ON "budget_categories" USING btree ("name","user_id");--> statement-breakpoint
