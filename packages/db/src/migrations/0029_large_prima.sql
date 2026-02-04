CREATE TABLE "vector_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"metadata" text,
	"embedding" vector(1536),
	"user_id" uuid,
	"source" text,
	"source_type" text,
	"title" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "targetValue" integer;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "currentValue" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "unit" text;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "reminderSettings" json;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "goalCategory" text;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "parentGoalId" uuid;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "milestones" json;--> statement-breakpoint
ALTER TABLE "vector_documents" ADD CONSTRAINT "vector_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vector_documents_embedding_idx" ON "vector_documents" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "vector_documents_user_id_idx" ON "vector_documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "vector_documents_source_idx" ON "vector_documents" USING btree ("source");--> statement-breakpoint
CREATE INDEX "vector_documents_source_type_idx" ON "vector_documents" USING btree ("source_type");--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_parentGoalId_activities_id_fk" FOREIGN KEY ("parentGoalId") REFERENCES "public"."activities"("id") ON DELETE no action ON UPDATE no action;