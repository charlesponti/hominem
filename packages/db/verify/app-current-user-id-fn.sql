DO $$
BEGIN
  IF to_regprocedure('public.app_current_user_id()') IS NULL THEN
    RAISE EXCEPTION 'function public.app_current_user_id() is missing';
  END IF;
END
$$;
