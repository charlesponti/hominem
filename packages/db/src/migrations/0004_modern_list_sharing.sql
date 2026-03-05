CREATE TABLE IF NOT EXISTS "task_list_collaborators" (
  "list_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "added_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "task_list_collaborators_pkey" PRIMARY KEY("list_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_list_invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "list_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "invited_user_email" text NOT NULL,
  "invited_user_id" uuid,
  "accepted" boolean DEFAULT false NOT NULL,
  "token" text NOT NULL,
  "accepted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "task_list_invites_token_key" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "task_list_collaborators" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "task_list_invites" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_list_collaborators_list_idx" ON "task_list_collaborators" USING btree ("list_id" uuid_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_list_collaborators_user_idx" ON "task_list_collaborators" USING btree ("user_id" uuid_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_list_invites_invited_user_idx" ON "task_list_invites" USING btree ("invited_user_id" uuid_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_list_invites_list_idx" ON "task_list_invites" USING btree ("list_id" uuid_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_list_invites_user_idx" ON "task_list_invites" USING btree ("user_id" uuid_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_list_invites_email_lower_idx" ON "task_list_invites" USING btree (lower(invited_user_email));
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'task_list_collaborators_added_by_user_id_fkey'
  ) THEN
    ALTER TABLE "task_list_collaborators"
      ADD CONSTRAINT "task_list_collaborators_added_by_user_id_fkey"
      FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("id")
      ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'task_list_collaborators_list_id_fkey'
  ) THEN
    ALTER TABLE "task_list_collaborators"
      ADD CONSTRAINT "task_list_collaborators_list_id_fkey"
      FOREIGN KEY ("list_id") REFERENCES "public"."task_lists"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'task_list_collaborators_user_id_fkey'
  ) THEN
    ALTER TABLE "task_list_collaborators"
      ADD CONSTRAINT "task_list_collaborators_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'task_list_invites_invited_user_id_fkey'
  ) THEN
    ALTER TABLE "task_list_invites"
      ADD CONSTRAINT "task_list_invites_invited_user_id_fkey"
      FOREIGN KEY ("invited_user_id") REFERENCES "public"."users"("id")
      ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'task_list_invites_list_id_fkey'
  ) THEN
    ALTER TABLE "task_list_invites"
      ADD CONSTRAINT "task_list_invites_list_id_fkey"
      FOREIGN KEY ("list_id") REFERENCES "public"."task_lists"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'task_list_invites_user_id_fkey'
  ) THEN
    ALTER TABLE "task_list_invites"
      ADD CONSTRAINT "task_list_invites_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'task_list_collaborators'
      AND policyname = 'task_list_collaborators_tenant_policy'
  ) THEN
    CREATE POLICY "task_list_collaborators_tenant_policy"
      ON "task_list_collaborators"
      AS PERMISSIVE
      FOR ALL
      TO public
      USING ((
        app_is_service_role()
        OR user_id = app_current_user_id()
        OR EXISTS (
          SELECT 1
          FROM task_lists tl
          WHERE tl.id = task_list_collaborators.list_id
            AND tl.user_id = app_current_user_id()
        )
      ))
      WITH CHECK ((
        app_is_service_role()
        OR user_id = app_current_user_id()
        OR EXISTS (
          SELECT 1
          FROM task_lists tl
          WHERE tl.id = task_list_collaborators.list_id
            AND tl.user_id = app_current_user_id()
        )
      ));
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'task_list_invites'
      AND policyname = 'task_list_invites_tenant_policy'
  ) THEN
    CREATE POLICY "task_list_invites_tenant_policy"
      ON "task_list_invites"
      AS PERMISSIVE
      FOR ALL
      TO public
      USING ((
        app_is_service_role()
        OR user_id = app_current_user_id()
        OR invited_user_id = app_current_user_id()
        OR EXISTS (
          SELECT 1
          FROM task_lists tl
          WHERE tl.id = task_list_invites.list_id
            AND tl.user_id = app_current_user_id()
        )
      ))
      WITH CHECK ((
        app_is_service_role()
        OR user_id = app_current_user_id()
        OR EXISTS (
          SELECT 1
          FROM task_lists tl
          WHERE tl.id = task_list_invites.list_id
            AND tl.user_id = app_current_user_id()
        )
      ));
  END IF;
END $$;
