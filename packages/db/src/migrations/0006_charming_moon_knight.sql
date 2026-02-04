CREATE TABLE "health" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"activity_type" text NOT NULL,
	"duration" integer NOT NULL,
	"calories_burned" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
