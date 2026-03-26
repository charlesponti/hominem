DO $$
BEGIN
  IF to_regprocedure('public.app_is_service_role()') IS NULL THEN
    RAISE EXCEPTION 'function public.app_is_service_role() is missing';
  END IF;
END
$$;
