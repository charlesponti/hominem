-- +goose Up
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updatedAt := now();
  RETURN NEW;
END;
$$;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION auth.current_user_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_userId', true), '')
$$;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION auth.is_service_role()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('app.is_service_role', true), ''), 'false') = 'true'
$$;
-- +goose StatementEnd

-- +goose Down
DROP FUNCTION IF EXISTS auth.is_service_role();
DROP FUNCTION IF EXISTS auth.current_user_id();
DROP FUNCTION IF EXISTS public.set_updated_at();
