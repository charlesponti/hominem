#!/bin/bash
set -euo pipefail

# Create extension objects on first initialization only.
# The image bundles the packages; this just makes a pulled image turnkey.

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-'EOSQL'
  CREATE SCHEMA IF NOT EXISTS public;

  DO $$
  DECLARE
    extension_name text;
    extension_names text[] := '{pgcrypto,pg_trgm,postgis,pgrouting,fuzzystrmatch,unaccent,intarray,btree_gin,btree_gist,cube,earthdistance,vector}';
  BEGIN
    FOREACH extension_name IN ARRAY extension_names LOOP
      EXECUTE format('CREATE EXTENSION IF NOT EXISTS %I WITH SCHEMA public', extension_name);
      EXECUTE format('ALTER EXTENSION %I SET SCHEMA public', extension_name);
    END LOOP;
  END $$;

  CREATE EXTENSION IF NOT EXISTS postgis_topology;
EOSQL
