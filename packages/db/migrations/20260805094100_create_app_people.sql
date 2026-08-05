-- +goose Up
-- +goose StatementBegin

CREATE TABLE app.people (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  middle_name text,
  display_name text,
  person_type text,
  profession text,
  education text,
  diet text,
  location text,
  birthdate date,
  birthplace text,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_row_id text,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX app_people_owner_userId_idx ON app.people(owner_userId);
CREATE INDEX app_people_source_row_id_idx ON app.people(source_row_id) WHERE source_row_id IS NOT NULL;

CREATE TABLE app.person_aliases (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES app.people(id) ON DELETE CASCADE,
  alias text NOT NULL CHECK (length(btrim(alias)) > 0),
  createdAt timestamptz NOT NULL DEFAULT now(),
  UNIQUE (person_id, alias)
);

CREATE TABLE app.person_contact_methods (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES app.people(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('email', 'phone', 'address')),
  value text NOT NULL CHECK (length(btrim(value)) > 0),
  is_primary boolean NOT NULL DEFAULT false,
  source text,
  place_id uuid,
  start_date date,
  end_date date,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now(),
  UNIQUE (person_id, kind, value)
);
CREATE INDEX app_person_contact_methods_person_id_idx ON app.person_contact_methods(person_id);

CREATE TABLE app.person_address_rent_history (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  contact_method_id uuid NOT NULL REFERENCES app.person_contact_methods(id) ON DELETE CASCADE,
  effective_date date NOT NULL,
  rent_cents integer NOT NULL CHECK (rent_cents >= 0),
  createdAt timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contact_method_id, effective_date)
);

CREATE TABLE app.person_relationships (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  from_person_id uuid NOT NULL REFERENCES app.people(id) ON DELETE CASCADE,
  to_person_id uuid NOT NULL REFERENCES app.people(id) ON DELETE CASCADE,
  relationship_type text NOT NULL CHECK (length(btrim(relationship_type)) > 0),
  started_at timestamptz,
  ended_at timestamptz,
  notes text,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now(),
  CHECK (from_person_id <> to_person_id),
  CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at),
  UNIQUE (from_person_id, to_person_id, relationship_type)
);

CREATE TABLE app.organizations (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_userId, name)
);

CREATE TABLE app.organization_memberships (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES app.people(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  source text,
  createdAt timestamptz NOT NULL DEFAULT now(),
  UNIQUE (person_id, organization_id)
);

CREATE TRIGGER app_people_set_updated_at
  BEFORE UPDATE ON app.people
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER app_person_contact_methods_set_updated_at
  BEFORE UPDATE ON app.person_contact_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER app_person_relationships_set_updated_at
  BEFORE UPDATE ON app.person_relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER app_organizations_set_updated_at
  BEFORE UPDATE ON app.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE app.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.people FORCE ROW LEVEL SECURITY;
ALTER TABLE app.person_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.person_aliases FORCE ROW LEVEL SECURITY;
ALTER TABLE app.person_contact_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.person_contact_methods FORCE ROW LEVEL SECURITY;
ALTER TABLE app.person_address_rent_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.person_address_rent_history FORCE ROW LEVEL SECURITY;
ALTER TABLE app.person_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.person_relationships FORCE ROW LEVEL SECURITY;
ALTER TABLE app.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE app.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.organization_memberships FORCE ROW LEVEL SECURITY;

CREATE POLICY app_people_owner_policy ON app.people
  FOR ALL
  USING (auth.is_service_role() OR owner_userId = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR owner_userId = auth.current_user_id());

CREATE POLICY app_person_aliases_owner_policy ON app.person_aliases
  FOR ALL
  USING (auth.is_service_role() OR owner_userId = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR owner_userId = auth.current_user_id());

CREATE POLICY app_person_contact_methods_owner_policy ON app.person_contact_methods
  FOR ALL
  USING (auth.is_service_role() OR owner_userId = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR owner_userId = auth.current_user_id());

CREATE POLICY app_person_address_rent_history_owner_policy ON app.person_address_rent_history
  FOR ALL
  USING (auth.is_service_role() OR owner_userId = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR owner_userId = auth.current_user_id());

CREATE POLICY app_person_relationships_owner_policy ON app.person_relationships
  FOR ALL
  USING (auth.is_service_role() OR owner_userId = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR owner_userId = auth.current_user_id());

CREATE POLICY app_organizations_owner_policy ON app.organizations
  FOR ALL
  USING (auth.is_service_role() OR owner_userId = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR owner_userId = auth.current_user_id());

CREATE POLICY app_organization_memberships_owner_policy ON app.organization_memberships
  FOR ALL
  USING (auth.is_service_role() OR owner_userId = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR owner_userId = auth.current_user_id());

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS app.organization_memberships;
DROP TABLE IF EXISTS app.organizations;
DROP TABLE IF EXISTS app.person_relationships;
DROP TABLE IF EXISTS app.person_address_rent_history;
DROP TABLE IF EXISTS app.person_contact_methods;
DROP TABLE IF EXISTS app.person_aliases;
DROP TABLE IF EXISTS app.people;

-- +goose StatementEnd
