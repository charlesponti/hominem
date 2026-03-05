CREATE TABLE IF NOT EXISTS "contacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "first_name" text NOT NULL,
  "last_name" text,
  "email" text,
  "phone" text,
  "linkedin_url" text,
  "title" text,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS "contact_email_idx" ON "contacts" USING btree ("email");
CREATE INDEX IF NOT EXISTS "contact_user_id_idx" ON "contacts" USING btree ("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'contacts_user_id_fkey'
  ) THEN
    ALTER TABLE "contacts"
      ADD CONSTRAINT "contacts_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contacts'
      AND policyname = 'contacts_tenant_policy'
  ) THEN
    CREATE POLICY "contacts_tenant_policy"
      ON "contacts"
      AS PERMISSIVE
      FOR ALL
      TO public
      USING ((app_is_service_role() OR (user_id = app_current_user_id())))
      WITH CHECK ((app_is_service_role() OR (user_id = app_current_user_id())));
  END IF;
END $$;

ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "type" text DEFAULT 'note' NOT NULL;
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'draft' NOT NULL;
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "excerpt" text;
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "tags" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "mentions" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "analysis" jsonb;
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "publishing_metadata" jsonb;
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "parent_note_id" uuid;
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "version_number" integer DEFAULT 1 NOT NULL;
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "is_latest_version" boolean DEFAULT true NOT NULL;
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "published_at" timestamp with time zone;
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "scheduled_for" timestamp with time zone;

CREATE INDEX IF NOT EXISTS "notes_latest_idx" ON "notes" USING btree ("is_latest_version");
CREATE INDEX IF NOT EXISTS "notes_parent_idx" ON "notes" USING btree ("parent_note_id");
CREATE INDEX IF NOT EXISTS "notes_published_at_idx" ON "notes" USING btree ("published_at");
CREATE INDEX IF NOT EXISTS "notes_status_idx" ON "notes" USING btree ("status");
CREATE INDEX IF NOT EXISTS "notes_type_idx" ON "notes" USING btree ("type");
CREATE INDEX IF NOT EXISTS "notes_version_idx" ON "notes" USING btree ("parent_note_id", "version_number");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notes_parent_fk'
  ) THEN
    ALTER TABLE "notes"
      ADD CONSTRAINT "notes_parent_fk"
      FOREIGN KEY ("parent_note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
