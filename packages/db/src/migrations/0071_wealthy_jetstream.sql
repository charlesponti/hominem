CREATE TABLE "possessions_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"possession_id" uuid NOT NULL,
	"container_id" uuid,
	"type" text,
	"timestamp" timestamp with time zone,
	"amount" numeric(10, 2),
	"amount_unit" text,
	"method" text,
	"start_date" date,
	"end_date" date,
	"data" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "possessions_usage" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "possessions_usage" ADD CONSTRAINT "possessions_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "possessions_usage" ADD CONSTRAINT "possessions_usage_possession_id_fkey" FOREIGN KEY ("possession_id") REFERENCES "public"."possessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "possessions_usage" ADD CONSTRAINT "possessions_usage_container_id_fkey" FOREIGN KEY ("container_id") REFERENCES "public"."possession_containers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "possessions_usage_user_idx" ON "possessions_usage" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "possessions_usage_possession_idx" ON "possessions_usage" USING btree ("possession_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "possessions_usage_container_idx" ON "possessions_usage" USING btree ("container_id" uuid_ops);--> statement-breakpoint
CREATE POLICY "possessions_usage_tenant_policy" ON "possessions_usage" AS PERMISSIVE FOR ALL TO public USING ((app_is_service_role() OR (user_id = app_current_user_id()))) WITH CHECK ((app_is_service_role() OR (user_id = app_current_user_id())));