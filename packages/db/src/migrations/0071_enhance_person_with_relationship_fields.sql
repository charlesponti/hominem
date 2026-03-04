ALTER TABLE "person" ADD COLUMN "date_started" text;--> statement-breakpoint
ALTER TABLE "person" ADD COLUMN "date_ended" text;--> statement-breakpoint
ALTER TABLE "person" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "person" ADD COLUMN "profession" text;--> statement-breakpoint
ALTER TABLE "person" ADD COLUMN "education" text;--> statement-breakpoint
ALTER TABLE "person" ADD COLUMN "diet" text;--> statement-breakpoint
ALTER TABLE "person" ADD COLUMN "age" integer;--> statement-breakpoint
ALTER TABLE "person" ADD COLUMN "attractiveness_score" integer;--> statement-breakpoint
ALTER TABLE "person" ADD COLUMN "kiss" integer;--> statement-breakpoint
ALTER TABLE "person" ADD COLUMN "sex" integer;--> statement-breakpoint
ALTER TABLE "person" ADD COLUMN "details" text;--> statement-breakpoint
CREATE INDEX "person_profession_idx" ON "person" USING btree ("profession");--> statement-breakpoint
CREATE INDEX "person_location_idx" ON "person" USING btree ("location");