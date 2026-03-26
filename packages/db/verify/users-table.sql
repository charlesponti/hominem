DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION 'table public.users is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_pkey'
      AND conrelid = 'public.users'::regclass
  ) THEN
    RAISE EXCEPTION 'constraint users_pkey is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_email_key'
      AND conrelid = 'public.users'::regclass
  ) THEN
    RAISE EXCEPTION 'constraint users_email_key is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class
    WHERE oid = 'public.users_email_lower_idx'::regclass
  ) THEN
    RAISE EXCEPTION 'index users_email_lower_idx is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'users_updated_at'
      AND tgrelid = 'public.users'::regclass
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'trigger users_updated_at is missing';
  END IF;
END
$$;
