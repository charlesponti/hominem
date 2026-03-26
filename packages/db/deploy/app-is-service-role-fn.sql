BEGIN;

CREATE FUNCTION public.app_is_service_role() RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('app.is_service_role', true), '')::boolean, false)
$$;

COMMIT;
