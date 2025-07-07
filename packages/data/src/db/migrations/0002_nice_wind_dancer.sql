CREATE TYPE "public"."event_type" AS ENUM('Transactions', 'Events', 'Birthdays', 'Anniversaries', 'Dates', 'Messages', 'Photos', 'Relationship Start', 'Relationship End', 'Sex', 'Movies', 'Reading');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('checking', 'savings', 'investment', 'credit', 'loan', 'retirement');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('income', 'expense', 'credit', 'debit', 'transfer', 'investment');--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"date" timestamp NOT NULL,
	"place_id" uuid,
	"date_start" timestamp,
	"date_end" timestamp,
	"date_time" timestamp,
	"type" "event_type" NOT NULL,
	"user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "events_tags" (
	"event_id" uuid,
	"tag_id" uuid
);
--> statement-breakpoint
CREATE TABLE "events_transactions" (
	"event_id" uuid,
	"transaction_id" uuid
);
--> statement-breakpoint
CREATE TABLE "events_users" (
	"event_id" uuid,
	"person_id" uuid
);
--> statement-breakpoint
CREATE TABLE "place_visits" (
	"event_id" uuid,
	"place_id" uuid,
	"notes" text,
	"rating" integer,
	"review" text,
	"people" text,
	"user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "chat" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"userId" uuid NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_message" (
	"id" uuid PRIMARY KEY NOT NULL,
	"chatId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" "account_type" NOT NULL,
	"balance" numeric NOT NULL,
	"interest_rate" numeric,
	"minimum_payment" numeric,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount" numeric NOT NULL,
	"date" timestamp NOT NULL,
	"description" text,
	"from_account_id" uuid,
	"to_account_id" uuid,
	"event_id" uuid,
	"investment_details" jsonb,
	"status" text,
	"category" text,
	"parent_category" text,
	"excluded" boolean DEFAULT false,
	"tags" text,
	"account_mask" text,
	"note" text,
	"recurring" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "place_tags" (
	"place_id" uuid,
	"tag_id" uuid
);
--> statement-breakpoint
CREATE TABLE "route_waypoints" (
	"route_id" uuid,
	"latitude" integer NOT NULL,
	"longitude" integer NOT NULL,
	"elevation" integer,
	"timestamp" integer
);
--> statement-breakpoint
CREATE TABLE "transportation_routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"mode" text NOT NULL,
	"start_location_id" uuid NOT NULL,
	"end_location_id" uuid NOT NULL,
	"location" geometry(point) NOT NULL,
	"duration" integer NOT NULL,
	"estimated_distance" integer NOT NULL,
	"estimated_time" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"survey_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"option_id" uuid NOT NULL,
	"survey_id" uuid NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surveys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"user_id" uuid
);
--> statement-breakpoint
ALTER TABLE "place" RENAME COLUMN "googleMapsId" TO "google_maps_id";--> statement-breakpoint
ALTER TABLE "place" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "place" ADD COLUMN "location" geometry(point) NOT NULL;--> statement-breakpoint
ALTER TABLE "place" ADD COLUMN "best_for" text;--> statement-breakpoint
ALTER TABLE "place" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "place" ADD COLUMN "wifi_info" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "photo_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "birthday" text;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_place_id_place_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."place"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events_tags" ADD CONSTRAINT "events_tags_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events_tags" ADD CONSTRAINT "events_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events_transactions" ADD CONSTRAINT "events_transactions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events_transactions" ADD CONSTRAINT "events_transactions_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events_users" ADD CONSTRAINT "events_users_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events_users" ADD CONSTRAINT "events_users_person_id_users_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_visits" ADD CONSTRAINT "place_visits_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_visits" ADD CONSTRAINT "place_visits_place_id_place_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."place"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_visits" ADD CONSTRAINT "place_visits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat" ADD CONSTRAINT "chat_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_chatId_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_from_account_id_finance_accounts_id_fk" FOREIGN KEY ("from_account_id") REFERENCES "public"."finance_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_to_account_id_finance_accounts_id_fk" FOREIGN KEY ("to_account_id") REFERENCES "public"."finance_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_tags" ADD CONSTRAINT "place_tags_place_id_place_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."place"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_tags" ADD CONSTRAINT "place_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_waypoints" ADD CONSTRAINT "route_waypoints_route_id_transportation_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."transportation_routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_options" ADD CONSTRAINT "survey_options_survey_id_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_votes" ADD CONSTRAINT "survey_votes_option_id_survey_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."survey_options"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_votes" ADD CONSTRAINT "survey_votes_survey_id_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_votes" ADD CONSTRAINT "survey_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;