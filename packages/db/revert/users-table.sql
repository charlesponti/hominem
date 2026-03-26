BEGIN;

DROP TRIGGER IF EXISTS users_updated_at ON public.users;
DROP INDEX IF EXISTS public.users_email_lower_idx;
DROP TABLE IF EXISTS public.users;

COMMIT;
