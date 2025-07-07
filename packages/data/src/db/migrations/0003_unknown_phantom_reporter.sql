CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" varchar(100),
	"description" text NOT NULL,
	"type" text,
	"duration" integer,
	"durationType" text,
	"interval" text NOT NULL,
	"score" integer,
	"metrics" json NOT NULL,
	"startDate" timestamp NOT NULL,
	"endDate" timestamp NOT NULL,
	"isCompleted" boolean DEFAULT false,
	"lastPerformed" timestamp NOT NULL,
	"priority" integer NOT NULL,
	"dependencies" json NOT NULL,
	"resources" json NOT NULL,
	"notes" text NOT NULL,
	"dueDate" timestamp NOT NULL,
	"status" text,
	"recurrenceRule" text NOT NULL,
	"completedInstances" integer NOT NULL,
	"streakCount" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"hometown" text,
	"country" text,
	"band_members" integer DEFAULT 1 NOT NULL,
	"genres" text[] NOT NULL,
	"average_ticket_price" numeric(10, 2) NOT NULL,
	"average_performance_attendance" integer,
	"sells_merchandise" boolean DEFAULT false NOT NULL,
	"average_merchandise_price" numeric(10, 2),
	"image_url" text,
	"website_url" text,
	"spotify_followers" integer DEFAULT 0,
	"spotify_url" text,
	"spotify_id" text NOT NULL,
	"spotify_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "artists_slug_unique" UNIQUE("slug"),
	CONSTRAINT "artists_spotify_id_unique" UNIQUE("spotify_id")
);
--> statement-breakpoint
CREATE TABLE "user_artists" (
	"user_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"rating" integer DEFAULT 1,
	"last_listened_at" timestamp,
	"notifications_enabled" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_artist_pk" PRIMARY KEY("user_id","artist_id")
);
--> statement-breakpoint
ALTER TABLE "user_artists" ADD CONSTRAINT "user_artists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_artists" ADD CONSTRAINT "user_artists_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artist_name_idx" ON "artists" USING btree ("name");--> statement-breakpoint
CREATE INDEX "spotify_id_idx" ON "artists" USING btree ("spotify_id");--> statement-breakpoint
CREATE INDEX "genres_idx" ON "artists" USING btree ("genres");--> statement-breakpoint
CREATE INDEX "user_id_idx" ON "user_artists" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "artist_id_idx" ON "user_artists" USING btree ("artist_id");