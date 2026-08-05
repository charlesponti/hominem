-- +goose Up
-- +goose StatementBegin

ALTER TABLE app.people ADD COLUMN aliases jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE app.people p
SET aliases = coalesce(agg.aliases, '[]'::jsonb)
FROM (
  SELECT person_id, jsonb_agg(alias ORDER BY alias) AS aliases
  FROM app.person_aliases
  GROUP BY person_id
) agg
WHERE agg.person_id = p.id;

CREATE INDEX app_people_aliases_idx ON app.people USING gin (aliases);

DROP TABLE app.person_aliases;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

CREATE TABLE app.person_aliases (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES app.people(id) ON DELETE CASCADE,
  alias text NOT NULL CHECK (length(btrim(alias)) > 0),
  createdAt timestamptz NOT NULL DEFAULT now(),
  UNIQUE (person_id, alias)
);

INSERT INTO app.person_aliases (owner_userId, person_id, alias)
SELECT p.owner_userId, p.id, alias.value #>> '{}'
FROM app.people p, jsonb_array_elements(p.aliases) AS alias
WHERE jsonb_array_length(p.aliases) > 0;

DROP INDEX IF EXISTS app.app_people_aliases_idx;
ALTER TABLE app.people DROP COLUMN aliases;

-- +goose StatementEnd
