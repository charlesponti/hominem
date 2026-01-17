CREATE TYPE "public"."TokenType" AS ENUM('EMAIL', 'API');--> statement-breakpoint
CREATE TYPE "public"."ItemType" AS ENUM('FLIGHT', 'PLACE');--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY NOT NULL,
	"sessionToken" text NOT NULL,
	"userId" uuid NOT NULL,
	"expires" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "token" (
	"id" serial PRIMARY KEY NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) DEFAULT now() NOT NULL,
	"type" "TokenType" NOT NULL,
	"emailToken" text,
	"valid" boolean DEFAULT true NOT NULL,
	"expiration" timestamp(3) NOT NULL,
	"userId" uuid NOT NULL,
	"accessToken" text,
	"refreshToken" text
);
--> statement-breakpoint
CREATE TABLE "verification_token" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookmark" (
	"id" uuid PRIMARY KEY NOT NULL,
	"image" text,
	"title" text NOT NULL,
	"description" text,
	"imageHeight" text,
	"imageWidth" text,
	"locationAddress" text,
	"locationLat" text,
	"locationLng" text,
	"siteName" text NOT NULL,
	"url" text NOT NULL,
	"userId" uuid NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"website" text NOT NULL,
	"industry" text NOT NULL,
	"size" text NOT NULL,
	"location" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"version" text DEFAULT '1' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"content" text NOT NULL,
	"description" text,
	"url" text,
	"type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) DEFAULT now() NOT NULL,
	"itemId" uuid NOT NULL,
	"listId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"itemType" "ItemType" DEFAULT 'PLACE' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_notes" (
	"application_id" uuid NOT NULL,
	"note_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"position" text NOT NULL,
	"resume" text,
	"cover_letter" text,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"link" text,
	"location" text DEFAULT 'Remote' NOT NULL,
	"reference" boolean DEFAULT false NOT NULL,
	"stages" jsonb NOT NULL,
	"status" text DEFAULT 'Applied' NOT NULL,
	"salary_quoted" text,
	"salary_accepted" text,
	"job_posting" text,
	"phone_screen" text,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"salary" jsonb NOT NULL,
	"location" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "list" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"userId" uuid NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "list_invite" (
	"accepted" boolean DEFAULT false NOT NULL,
	"listId" uuid NOT NULL,
	"invitedUserEmail" text NOT NULL,
	"invitedUserId" uuid,
	"userId" uuid NOT NULL,
	CONSTRAINT "list_invite_pkey" PRIMARY KEY("listId","invitedUserEmail")
);
--> statement-breakpoint
CREATE TABLE "user_lists" (
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) DEFAULT now() NOT NULL,
	"listId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	CONSTRAINT "user_lists_pkey" PRIMARY KEY("listId","userId")
);
--> statement-breakpoint
CREATE TABLE "movie" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"image" text NOT NULL,
	"director" text,
	"userId" uuid NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movie_viewings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"movieId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"title" text NOT NULL,
	"tags" json DEFAULT '[]'::json NOT NULL,
	"userId" uuid NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "place" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"address" text,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) DEFAULT now() NOT NULL,
	"userId" uuid NOT NULL,
	"itemId" uuid,
	"googleMapsId" text,
	"types" text[],
	"imageUrl" text,
	"phoneNumber" text,
	"rating" double precision,
	"websiteUri" text,
	"latitude" double precision,
	"longitude" double precision
);
--> statement-breakpoint
CREATE TABLE "activity" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"startTime" timestamp NOT NULL,
	"endTime" timestamp NOT NULL,
	"bookingReference" text,
	"price" text,
	"url" text,
	"notes" text,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) DEFAULT now() NOT NULL,
	"userId" uuid NOT NULL,
	"listId" uuid
);
--> statement-breakpoint
CREATE TABLE "flight" (
	"id" uuid PRIMARY KEY NOT NULL,
	"flightNumber" text NOT NULL,
	"departureAirport" text NOT NULL,
	"departureDate" timestamp NOT NULL,
	"arrivalDate" timestamp NOT NULL,
	"arrivalAirport" text NOT NULL,
	"airline" text NOT NULL,
	"reservationNumber" text NOT NULL,
	"url" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) DEFAULT now() NOT NULL,
	"userId" uuid NOT NULL,
	"listId" uuid
);
--> statement-breakpoint
CREATE TABLE "hotel" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"checkInDate" timestamp NOT NULL,
	"checkOutDate" timestamp NOT NULL,
	"reservationNumber" text NOT NULL,
	"roomType" text NOT NULL,
	"numberOfGuests" text NOT NULL,
	"url" text NOT NULL,
	"phoneNumber" text,
	"price" text,
	"notes" text,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) DEFAULT now() NOT NULL,
	"userId" uuid NOT NULL,
	"listId" uuid
);
--> statement-breakpoint
CREATE TABLE "transport" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"departureLocation" text NOT NULL,
	"arrivalLocation" text NOT NULL,
	"departureTime" timestamp NOT NULL,
	"arrivalTime" timestamp NOT NULL,
	"reservationNumber" text,
	"price" text,
	"url" text,
	"notes" text,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) DEFAULT now() NOT NULL,
	"userId" uuid NOT NULL,
	"listId" uuid
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" timestamp,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"image" text,
	"clerk_id" text,
	"isAdmin" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) DEFAULT now() NOT NULL,
	"emailVerified" timestamp(3),
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "token" ADD CONSTRAINT "token_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "bookmark" ADD CONSTRAINT "bookmark_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_listId_list_id_fk" FOREIGN KEY ("listId") REFERENCES "public"."list"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "application_notes" ADD CONSTRAINT "application_notes_application_id_job_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."job_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_notes" ADD CONSTRAINT "application_notes_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list" ADD CONSTRAINT "list_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "list_invite" ADD CONSTRAINT "list_invite_listId_list_id_fk" FOREIGN KEY ("listId") REFERENCES "public"."list"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "list_invite" ADD CONSTRAINT "list_invite_invitedUserId_user_id_fk" FOREIGN KEY ("invitedUserId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "list_invite" ADD CONSTRAINT "list_invite_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_lists" ADD CONSTRAINT "user_lists_listId_list_id_fk" FOREIGN KEY ("listId") REFERENCES "public"."list"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_lists" ADD CONSTRAINT "user_lists_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "movie_viewings" ADD CONSTRAINT "movie_viewings_movieId_movie_id_fk" FOREIGN KEY ("movieId") REFERENCES "public"."movie"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "movie_viewings" ADD CONSTRAINT "movie_viewings_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "idea_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "place" ADD CONSTRAINT "place_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "place" ADD CONSTRAINT "place_itemId_item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_listId_list_id_fk" FOREIGN KEY ("listId") REFERENCES "public"."list"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "flight" ADD CONSTRAINT "flight_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "flight" ADD CONSTRAINT "flight_listId_list_id_fk" FOREIGN KEY ("listId") REFERENCES "public"."list"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hotel" ADD CONSTRAINT "hotel_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hotel" ADD CONSTRAINT "hotel_listId_list_id_fk" FOREIGN KEY ("listId") REFERENCES "public"."list"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "transport" ADD CONSTRAINT "transport_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "transport" ADD CONSTRAINT "transport_listId_list_id_fk" FOREIGN KEY ("listId") REFERENCES "public"."list"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "session_sessionToken_key" ON "session" USING btree ("sessionToken");--> statement-breakpoint
CREATE UNIQUE INDEX "Token_accessToken_key" ON "token" USING btree ("accessToken");--> statement-breakpoint
CREATE UNIQUE INDEX "Token_emailToken_key" ON "token" USING btree ("emailToken");--> statement-breakpoint
CREATE UNIQUE INDEX "Token_refreshToken_key" ON "token" USING btree ("refreshToken");--> statement-breakpoint
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "verification_token" USING btree ("identifier","token");--> statement-breakpoint
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "verification_token" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "item_listId_itemId_key" ON "item" USING btree ("listId","itemId");--> statement-breakpoint
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "account" USING btree ("provider","providerAccountId");--> statement-breakpoint
CREATE UNIQUE INDEX "User_email_key" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "clerk_id_idx" ON "users" USING btree ("clerk_id");