DO $$
BEGIN
  IF to_regprocedure('public.set_updated_at()') IS NULL THEN
    RAISE EXCEPTION 'function public.set_updated_at() is missing';
  END IF;
END
$$;
