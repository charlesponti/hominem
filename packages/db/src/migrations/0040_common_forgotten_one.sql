ALTER TABLE "list_invite" ADD COLUMN "token" text DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "list_invite" ADD COLUMN "createdAt" timestamp(3) DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "list_invite" ADD COLUMN "updatedAt" timestamp(3) DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "list_invite_token_unique" ON "list_invite" USING btree ("token");