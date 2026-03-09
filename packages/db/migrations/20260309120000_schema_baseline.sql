-- +goose Up
-- +goose StatementBegin
--
-- PostgreSQL database dump
--


-- Dumped from database version 18.3 (Debian 18.3-1.pgdg12+1)
-- Dumped by pg_dump version 18.3 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA drizzle;


--
-- Name: btree_gin; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gin WITH SCHEMA public;


--
-- Name: EXTENSION btree_gin; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION btree_gin IS 'support for indexing common datatypes in GIN';


--
-- Name: btree_gist; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;


--
-- Name: EXTENSION btree_gist; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION btree_gist IS 'support for indexing common datatypes in GiST';


--
-- Name: cube; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS cube WITH SCHEMA public;


--
-- Name: EXTENSION cube; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION cube IS 'data type for multidimensional cubes';


--
-- Name: earthdistance; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS earthdistance WITH SCHEMA public;


--
-- Name: EXTENSION earthdistance; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION earthdistance IS 'calculate great-circle distances on the surface of the Earth';


--
-- Name: fuzzystrmatch; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS fuzzystrmatch WITH SCHEMA public;


--
-- Name: EXTENSION fuzzystrmatch; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION fuzzystrmatch IS 'determine similarities and distance between strings';


--
-- Name: hstore; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS hstore WITH SCHEMA public;


--
-- Name: EXTENSION hstore; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION hstore IS 'data type for storing sets of (key, value) pairs';


--
-- Name: intarray; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS intarray WITH SCHEMA public;


--
-- Name: EXTENSION intarray; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION intarray IS 'functions, operators, and index support for 1-D arrays of integers';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: pgrouting; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgrouting WITH SCHEMA public;


--
-- Name: EXTENSION pgrouting; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgrouting IS 'pgRouting Extension';


--
-- Name: unaccent; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;


--
-- Name: EXTENSION unaccent; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION unaccent IS 'text search dictionary that removes accents';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


--
-- Name: app_current_user_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.app_current_user_id() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::UUID
$$;


--
-- Name: app_is_service_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.app_is_service_role() RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(NULLIF(current_setting('app.is_service_role', true), '')::BOOLEAN, false)
$$;


--
-- Name: default_partition_spill_rows(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.default_partition_spill_rows() RETURNS TABLE(parent_table text, default_partition text, spill_row_count bigint)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  rec RECORD;
  count_sql TEXT;
  row_count BIGINT;
BEGIN
  FOR rec IN
    SELECT
      parent_table,
      partition_name
    FROM (
      SELECT * FROM partition_bounds('music_listening'::regclass)
      UNION ALL SELECT * FROM partition_bounds('video_viewings'::regclass)
      UNION ALL SELECT * FROM partition_bounds('health_records'::regclass)
      UNION ALL SELECT * FROM partition_bounds('finance_transactions'::regclass)
      UNION ALL SELECT * FROM partition_bounds('logs'::regclass)
      UNION ALL SELECT * FROM partition_bounds('searches'::regclass)
    ) b
    WHERE b.is_default = true
  LOOP
    count_sql := format('SELECT count(*)::bigint FROM %I', rec.partition_name);
    EXECUTE count_sql INTO row_count;
    RETURN QUERY SELECT rec.parent_table, rec.partition_name, row_count;
  END LOOP;
END;
$$;


--
-- Name: drop_old_range_partitions(regclass, timestamp with time zone, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.drop_old_range_partitions(p_parent_table regclass, p_keep_from timestamp with time zone, p_dry_run boolean DEFAULT true) RETURNS TABLE(partition_name text, dropped boolean, ddl text)
    LANGUAGE plpgsql
    AS $$
DECLARE
  part RECORD;
  to_value_text TEXT;
  to_value_ts TIMESTAMPTZ;
  drop_sql TEXT;
BEGIN
  FOR part IN
    SELECT
      c.oid::regclass AS child_regclass,
      c.relname AS child_name,
      pg_get_expr(c.relpartbound, c.oid, true) AS part_bound
    FROM pg_inherits i
    JOIN pg_class c ON c.oid = i.inhrelid
    WHERE i.inhparent = p_parent_table
  LOOP
    -- Skip DEFAULT partitions (no TO bound).
    IF part.part_bound ILIKE '%DEFAULT%' THEN
      CONTINUE;
    END IF;

    to_value_text := substring(part.part_bound FROM 'TO \(''([^'']+)''\)');
    IF to_value_text IS NULL THEN
      CONTINUE;
    END IF;

    to_value_ts := to_value_text::timestamptz;
    IF to_value_ts <= p_keep_from THEN
      drop_sql := format('DROP TABLE IF EXISTS %s', part.child_regclass::TEXT);
      IF p_dry_run THEN
        RETURN QUERY SELECT part.child_name::TEXT, false, drop_sql;
      ELSE
        EXECUTE drop_sql;
        RETURN QUERY SELECT part.child_name::TEXT, true, drop_sql;
      END IF;
    END IF;
  END LOOP;
END;
$$;


--
-- Name: ensure_future_partitions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_future_partitions() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  year_start INT;
  month_cursor DATE;
  month_end DATE;
  quarter_cursor DATE;
  quarter_end DATE;
  quarter_num INT;
  y INT;
BEGIN
  year_start := EXTRACT(YEAR FROM NOW())::INT;

  -- Yearly partitions: keep 1 year behind and 3 years ahead.
  FOR y IN (year_start - 1)..(year_start + 3) LOOP
    PERFORM ensure_range_partition('music_listening'::REGCLASS, 'music_listening_' || y, (y || '-01-01'), ((y + 1) || '-01-01'));
    PERFORM ensure_range_partition('video_viewings'::REGCLASS, 'video_viewings_' || y, (y || '-01-01'), ((y + 1) || '-01-01'));
    PERFORM ensure_range_partition('health_records'::REGCLASS, 'health_records_' || y, (y || '-01-01'), ((y + 1) || '-01-01'));
    PERFORM ensure_range_partition('finance_transactions'::REGCLASS, 'finance_transactions_' || y, (y || '-01-01'), ((y + 1) || '-01-01'));
  END LOOP;

  -- Monthly partitions for logs: keep 2 months behind and 18 months ahead.
  month_cursor := (date_trunc('month', now())::date - INTERVAL '2 months')::date;
  FOR y IN 1..21 LOOP
    month_end := (month_cursor + INTERVAL '1 month')::date;
    PERFORM ensure_range_partition(
      'logs'::REGCLASS,
      'logs_' || to_char(month_cursor, 'YYYY_MM'),
      to_char(month_cursor, 'YYYY-MM-DD'),
      to_char(month_end, 'YYYY-MM-DD')
    );
    month_cursor := month_end;
  END LOOP;

  -- Quarterly partitions for searches: keep previous quarter and next 8 quarters.
  quarter_cursor := (date_trunc('quarter', now())::date - INTERVAL '3 months')::date;
  FOR y IN 1..9 LOOP
    quarter_end := (quarter_cursor + INTERVAL '3 months')::date;
    quarter_num := EXTRACT(QUARTER FROM quarter_cursor)::INT;
    PERFORM ensure_range_partition(
      'searches'::REGCLASS,
      'searches_' || to_char(quarter_cursor, 'YYYY') || '_q' || quarter_num,
      to_char(quarter_cursor, 'YYYY-MM-DD'),
      to_char(quarter_end, 'YYYY-MM-DD')
    );
    quarter_cursor := quarter_end;
  END LOOP;
END;
$$;


--
-- Name: ensure_range_partition(regclass, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_range_partition(p_parent_table regclass, p_child_table_name text, p_from_value text, p_to_value text) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF %s FOR VALUES FROM (%L) TO (%L)',
    p_child_table_name,
    p_parent_table::TEXT,
    p_from_value,
    p_to_value
  );
EXCEPTION
  WHEN duplicate_table THEN
    NULL;
END;
$$;


--
-- Name: music_playlist_track_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.music_playlist_track_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE music_playlists SET track_count = track_count + 1 WHERE id = NEW.playlist_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE music_playlists SET track_count = GREATEST(track_count - 1, 0) WHERE id = OLD.playlist_id;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: partition_bounds(regclass); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.partition_bounds(p_parent_table regclass) RETURNS TABLE(parent_table text, partition_name text, is_default boolean, from_value timestamp with time zone, to_value timestamp with time zone)
    LANGUAGE sql STABLE
    AS $$
  SELECT
    p_parent_table::TEXT AS parent_table,
    c.relname::TEXT AS partition_name,
    (pg_get_expr(c.relpartbound, c.oid, true) ILIKE '%DEFAULT%') AS is_default,
    NULLIF(substring(pg_get_expr(c.relpartbound, c.oid, true) FROM 'FROM \(''([^'']+)''\)'), '')::timestamptz AS from_value,
    NULLIF(substring(pg_get_expr(c.relpartbound, c.oid, true) FROM 'TO \(''([^'']+)''\)'), '')::timestamptz AS to_value
  FROM pg_inherits i
  JOIN pg_class c ON c.oid = i.inhrelid
  WHERE i.inhparent = p_parent_table
$$;


--
-- Name: partition_future_coverage(regclass, interval); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.partition_future_coverage(p_parent_table regclass, p_required_horizon interval) RETURNS TABLE(parent_table text, required_until timestamp with time zone, max_partition_to timestamp with time zone, has_coverage boolean, gap_interval interval)
    LANGUAGE sql STABLE
    AS $$
  WITH max_to AS (
    SELECT MAX(to_value) AS max_partition_to
    FROM partition_bounds(p_parent_table)
    WHERE is_default = false
  )
  SELECT
    p_parent_table::TEXT AS parent_table,
    (now() + p_required_horizon) AS required_until,
    m.max_partition_to,
    (m.max_partition_to IS NOT NULL AND m.max_partition_to >= (now() + p_required_horizon)) AS has_coverage,
    CASE
      WHEN m.max_partition_to IS NULL THEN p_required_horizon
      WHEN m.max_partition_to >= (now() + p_required_horizon) THEN interval '0'
      ELSE (now() + p_required_horizon) - m.max_partition_to
    END AS gap_interval
  FROM max_to m
$$;


--
-- Name: places_sync_location(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.places_sync_location() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(
      ST_MakePoint(NEW.longitude::float8, NEW.latitude::float8), 4326
    )::geography;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: run_partition_maintenance(integer, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.run_partition_maintenance(p_retention_months integer DEFAULT 18, p_drop_dry_run boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  cutoff TIMESTAMPTZ;
BEGIN
  PERFORM ensure_future_partitions();

  cutoff := date_trunc('month', now()) - make_interval(months => p_retention_months);

  -- High-volume event streams retention cleanup.
  PERFORM * FROM drop_old_range_partitions('logs'::REGCLASS, cutoff, p_drop_dry_run);
  PERFORM * FROM drop_old_range_partitions('searches'::REGCLASS, cutoff, p_drop_dry_run);
END;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: -
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: -
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: -
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: auth_refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_refresh_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    family_id uuid NOT NULL,
    parent_id uuid,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: auth_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_state text NOT NULL,
    acr text,
    amr jsonb DEFAULT '[]'::jsonb,
    ip_hash text,
    user_agent_hash text,
    created_at timestamp with time zone DEFAULT now(),
    last_seen_at timestamp with time zone DEFAULT now(),
    revoked_at timestamp with time zone
);


--
-- Name: auth_subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_subjects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    provider text NOT NULL,
    provider_subject text NOT NULL,
    is_primary boolean DEFAULT false,
    linked_at timestamp with time zone DEFAULT now(),
    unlinked_at timestamp with time zone
);


--
-- Name: bookmarks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookmarks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    url text NOT NULL,
    title text,
    description text,
    favicon text,
    thumbnail text,
    source text,
    folder text,
    data jsonb DEFAULT '{}'::jsonb,
    search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english'::regconfig, ((((COALESCE(title, ''::text) || ' '::text) || COALESCE(description, ''::text)) || ' '::text) || COALESCE(url, ''::text)))) STORED,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.bookmarks FORCE ROW LEVEL SECURITY;


--
-- Name: budget_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budget_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category_id uuid,
    target_amount numeric(12,2) NOT NULL,
    target_period text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT budget_goals_target_amount_check CHECK ((target_amount >= (0)::numeric))
);

ALTER TABLE ONLY public.budget_goals FORCE ROW LEVEL SECURITY;


--
-- Name: calendar_attendees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_attendees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    person_id uuid,
    email text,
    status text DEFAULT 'needs_action'::text,
    role text DEFAULT 'required'::text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.calendar_attendees FORCE ROW LEVEL SECURITY;


--
-- Name: calendar_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    event_type text NOT NULL,
    title text NOT NULL,
    description text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone,
    all_day boolean DEFAULT false,
    location text,
    location_coords jsonb,
    source text,
    external_id text,
    color text,
    recurring jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english'::regconfig, ((((COALESCE(title, ''::text) || ' '::text) || COALESCE(description, ''::text)) || ' '::text) || COALESCE(location, ''::text)))) STORED,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.calendar_events FORCE ROW LEVEL SECURITY;


--
-- Name: career_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.career_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    job_id uuid NOT NULL,
    applied_at date,
    status text DEFAULT 'applied'::text,
    stage text,
    outcome text,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.career_applications FORCE ROW LEVEL SECURITY;


--
-- Name: career_companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.career_companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    industry text,
    size text,
    website text,
    logo_url text,
    notes text,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.career_companies FORCE ROW LEVEL SECURITY;


--
-- Name: career_interviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.career_interviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    scheduled_at timestamp with time zone,
    format text,
    type text,
    interviewers jsonb DEFAULT '[]'::jsonb,
    feedback text,
    outcome text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.career_interviews FORCE ROW LEVEL SECURITY;


--
-- Name: career_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.career_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    company_id uuid,
    title text NOT NULL,
    location text,
    remote_type text,
    salary_min bigint,
    salary_max bigint,
    salary_currency text DEFAULT 'USD'::text,
    url text,
    status text DEFAULT 'interested'::text,
    notes text,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.career_jobs FORCE ROW LEVEL SECURITY;


--
-- Name: chat; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    user_id uuid NOT NULL,
    note_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chat_message; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_message (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chat_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    files jsonb,
    tool_calls jsonb,
    reasoning text,
    parent_message_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text,
    email text,
    phone text,
    linkedin_url text,
    title text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: finance_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.finance_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    account_type text NOT NULL,
    institution_name text,
    institution_id text,
    balance numeric(12,2) DEFAULT 0,
    currency text DEFAULT 'USD'::text,
    is_active boolean DEFAULT true,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.finance_accounts FORCE ROW LEVEL SECURITY;


--
-- Name: finance_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.finance_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    account_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    transaction_type text NOT NULL,
    category_id uuid,
    category text,
    description text,
    merchant_name text,
    date date NOT NULL,
    date_raw text,
    pending boolean DEFAULT false,
    source text,
    external_id text,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
)
PARTITION BY RANGE (date);

ALTER TABLE ONLY public.finance_transactions FORCE ROW LEVEL SECURITY;


--
-- Name: finance_transactions_2022; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.finance_transactions_2022 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT finance_transactions_id_not_null NOT NULL,
    user_id uuid CONSTRAINT finance_transactions_user_id_not_null NOT NULL,
    account_id uuid CONSTRAINT finance_transactions_account_id_not_null NOT NULL,
    amount numeric(12,2) CONSTRAINT finance_transactions_amount_not_null NOT NULL,
    transaction_type text CONSTRAINT finance_transactions_transaction_type_not_null NOT NULL,
    category_id uuid,
    category text,
    description text,
    merchant_name text,
    date date CONSTRAINT finance_transactions_date_not_null NOT NULL,
    date_raw text,
    pending boolean DEFAULT false,
    source text,
    external_id text,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: finance_transactions_2023; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.finance_transactions_2023 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT finance_transactions_id_not_null NOT NULL,
    user_id uuid CONSTRAINT finance_transactions_user_id_not_null NOT NULL,
    account_id uuid CONSTRAINT finance_transactions_account_id_not_null NOT NULL,
    amount numeric(12,2) CONSTRAINT finance_transactions_amount_not_null NOT NULL,
    transaction_type text CONSTRAINT finance_transactions_transaction_type_not_null NOT NULL,
    category_id uuid,
    category text,
    description text,
    merchant_name text,
    date date CONSTRAINT finance_transactions_date_not_null NOT NULL,
    date_raw text,
    pending boolean DEFAULT false,
    source text,
    external_id text,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: finance_transactions_2024; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.finance_transactions_2024 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT finance_transactions_id_not_null NOT NULL,
    user_id uuid CONSTRAINT finance_transactions_user_id_not_null NOT NULL,
    account_id uuid CONSTRAINT finance_transactions_account_id_not_null NOT NULL,
    amount numeric(12,2) CONSTRAINT finance_transactions_amount_not_null NOT NULL,
    transaction_type text CONSTRAINT finance_transactions_transaction_type_not_null NOT NULL,
    category_id uuid,
    category text,
    description text,
    merchant_name text,
    date date CONSTRAINT finance_transactions_date_not_null NOT NULL,
    date_raw text,
    pending boolean DEFAULT false,
    source text,
    external_id text,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: finance_transactions_2025; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.finance_transactions_2025 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT finance_transactions_id_not_null NOT NULL,
    user_id uuid CONSTRAINT finance_transactions_user_id_not_null NOT NULL,
    account_id uuid CONSTRAINT finance_transactions_account_id_not_null NOT NULL,
    amount numeric(12,2) CONSTRAINT finance_transactions_amount_not_null NOT NULL,
    transaction_type text CONSTRAINT finance_transactions_transaction_type_not_null NOT NULL,
    category_id uuid,
    category text,
    description text,
    merchant_name text,
    date date CONSTRAINT finance_transactions_date_not_null NOT NULL,
    date_raw text,
    pending boolean DEFAULT false,
    source text,
    external_id text,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: finance_transactions_2026; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.finance_transactions_2026 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT finance_transactions_id_not_null NOT NULL,
    user_id uuid CONSTRAINT finance_transactions_user_id_not_null NOT NULL,
    account_id uuid CONSTRAINT finance_transactions_account_id_not_null NOT NULL,
    amount numeric(12,2) CONSTRAINT finance_transactions_amount_not_null NOT NULL,
    transaction_type text CONSTRAINT finance_transactions_transaction_type_not_null NOT NULL,
    category_id uuid,
    category text,
    description text,
    merchant_name text,
    date date CONSTRAINT finance_transactions_date_not_null NOT NULL,
    date_raw text,
    pending boolean DEFAULT false,
    source text,
    external_id text,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: finance_transactions_default; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.finance_transactions_default (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT finance_transactions_id_not_null NOT NULL,
    user_id uuid CONSTRAINT finance_transactions_user_id_not_null NOT NULL,
    account_id uuid CONSTRAINT finance_transactions_account_id_not_null NOT NULL,
    amount numeric(12,2) CONSTRAINT finance_transactions_amount_not_null NOT NULL,
    transaction_type text CONSTRAINT finance_transactions_transaction_type_not_null NOT NULL,
    category_id uuid,
    category text,
    description text,
    merchant_name text,
    date date CONSTRAINT finance_transactions_date_not_null NOT NULL,
    date_raw text,
    pending boolean DEFAULT false,
    source text,
    external_id text,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: financial_institutions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.financial_institutions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.financial_institutions FORCE ROW LEVEL SECURITY;


--
-- Name: goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    target_date timestamp with time zone,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.goals FORCE ROW LEVEL SECURITY;


--
-- Name: health_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    record_type text NOT NULL,
    value numeric(10,2),
    unit text,
    source text,
    metadata jsonb DEFAULT '{}'::jsonb,
    recorded_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
)
PARTITION BY RANGE (recorded_at);

ALTER TABLE ONLY public.health_records FORCE ROW LEVEL SECURITY;


--
-- Name: health_records_2023; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_records_2023 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT health_records_id_not_null NOT NULL,
    user_id uuid CONSTRAINT health_records_user_id_not_null NOT NULL,
    record_type text CONSTRAINT health_records_record_type_not_null NOT NULL,
    value numeric(10,2),
    unit text,
    source text,
    metadata jsonb DEFAULT '{}'::jsonb,
    recorded_at timestamp with time zone CONSTRAINT health_records_recorded_at_not_null NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: health_records_2024; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_records_2024 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT health_records_id_not_null NOT NULL,
    user_id uuid CONSTRAINT health_records_user_id_not_null NOT NULL,
    record_type text CONSTRAINT health_records_record_type_not_null NOT NULL,
    value numeric(10,2),
    unit text,
    source text,
    metadata jsonb DEFAULT '{}'::jsonb,
    recorded_at timestamp with time zone CONSTRAINT health_records_recorded_at_not_null NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: health_records_2025; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_records_2025 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT health_records_id_not_null NOT NULL,
    user_id uuid CONSTRAINT health_records_user_id_not_null NOT NULL,
    record_type text CONSTRAINT health_records_record_type_not_null NOT NULL,
    value numeric(10,2),
    unit text,
    source text,
    metadata jsonb DEFAULT '{}'::jsonb,
    recorded_at timestamp with time zone CONSTRAINT health_records_recorded_at_not_null NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: health_records_2026; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_records_2026 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT health_records_id_not_null NOT NULL,
    user_id uuid CONSTRAINT health_records_user_id_not_null NOT NULL,
    record_type text CONSTRAINT health_records_record_type_not_null NOT NULL,
    value numeric(10,2),
    unit text,
    source text,
    metadata jsonb DEFAULT '{}'::jsonb,
    recorded_at timestamp with time zone CONSTRAINT health_records_recorded_at_not_null NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: health_records_default; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_records_default (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT health_records_id_not_null NOT NULL,
    user_id uuid CONSTRAINT health_records_user_id_not_null NOT NULL,
    record_type text CONSTRAINT health_records_record_type_not_null NOT NULL,
    value numeric(10,2),
    unit text,
    source text,
    metadata jsonb DEFAULT '{}'::jsonb,
    recorded_at timestamp with time zone CONSTRAINT health_records_recorded_at_not_null NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: key_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.key_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    goal_id uuid NOT NULL,
    title text NOT NULL,
    target_value numeric(10,2),
    current_value numeric(10,2),
    unit text,
    due_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.key_results FORCE ROW LEVEL SECURITY;


--
-- Name: logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    entity_type text,
    entity_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
)
PARTITION BY RANGE (created_at);

ALTER TABLE ONLY public.logs FORCE ROW LEVEL SECURITY;


--
-- Name: logs_2025_01; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logs_2025_01 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT logs_id_not_null NOT NULL,
    user_id uuid CONSTRAINT logs_user_id_not_null NOT NULL,
    action text CONSTRAINT logs_action_not_null NOT NULL,
    entity_type text,
    entity_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT logs_created_at_not_null NOT NULL
);


--
-- Name: logs_2025_02; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logs_2025_02 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT logs_id_not_null NOT NULL,
    user_id uuid CONSTRAINT logs_user_id_not_null NOT NULL,
    action text CONSTRAINT logs_action_not_null NOT NULL,
    entity_type text,
    entity_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT logs_created_at_not_null NOT NULL
);


--
-- Name: logs_2025_03; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logs_2025_03 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT logs_id_not_null NOT NULL,
    user_id uuid CONSTRAINT logs_user_id_not_null NOT NULL,
    action text CONSTRAINT logs_action_not_null NOT NULL,
    entity_type text,
    entity_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT logs_created_at_not_null NOT NULL
);


--
-- Name: logs_2025_04; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logs_2025_04 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT logs_id_not_null NOT NULL,
    user_id uuid CONSTRAINT logs_user_id_not_null NOT NULL,
    action text CONSTRAINT logs_action_not_null NOT NULL,
    entity_type text,
    entity_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT logs_created_at_not_null NOT NULL
);


--
-- Name: logs_2025_05; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logs_2025_05 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT logs_id_not_null NOT NULL,
    user_id uuid CONSTRAINT logs_user_id_not_null NOT NULL,
    action text CONSTRAINT logs_action_not_null NOT NULL,
    entity_type text,
    entity_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT logs_created_at_not_null NOT NULL
);


--
-- Name: logs_2025_06; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logs_2025_06 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT logs_id_not_null NOT NULL,
    user_id uuid CONSTRAINT logs_user_id_not_null NOT NULL,
    action text CONSTRAINT logs_action_not_null NOT NULL,
    entity_type text,
    entity_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT logs_created_at_not_null NOT NULL
);


--
-- Name: logs_2025_07; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logs_2025_07 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT logs_id_not_null NOT NULL,
    user_id uuid CONSTRAINT logs_user_id_not_null NOT NULL,
    action text CONSTRAINT logs_action_not_null NOT NULL,
    entity_type text,
    entity_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT logs_created_at_not_null NOT NULL
);


--
-- Name: logs_2025_08; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logs_2025_08 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT logs_id_not_null NOT NULL,
    user_id uuid CONSTRAINT logs_user_id_not_null NOT NULL,
    action text CONSTRAINT logs_action_not_null NOT NULL,
    entity_type text,
    entity_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT logs_created_at_not_null NOT NULL
);


--
-- Name: logs_2025_09; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logs_2025_09 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT logs_id_not_null NOT NULL,
    user_id uuid CONSTRAINT logs_user_id_not_null NOT NULL,
    action text CONSTRAINT logs_action_not_null NOT NULL,
    entity_type text,
    entity_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT logs_created_at_not_null NOT NULL
);


--
-- Name: logs_2025_10; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logs_2025_10 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT logs_id_not_null NOT NULL,
    user_id uuid CONSTRAINT logs_user_id_not_null NOT NULL,
    action text CONSTRAINT logs_action_not_null NOT NULL,
    entity_type text,
    entity_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT logs_created_at_not_null NOT NULL
);


--
-- Name: logs_2025_11; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logs_2025_11 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT logs_id_not_null NOT NULL,
    user_id uuid CONSTRAINT logs_user_id_not_null NOT NULL,
    action text CONSTRAINT logs_action_not_null NOT NULL,
    entity_type text,
    entity_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT logs_created_at_not_null NOT NULL
);


--
-- Name: logs_2025_12; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logs_2025_12 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT logs_id_not_null NOT NULL,
    user_id uuid CONSTRAINT logs_user_id_not_null NOT NULL,
    action text CONSTRAINT logs_action_not_null NOT NULL,
    entity_type text,
    entity_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT logs_created_at_not_null NOT NULL
);


--
-- Name: logs_2026_01; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logs_2026_01 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT logs_id_not_null NOT NULL,
    user_id uuid CONSTRAINT logs_user_id_not_null NOT NULL,
    action text CONSTRAINT logs_action_not_null NOT NULL,
    entity_type text,
    entity_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT logs_created_at_not_null NOT NULL
);


--
-- Name: logs_2026_02; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logs_2026_02 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT logs_id_not_null NOT NULL,
    user_id uuid CONSTRAINT logs_user_id_not_null NOT NULL,
    action text CONSTRAINT logs_action_not_null NOT NULL,
    entity_type text,
    entity_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT logs_created_at_not_null NOT NULL
);


--
-- Name: logs_2026_03; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logs_2026_03 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT logs_id_not_null NOT NULL,
    user_id uuid CONSTRAINT logs_user_id_not_null NOT NULL,
    action text CONSTRAINT logs_action_not_null NOT NULL,
    entity_type text,
    entity_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT logs_created_at_not_null NOT NULL
);


--
-- Name: logs_default; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logs_default (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT logs_id_not_null NOT NULL,
    user_id uuid CONSTRAINT logs_user_id_not_null NOT NULL,
    action text CONSTRAINT logs_action_not_null NOT NULL,
    entity_type text,
    entity_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT logs_created_at_not_null NOT NULL
);


--
-- Name: music_albums; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.music_albums (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    external_id text,
    source text NOT NULL,
    title text NOT NULL,
    artist_name text,
    release_date text,
    album_art_url text,
    genre text,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.music_albums FORCE ROW LEVEL SECURITY;


--
-- Name: music_artists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.music_artists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    external_id text,
    source text NOT NULL,
    name text NOT NULL,
    image_url text,
    genre text,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.music_artists FORCE ROW LEVEL SECURITY;


--
-- Name: music_liked; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.music_liked (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    track_id uuid NOT NULL,
    source text NOT NULL,
    liked_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.music_liked FORCE ROW LEVEL SECURITY;


--
-- Name: music_listening; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.music_listening (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    track_id uuid,
    source text NOT NULL,
    started_at timestamp with time zone NOT NULL,
    ended_at timestamp with time zone,
    duration_seconds integer,
    completed boolean DEFAULT false,
    context_type text,
    context_id text,
    created_at timestamp with time zone DEFAULT now()
)
PARTITION BY RANGE (started_at);

ALTER TABLE ONLY public.music_listening FORCE ROW LEVEL SECURITY;


--
-- Name: music_listening_2023; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.music_listening_2023 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT music_listening_id_not_null NOT NULL,
    user_id uuid CONSTRAINT music_listening_user_id_not_null NOT NULL,
    track_id uuid,
    source text CONSTRAINT music_listening_source_not_null NOT NULL,
    started_at timestamp with time zone CONSTRAINT music_listening_started_at_not_null NOT NULL,
    ended_at timestamp with time zone,
    duration_seconds integer,
    completed boolean DEFAULT false,
    context_type text,
    context_id text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: music_listening_2024; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.music_listening_2024 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT music_listening_id_not_null NOT NULL,
    user_id uuid CONSTRAINT music_listening_user_id_not_null NOT NULL,
    track_id uuid,
    source text CONSTRAINT music_listening_source_not_null NOT NULL,
    started_at timestamp with time zone CONSTRAINT music_listening_started_at_not_null NOT NULL,
    ended_at timestamp with time zone,
    duration_seconds integer,
    completed boolean DEFAULT false,
    context_type text,
    context_id text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: music_listening_2025; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.music_listening_2025 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT music_listening_id_not_null NOT NULL,
    user_id uuid CONSTRAINT music_listening_user_id_not_null NOT NULL,
    track_id uuid,
    source text CONSTRAINT music_listening_source_not_null NOT NULL,
    started_at timestamp with time zone CONSTRAINT music_listening_started_at_not_null NOT NULL,
    ended_at timestamp with time zone,
    duration_seconds integer,
    completed boolean DEFAULT false,
    context_type text,
    context_id text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: music_listening_2026; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.music_listening_2026 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT music_listening_id_not_null NOT NULL,
    user_id uuid CONSTRAINT music_listening_user_id_not_null NOT NULL,
    track_id uuid,
    source text CONSTRAINT music_listening_source_not_null NOT NULL,
    started_at timestamp with time zone CONSTRAINT music_listening_started_at_not_null NOT NULL,
    ended_at timestamp with time zone,
    duration_seconds integer,
    completed boolean DEFAULT false,
    context_type text,
    context_id text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: music_listening_default; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.music_listening_default (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT music_listening_id_not_null NOT NULL,
    user_id uuid CONSTRAINT music_listening_user_id_not_null NOT NULL,
    track_id uuid,
    source text CONSTRAINT music_listening_source_not_null NOT NULL,
    started_at timestamp with time zone CONSTRAINT music_listening_started_at_not_null NOT NULL,
    ended_at timestamp with time zone,
    duration_seconds integer,
    completed boolean DEFAULT false,
    context_type text,
    context_id text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: music_playlist_tracks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.music_playlist_tracks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    playlist_id uuid NOT NULL,
    track_id uuid NOT NULL,
    "position" integer NOT NULL,
    added_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.music_playlist_tracks FORCE ROW LEVEL SECURITY;


--
-- Name: music_playlists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.music_playlists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    external_id text,
    source text NOT NULL,
    name text NOT NULL,
    description text,
    image_url text,
    is_public boolean DEFAULT false,
    track_count integer DEFAULT 0,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.music_playlists FORCE ROW LEVEL SECURITY;


--
-- Name: music_tracks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.music_tracks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    external_id text,
    source text NOT NULL,
    title text NOT NULL,
    artist_name text,
    album_name text,
    album_art_url text,
    duration_seconds integer,
    track_number integer,
    disc_number integer,
    isrc text,
    genre text,
    data jsonb DEFAULT '{}'::jsonb,
    search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple'::regconfig, ((((COALESCE(title, ''::text) || ' '::text) || COALESCE(artist_name, ''::text)) || ' '::text) || COALESCE(album_name, ''::text)))) STORED,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.music_tracks FORCE ROW LEVEL SECURITY;


--
-- Name: note_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.note_shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    note_id uuid NOT NULL,
    shared_with_user_id uuid NOT NULL,
    permission text DEFAULT 'read'::text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.note_shares FORCE ROW LEVEL SECURITY;


--
-- Name: note_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.note_tags (
    note_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text,
    content text,
    source text,
    is_locked boolean DEFAULT false,
    folder text,
    data jsonb DEFAULT '{}'::jsonb,
    search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english'::regconfig, ((COALESCE(title, ''::text) || ' '::text) || COALESCE(content, ''::text)))) STORED,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    type text DEFAULT 'note'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    excerpt text,
    mentions jsonb DEFAULT '[]'::jsonb,
    analysis jsonb,
    publishing_metadata jsonb,
    parent_note_id uuid,
    version_number integer DEFAULT 1 NOT NULL,
    is_latest_version boolean DEFAULT true NOT NULL,
    published_at timestamp with time zone,
    scheduled_for timestamp with time zone
);

ALTER TABLE ONLY public.notes FORCE ROW LEVEL SECURITY;


--
-- Name: searches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.searches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    query text NOT NULL,
    results_count integer,
    clicked_result_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
)
PARTITION BY RANGE (created_at);

ALTER TABLE ONLY public.searches FORCE ROW LEVEL SECURITY;


--
-- Name: video_viewings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.video_viewings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    content_type text NOT NULL,
    external_id text,
    source text NOT NULL,
    title text NOT NULL,
    description text,
    thumbnail_url text,
    duration_seconds integer,
    watched_at timestamp with time zone NOT NULL,
    watch_time_seconds integer DEFAULT 0,
    completed boolean DEFAULT false,
    season integer,
    episode integer,
    channel_name text,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
)
PARTITION BY RANGE (watched_at);

ALTER TABLE ONLY public.video_viewings FORCE ROW LEVEL SECURITY;


--
-- Name: partition_audit; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.partition_audit AS
 WITH coverage AS (
         SELECT partition_future_coverage.parent_table,
            partition_future_coverage.required_until,
            partition_future_coverage.max_partition_to,
            partition_future_coverage.has_coverage,
            partition_future_coverage.gap_interval
           FROM public.partition_future_coverage('public.music_listening'::regclass, '1 year'::interval) partition_future_coverage(parent_table, required_until, max_partition_to, has_coverage, gap_interval)
        UNION ALL
         SELECT partition_future_coverage.parent_table,
            partition_future_coverage.required_until,
            partition_future_coverage.max_partition_to,
            partition_future_coverage.has_coverage,
            partition_future_coverage.gap_interval
           FROM public.partition_future_coverage('public.video_viewings'::regclass, '1 year'::interval) partition_future_coverage(parent_table, required_until, max_partition_to, has_coverage, gap_interval)
        UNION ALL
         SELECT partition_future_coverage.parent_table,
            partition_future_coverage.required_until,
            partition_future_coverage.max_partition_to,
            partition_future_coverage.has_coverage,
            partition_future_coverage.gap_interval
           FROM public.partition_future_coverage('public.health_records'::regclass, '1 year'::interval) partition_future_coverage(parent_table, required_until, max_partition_to, has_coverage, gap_interval)
        UNION ALL
         SELECT partition_future_coverage.parent_table,
            partition_future_coverage.required_until,
            partition_future_coverage.max_partition_to,
            partition_future_coverage.has_coverage,
            partition_future_coverage.gap_interval
           FROM public.partition_future_coverage('public.finance_transactions'::regclass, '1 year'::interval) partition_future_coverage(parent_table, required_until, max_partition_to, has_coverage, gap_interval)
        UNION ALL
         SELECT partition_future_coverage.parent_table,
            partition_future_coverage.required_until,
            partition_future_coverage.max_partition_to,
            partition_future_coverage.has_coverage,
            partition_future_coverage.gap_interval
           FROM public.partition_future_coverage('public.logs'::regclass, '6 mons'::interval) partition_future_coverage(parent_table, required_until, max_partition_to, has_coverage, gap_interval)
        UNION ALL
         SELECT partition_future_coverage.parent_table,
            partition_future_coverage.required_until,
            partition_future_coverage.max_partition_to,
            partition_future_coverage.has_coverage,
            partition_future_coverage.gap_interval
           FROM public.partition_future_coverage('public.searches'::regclass, '9 mons'::interval) partition_future_coverage(parent_table, required_until, max_partition_to, has_coverage, gap_interval)
        ), spill AS (
         SELECT default_partition_spill_rows.parent_table,
            default_partition_spill_rows.default_partition,
            default_partition_spill_rows.spill_row_count
           FROM public.default_partition_spill_rows() default_partition_spill_rows(parent_table, default_partition, spill_row_count)
        ), retention AS (
         SELECT 'logs'::text AS parent_table,
            COALESCE(( SELECT min(partition_bounds.from_value) AS min
                   FROM public.partition_bounds('public.logs'::regclass) partition_bounds(parent_table, partition_name, is_default, from_value, to_value)
                  WHERE (partition_bounds.is_default = false)), NULL::timestamp with time zone) AS oldest_partition_from,
            (date_trunc('month'::text, now()) - '1 year 6 mons'::interval) AS retention_cutoff
        UNION ALL
         SELECT 'searches'::text AS parent_table,
            COALESCE(( SELECT min(partition_bounds.from_value) AS min
                   FROM public.partition_bounds('public.searches'::regclass) partition_bounds(parent_table, partition_name, is_default, from_value, to_value)
                  WHERE (partition_bounds.is_default = false)), NULL::timestamp with time zone) AS oldest_partition_from,
            (date_trunc('month'::text, now()) - '1 year 6 mons'::interval) AS retention_cutoff
        )
 SELECT c.parent_table,
    c.required_until,
    c.max_partition_to,
    c.has_coverage,
    c.gap_interval,
    COALESCE(s.spill_row_count, (0)::bigint) AS default_partition_spill_row_count,
    r.oldest_partition_from,
    r.retention_cutoff,
        CASE
            WHEN (r.oldest_partition_from IS NULL) THEN false
            WHEN (r.oldest_partition_from < r.retention_cutoff) THEN true
            ELSE false
        END AS retention_violation
   FROM ((coverage c
     LEFT JOIN spill s ON ((s.parent_table = c.parent_table)))
     LEFT JOIN retention r ON ((r.parent_table = c.parent_table)));


--
-- Name: persons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.persons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_user_id uuid NOT NULL,
    person_type text NOT NULL,
    first_name text,
    last_name text,
    email text,
    phone text,
    avatar_url text,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    date_started timestamp with time zone,
    date_ended timestamp with time zone,
    search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple'::regconfig, ((((((COALESCE(first_name, ''::text) || ' '::text) || COALESCE(last_name, ''::text)) || ' '::text) || COALESCE(email, ''::text)) || ' '::text) || COALESCE(phone, ''::text)))) STORED,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.persons FORCE ROW LEVEL SECURITY;


--
-- Name: places; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.places (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    address text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    location public.geography(Point,4326),
    place_type text,
    rating numeric(2,1),
    notes text,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.places FORCE ROW LEVEL SECURITY;


--
-- Name: plaid_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plaid_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    item_id text NOT NULL,
    institution_id uuid,
    cursor text,
    access_token text,
    status text DEFAULT 'healthy'::text,
    error text,
    last_synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.plaid_items FORCE ROW LEVEL SECURITY;


--
-- Name: possession_containers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.possession_containers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    location text,
    description text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.possession_containers FORCE ROW LEVEL SECURITY;


--
-- Name: possessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.possessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    container_id uuid,
    name text NOT NULL,
    description text,
    category text,
    purchase_date date,
    purchase_price numeric(10,2),
    current_value numeric(10,2),
    condition text,
    location text,
    serial_number text,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.possessions FORCE ROW LEVEL SECURITY;


--
-- Name: possessions_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.possessions_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    possession_id uuid NOT NULL,
    container_id uuid,
    type text,
    "timestamp" timestamp with time zone,
    amount numeric(10,2),
    amount_unit text,
    method text,
    start_date date,
    end_date date,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: schools; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schools (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    degree text,
    field_of_study text,
    start_year integer,
    end_year integer,
    gpa numeric(3,2),
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.schools FORCE ROW LEVEL SECURITY;


--
-- Name: searches_2025_q1; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.searches_2025_q1 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT searches_id_not_null NOT NULL,
    user_id uuid CONSTRAINT searches_user_id_not_null NOT NULL,
    query text CONSTRAINT searches_query_not_null NOT NULL,
    results_count integer,
    clicked_result_id uuid,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT searches_created_at_not_null NOT NULL
);


--
-- Name: searches_2025_q2; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.searches_2025_q2 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT searches_id_not_null NOT NULL,
    user_id uuid CONSTRAINT searches_user_id_not_null NOT NULL,
    query text CONSTRAINT searches_query_not_null NOT NULL,
    results_count integer,
    clicked_result_id uuid,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT searches_created_at_not_null NOT NULL
);


--
-- Name: searches_2025_q3; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.searches_2025_q3 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT searches_id_not_null NOT NULL,
    user_id uuid CONSTRAINT searches_user_id_not_null NOT NULL,
    query text CONSTRAINT searches_query_not_null NOT NULL,
    results_count integer,
    clicked_result_id uuid,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT searches_created_at_not_null NOT NULL
);


--
-- Name: searches_2025_q4; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.searches_2025_q4 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT searches_id_not_null NOT NULL,
    user_id uuid CONSTRAINT searches_user_id_not_null NOT NULL,
    query text CONSTRAINT searches_query_not_null NOT NULL,
    results_count integer,
    clicked_result_id uuid,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT searches_created_at_not_null NOT NULL
);


--
-- Name: searches_2026_q1; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.searches_2026_q1 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT searches_id_not_null NOT NULL,
    user_id uuid CONSTRAINT searches_user_id_not_null NOT NULL,
    query text CONSTRAINT searches_query_not_null NOT NULL,
    results_count integer,
    clicked_result_id uuid,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT searches_created_at_not_null NOT NULL
);


--
-- Name: searches_default; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.searches_default (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT searches_id_not_null NOT NULL,
    user_id uuid CONSTRAINT searches_user_id_not_null NOT NULL,
    query text CONSTRAINT searches_query_not_null NOT NULL,
    results_count integer,
    clicked_result_id uuid,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT searches_created_at_not_null NOT NULL
);


--
-- Name: tag_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tag_shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tag_id uuid NOT NULL,
    shared_with_user_id uuid NOT NULL,
    permission text DEFAULT 'read'::text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.tag_shares FORCE ROW LEVEL SECURITY;


--
-- Name: tagged_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tagged_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tag_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.tagged_items FORCE ROW LEVEL SECURITY;


--
-- Name: tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    group_id text,
    name text NOT NULL,
    emoji_image_url text,
    color text,
    description text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.tags FORCE ROW LEVEL SECURITY;


--
-- Name: task_list_collaborators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_list_collaborators (
    list_id uuid NOT NULL,
    user_id uuid NOT NULL,
    added_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_list_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_list_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    list_id uuid NOT NULL,
    user_id uuid NOT NULL,
    invited_user_email text NOT NULL,
    invited_user_id uuid,
    accepted boolean DEFAULT false NOT NULL,
    token text NOT NULL,
    accepted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_lists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_lists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    color text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.task_lists FORCE ROW LEVEL SECURITY;


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'pending'::text,
    priority text DEFAULT 'medium'::text,
    due_date timestamp with time zone,
    completed_at timestamp with time zone,
    parent_id uuid,
    list_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.tasks FORCE ROW LEVEL SECURITY;


--
-- Name: travel_flights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.travel_flights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    trip_id uuid,
    flight_number text,
    airline text,
    departure_airport text,
    arrival_airport text,
    departure_time timestamp with time zone,
    arrival_time timestamp with time zone,
    confirmation_code text,
    seat text,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.travel_flights FORCE ROW LEVEL SECURITY;


--
-- Name: travel_hotels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.travel_hotels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    trip_id uuid,
    name text NOT NULL,
    address text,
    check_in date,
    check_out date,
    confirmation_code text,
    room_type text,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.travel_hotels FORCE ROW LEVEL SECURITY;


--
-- Name: travel_trips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.travel_trips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    start_date date NOT NULL,
    end_date date,
    status text DEFAULT 'planned'::text,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.travel_trips FORCE ROW LEVEL SECURITY;


--
-- Name: user_account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_account (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    account_id text NOT NULL,
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    access_token text,
    refresh_token text,
    id_token text,
    access_token_expires_at timestamp with time zone,
    refresh_token_expires_at timestamp with time zone,
    scope text,
    password text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_accounts (
    id text NOT NULL,
    user_id uuid NOT NULL,
    account_id text NOT NULL,
    provider text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.user_accounts FORCE ROW LEVEL SECURITY;


--
-- Name: user_api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_api_keys (
    id text NOT NULL,
    user_id uuid,
    name text NOT NULL,
    key_hash text NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.user_api_keys FORCE ROW LEVEL SECURITY;


--
-- Name: user_device_code; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_device_code (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    device_code text NOT NULL,
    user_code text NOT NULL,
    user_id uuid,
    expires_at timestamp with time zone NOT NULL,
    status text NOT NULL,
    last_polled_at timestamp with time zone,
    polling_interval integer,
    client_id text,
    scope text
);


--
-- Name: user_jwks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_jwks (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    public_key text NOT NULL,
    private_key text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone
);


--
-- Name: user_passkey; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_passkey (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    name text,
    public_key text NOT NULL,
    user_id uuid NOT NULL,
    credential_id text NOT NULL,
    counter integer NOT NULL,
    device_type text NOT NULL,
    backed_up boolean NOT NULL,
    transports text,
    created_at timestamp with time zone,
    aaguid text
);


--
-- Name: user_person_relations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_person_relations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    person_id uuid NOT NULL,
    relationship_type text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.user_person_relations FORCE ROW LEVEL SECURITY;


--
-- Name: user_session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_session (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    token text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address text,
    user_agent text,
    user_id uuid NOT NULL
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id text NOT NULL,
    user_id uuid,
    expires_at timestamp with time zone NOT NULL,
    token text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.user_sessions FORCE ROW LEVEL SECURITY;


--
-- Name: user_verification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_verification (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    image text,
    email_verified boolean DEFAULT false NOT NULL,
    is_admin boolean DEFAULT false NOT NULL
);

ALTER TABLE ONLY public.users FORCE ROW LEVEL SECURITY;


--
-- Name: video_channels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.video_channels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    external_id text,
    source text NOT NULL,
    name text NOT NULL,
    handle text,
    avatar_url text,
    subscriber_count integer,
    description text,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.video_channels FORCE ROW LEVEL SECURITY;


--
-- Name: video_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.video_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    channel_id uuid NOT NULL,
    subscribed_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.video_subscriptions FORCE ROW LEVEL SECURITY;


--
-- Name: video_viewings_2023; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.video_viewings_2023 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT video_viewings_id_not_null NOT NULL,
    user_id uuid CONSTRAINT video_viewings_user_id_not_null NOT NULL,
    content_type text CONSTRAINT video_viewings_content_type_not_null NOT NULL,
    external_id text,
    source text CONSTRAINT video_viewings_source_not_null NOT NULL,
    title text CONSTRAINT video_viewings_title_not_null NOT NULL,
    description text,
    thumbnail_url text,
    duration_seconds integer,
    watched_at timestamp with time zone CONSTRAINT video_viewings_watched_at_not_null NOT NULL,
    watch_time_seconds integer DEFAULT 0,
    completed boolean DEFAULT false,
    season integer,
    episode integer,
    channel_name text,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: video_viewings_2024; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.video_viewings_2024 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT video_viewings_id_not_null NOT NULL,
    user_id uuid CONSTRAINT video_viewings_user_id_not_null NOT NULL,
    content_type text CONSTRAINT video_viewings_content_type_not_null NOT NULL,
    external_id text,
    source text CONSTRAINT video_viewings_source_not_null NOT NULL,
    title text CONSTRAINT video_viewings_title_not_null NOT NULL,
    description text,
    thumbnail_url text,
    duration_seconds integer,
    watched_at timestamp with time zone CONSTRAINT video_viewings_watched_at_not_null NOT NULL,
    watch_time_seconds integer DEFAULT 0,
    completed boolean DEFAULT false,
    season integer,
    episode integer,
    channel_name text,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: video_viewings_2025; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.video_viewings_2025 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT video_viewings_id_not_null NOT NULL,
    user_id uuid CONSTRAINT video_viewings_user_id_not_null NOT NULL,
    content_type text CONSTRAINT video_viewings_content_type_not_null NOT NULL,
    external_id text,
    source text CONSTRAINT video_viewings_source_not_null NOT NULL,
    title text CONSTRAINT video_viewings_title_not_null NOT NULL,
    description text,
    thumbnail_url text,
    duration_seconds integer,
    watched_at timestamp with time zone CONSTRAINT video_viewings_watched_at_not_null NOT NULL,
    watch_time_seconds integer DEFAULT 0,
    completed boolean DEFAULT false,
    season integer,
    episode integer,
    channel_name text,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: video_viewings_2026; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.video_viewings_2026 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT video_viewings_id_not_null NOT NULL,
    user_id uuid CONSTRAINT video_viewings_user_id_not_null NOT NULL,
    content_type text CONSTRAINT video_viewings_content_type_not_null NOT NULL,
    external_id text,
    source text CONSTRAINT video_viewings_source_not_null NOT NULL,
    title text CONSTRAINT video_viewings_title_not_null NOT NULL,
    description text,
    thumbnail_url text,
    duration_seconds integer,
    watched_at timestamp with time zone CONSTRAINT video_viewings_watched_at_not_null NOT NULL,
    watch_time_seconds integer DEFAULT 0,
    completed boolean DEFAULT false,
    season integer,
    episode integer,
    channel_name text,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: video_viewings_default; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.video_viewings_default (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT video_viewings_id_not_null NOT NULL,
    user_id uuid CONSTRAINT video_viewings_user_id_not_null NOT NULL,
    content_type text CONSTRAINT video_viewings_content_type_not_null NOT NULL,
    external_id text,
    source text CONSTRAINT video_viewings_source_not_null NOT NULL,
    title text CONSTRAINT video_viewings_title_not_null NOT NULL,
    description text,
    thumbnail_url text,
    duration_seconds integer,
    watched_at timestamp with time zone CONSTRAINT video_viewings_watched_at_not_null NOT NULL,
    watch_time_seconds integer DEFAULT 0,
    completed boolean DEFAULT false,
    season integer,
    episode integer,
    channel_name text,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: finance_transactions_2022; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transactions ATTACH PARTITION public.finance_transactions_2022 FOR VALUES FROM ('2022-01-01') TO ('2023-01-01');


--
-- Name: finance_transactions_2023; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transactions ATTACH PARTITION public.finance_transactions_2023 FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');


--
-- Name: finance_transactions_2024; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transactions ATTACH PARTITION public.finance_transactions_2024 FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');


--
-- Name: finance_transactions_2025; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transactions ATTACH PARTITION public.finance_transactions_2025 FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');


--
-- Name: finance_transactions_2026; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transactions ATTACH PARTITION public.finance_transactions_2026 FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');


--
-- Name: finance_transactions_default; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transactions ATTACH PARTITION public.finance_transactions_default DEFAULT;


--
-- Name: health_records_2023; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_records ATTACH PARTITION public.health_records_2023 FOR VALUES FROM ('2023-01-01 00:00:00+00') TO ('2024-01-01 00:00:00+00');


--
-- Name: health_records_2024; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_records ATTACH PARTITION public.health_records_2024 FOR VALUES FROM ('2024-01-01 00:00:00+00') TO ('2025-01-01 00:00:00+00');


--
-- Name: health_records_2025; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_records ATTACH PARTITION public.health_records_2025 FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2026-01-01 00:00:00+00');


--
-- Name: health_records_2026; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_records ATTACH PARTITION public.health_records_2026 FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');


--
-- Name: health_records_default; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_records ATTACH PARTITION public.health_records_default DEFAULT;


--
-- Name: logs_2025_01; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs ATTACH PARTITION public.logs_2025_01 FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2025-02-01 00:00:00+00');


--
-- Name: logs_2025_02; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs ATTACH PARTITION public.logs_2025_02 FOR VALUES FROM ('2025-02-01 00:00:00+00') TO ('2025-03-01 00:00:00+00');


--
-- Name: logs_2025_03; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs ATTACH PARTITION public.logs_2025_03 FOR VALUES FROM ('2025-03-01 00:00:00+00') TO ('2025-04-01 00:00:00+00');


--
-- Name: logs_2025_04; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs ATTACH PARTITION public.logs_2025_04 FOR VALUES FROM ('2025-04-01 00:00:00+00') TO ('2025-05-01 00:00:00+00');


--
-- Name: logs_2025_05; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs ATTACH PARTITION public.logs_2025_05 FOR VALUES FROM ('2025-05-01 00:00:00+00') TO ('2025-06-01 00:00:00+00');


--
-- Name: logs_2025_06; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs ATTACH PARTITION public.logs_2025_06 FOR VALUES FROM ('2025-06-01 00:00:00+00') TO ('2025-07-01 00:00:00+00');


--
-- Name: logs_2025_07; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs ATTACH PARTITION public.logs_2025_07 FOR VALUES FROM ('2025-07-01 00:00:00+00') TO ('2025-08-01 00:00:00+00');


--
-- Name: logs_2025_08; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs ATTACH PARTITION public.logs_2025_08 FOR VALUES FROM ('2025-08-01 00:00:00+00') TO ('2025-09-01 00:00:00+00');


--
-- Name: logs_2025_09; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs ATTACH PARTITION public.logs_2025_09 FOR VALUES FROM ('2025-09-01 00:00:00+00') TO ('2025-10-01 00:00:00+00');


--
-- Name: logs_2025_10; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs ATTACH PARTITION public.logs_2025_10 FOR VALUES FROM ('2025-10-01 00:00:00+00') TO ('2025-11-01 00:00:00+00');


--
-- Name: logs_2025_11; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs ATTACH PARTITION public.logs_2025_11 FOR VALUES FROM ('2025-11-01 00:00:00+00') TO ('2025-12-01 00:00:00+00');


--
-- Name: logs_2025_12; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs ATTACH PARTITION public.logs_2025_12 FOR VALUES FROM ('2025-12-01 00:00:00+00') TO ('2026-01-01 00:00:00+00');


--
-- Name: logs_2026_01; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs ATTACH PARTITION public.logs_2026_01 FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-02-01 00:00:00+00');


--
-- Name: logs_2026_02; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs ATTACH PARTITION public.logs_2026_02 FOR VALUES FROM ('2026-02-01 00:00:00+00') TO ('2026-03-01 00:00:00+00');


--
-- Name: logs_2026_03; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs ATTACH PARTITION public.logs_2026_03 FOR VALUES FROM ('2026-03-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');


--
-- Name: logs_default; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs ATTACH PARTITION public.logs_default DEFAULT;


--
-- Name: music_listening_2023; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_listening ATTACH PARTITION public.music_listening_2023 FOR VALUES FROM ('2023-01-01 00:00:00+00') TO ('2024-01-01 00:00:00+00');


--
-- Name: music_listening_2024; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_listening ATTACH PARTITION public.music_listening_2024 FOR VALUES FROM ('2024-01-01 00:00:00+00') TO ('2025-01-01 00:00:00+00');


--
-- Name: music_listening_2025; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_listening ATTACH PARTITION public.music_listening_2025 FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2026-01-01 00:00:00+00');


--
-- Name: music_listening_2026; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_listening ATTACH PARTITION public.music_listening_2026 FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');


--
-- Name: music_listening_default; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_listening ATTACH PARTITION public.music_listening_default DEFAULT;


--
-- Name: searches_2025_q1; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.searches ATTACH PARTITION public.searches_2025_q1 FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2025-04-01 00:00:00+00');


--
-- Name: searches_2025_q2; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.searches ATTACH PARTITION public.searches_2025_q2 FOR VALUES FROM ('2025-04-01 00:00:00+00') TO ('2025-07-01 00:00:00+00');


--
-- Name: searches_2025_q3; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.searches ATTACH PARTITION public.searches_2025_q3 FOR VALUES FROM ('2025-07-01 00:00:00+00') TO ('2025-10-01 00:00:00+00');


--
-- Name: searches_2025_q4; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.searches ATTACH PARTITION public.searches_2025_q4 FOR VALUES FROM ('2025-10-01 00:00:00+00') TO ('2026-01-01 00:00:00+00');


--
-- Name: searches_2026_q1; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.searches ATTACH PARTITION public.searches_2026_q1 FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');


--
-- Name: searches_default; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.searches ATTACH PARTITION public.searches_default DEFAULT;


--
-- Name: video_viewings_2023; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_viewings ATTACH PARTITION public.video_viewings_2023 FOR VALUES FROM ('2023-01-01 00:00:00+00') TO ('2024-01-01 00:00:00+00');


--
-- Name: video_viewings_2024; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_viewings ATTACH PARTITION public.video_viewings_2024 FOR VALUES FROM ('2024-01-01 00:00:00+00') TO ('2025-01-01 00:00:00+00');


--
-- Name: video_viewings_2025; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_viewings ATTACH PARTITION public.video_viewings_2025 FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2026-01-01 00:00:00+00');


--
-- Name: video_viewings_2026; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_viewings ATTACH PARTITION public.video_viewings_2026 FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');


--
-- Name: video_viewings_default; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_viewings ATTACH PARTITION public.video_viewings_default DEFAULT;


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: auth_refresh_tokens auth_refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_refresh_tokens
    ADD CONSTRAINT auth_refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: auth_sessions auth_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_pkey PRIMARY KEY (id);


--
-- Name: auth_subjects auth_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_subjects
    ADD CONSTRAINT auth_subjects_pkey PRIMARY KEY (id);


--
-- Name: auth_subjects auth_subjects_provider_provider_subject_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_subjects
    ADD CONSTRAINT auth_subjects_provider_provider_subject_key UNIQUE (provider, provider_subject);


--
-- Name: bookmarks bookmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookmarks
    ADD CONSTRAINT bookmarks_pkey PRIMARY KEY (id);


--
-- Name: bookmarks bookmarks_user_id_url_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookmarks
    ADD CONSTRAINT bookmarks_user_id_url_key UNIQUE (user_id, url);


--
-- Name: budget_goals budget_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_goals
    ADD CONSTRAINT budget_goals_pkey PRIMARY KEY (id);


--
-- Name: budget_goals budget_goals_user_id_category_id_target_period_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_goals
    ADD CONSTRAINT budget_goals_user_id_category_id_target_period_key UNIQUE (user_id, category_id, target_period);


--
-- Name: calendar_attendees calendar_attendees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_attendees
    ADD CONSTRAINT calendar_attendees_pkey PRIMARY KEY (id);


--
-- Name: calendar_events calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);


--
-- Name: career_applications career_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.career_applications
    ADD CONSTRAINT career_applications_pkey PRIMARY KEY (id);


--
-- Name: career_companies career_companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.career_companies
    ADD CONSTRAINT career_companies_pkey PRIMARY KEY (id);


--
-- Name: career_interviews career_interviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.career_interviews
    ADD CONSTRAINT career_interviews_pkey PRIMARY KEY (id);


--
-- Name: career_jobs career_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.career_jobs
    ADD CONSTRAINT career_jobs_pkey PRIMARY KEY (id);


--
-- Name: chat_message chat_message_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_message
    ADD CONSTRAINT chat_message_pkey PRIMARY KEY (id);


--
-- Name: chat chat_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat
    ADD CONSTRAINT chat_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: finance_accounts finance_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_accounts
    ADD CONSTRAINT finance_accounts_pkey PRIMARY KEY (id);


--
-- Name: finance_transactions finance_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transactions
    ADD CONSTRAINT finance_transactions_pkey PRIMARY KEY (id, date);


--
-- Name: finance_transactions_2022 finance_transactions_2022_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transactions_2022
    ADD CONSTRAINT finance_transactions_2022_pkey PRIMARY KEY (id, date);


--
-- Name: finance_transactions_2023 finance_transactions_2023_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transactions_2023
    ADD CONSTRAINT finance_transactions_2023_pkey PRIMARY KEY (id, date);


--
-- Name: finance_transactions_2024 finance_transactions_2024_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transactions_2024
    ADD CONSTRAINT finance_transactions_2024_pkey PRIMARY KEY (id, date);


--
-- Name: finance_transactions_2025 finance_transactions_2025_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transactions_2025
    ADD CONSTRAINT finance_transactions_2025_pkey PRIMARY KEY (id, date);


--
-- Name: finance_transactions_2026 finance_transactions_2026_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transactions_2026
    ADD CONSTRAINT finance_transactions_2026_pkey PRIMARY KEY (id, date);


--
-- Name: finance_transactions_default finance_transactions_default_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transactions_default
    ADD CONSTRAINT finance_transactions_default_pkey PRIMARY KEY (id, date);


--
-- Name: financial_institutions financial_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_institutions
    ADD CONSTRAINT financial_institutions_pkey PRIMARY KEY (id);


--
-- Name: goals goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_pkey PRIMARY KEY (id);


--
-- Name: health_records health_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_records
    ADD CONSTRAINT health_records_pkey PRIMARY KEY (id, recorded_at);


--
-- Name: health_records_2023 health_records_2023_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_records_2023
    ADD CONSTRAINT health_records_2023_pkey PRIMARY KEY (id, recorded_at);


--
-- Name: health_records_2024 health_records_2024_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_records_2024
    ADD CONSTRAINT health_records_2024_pkey PRIMARY KEY (id, recorded_at);


--
-- Name: health_records_2025 health_records_2025_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_records_2025
    ADD CONSTRAINT health_records_2025_pkey PRIMARY KEY (id, recorded_at);


--
-- Name: health_records_2026 health_records_2026_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_records_2026
    ADD CONSTRAINT health_records_2026_pkey PRIMARY KEY (id, recorded_at);


--
-- Name: health_records_default health_records_default_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_records_default
    ADD CONSTRAINT health_records_default_pkey PRIMARY KEY (id, recorded_at);


--
-- Name: key_results key_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.key_results
    ADD CONSTRAINT key_results_pkey PRIMARY KEY (id);


--
-- Name: logs logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs
    ADD CONSTRAINT logs_pkey PRIMARY KEY (id, created_at);


--
-- Name: logs_2025_01 logs_2025_01_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_2025_01
    ADD CONSTRAINT logs_2025_01_pkey PRIMARY KEY (id, created_at);


--
-- Name: logs_2025_02 logs_2025_02_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_2025_02
    ADD CONSTRAINT logs_2025_02_pkey PRIMARY KEY (id, created_at);


--
-- Name: logs_2025_03 logs_2025_03_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_2025_03
    ADD CONSTRAINT logs_2025_03_pkey PRIMARY KEY (id, created_at);


--
-- Name: logs_2025_04 logs_2025_04_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_2025_04
    ADD CONSTRAINT logs_2025_04_pkey PRIMARY KEY (id, created_at);


--
-- Name: logs_2025_05 logs_2025_05_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_2025_05
    ADD CONSTRAINT logs_2025_05_pkey PRIMARY KEY (id, created_at);


--
-- Name: logs_2025_06 logs_2025_06_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_2025_06
    ADD CONSTRAINT logs_2025_06_pkey PRIMARY KEY (id, created_at);


--
-- Name: logs_2025_07 logs_2025_07_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_2025_07
    ADD CONSTRAINT logs_2025_07_pkey PRIMARY KEY (id, created_at);


--
-- Name: logs_2025_08 logs_2025_08_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_2025_08
    ADD CONSTRAINT logs_2025_08_pkey PRIMARY KEY (id, created_at);


--
-- Name: logs_2025_09 logs_2025_09_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_2025_09
    ADD CONSTRAINT logs_2025_09_pkey PRIMARY KEY (id, created_at);


--
-- Name: logs_2025_10 logs_2025_10_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_2025_10
    ADD CONSTRAINT logs_2025_10_pkey PRIMARY KEY (id, created_at);


--
-- Name: logs_2025_11 logs_2025_11_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_2025_11
    ADD CONSTRAINT logs_2025_11_pkey PRIMARY KEY (id, created_at);


--
-- Name: logs_2025_12 logs_2025_12_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_2025_12
    ADD CONSTRAINT logs_2025_12_pkey PRIMARY KEY (id, created_at);


--
-- Name: logs_2026_01 logs_2026_01_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_2026_01
    ADD CONSTRAINT logs_2026_01_pkey PRIMARY KEY (id, created_at);


--
-- Name: logs_2026_02 logs_2026_02_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_2026_02
    ADD CONSTRAINT logs_2026_02_pkey PRIMARY KEY (id, created_at);


--
-- Name: logs_2026_03 logs_2026_03_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_2026_03
    ADD CONSTRAINT logs_2026_03_pkey PRIMARY KEY (id, created_at);


--
-- Name: logs_default logs_default_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_default
    ADD CONSTRAINT logs_default_pkey PRIMARY KEY (id, created_at);


--
-- Name: music_albums music_albums_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_albums
    ADD CONSTRAINT music_albums_pkey PRIMARY KEY (id);


--
-- Name: music_artists music_artists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_artists
    ADD CONSTRAINT music_artists_pkey PRIMARY KEY (id);


--
-- Name: music_liked music_liked_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_liked
    ADD CONSTRAINT music_liked_pkey PRIMARY KEY (id);


--
-- Name: music_liked music_liked_user_id_track_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_liked
    ADD CONSTRAINT music_liked_user_id_track_id_key UNIQUE (user_id, track_id);


--
-- Name: music_listening music_listening_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_listening
    ADD CONSTRAINT music_listening_pkey PRIMARY KEY (id, started_at);


--
-- Name: music_listening_2023 music_listening_2023_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_listening_2023
    ADD CONSTRAINT music_listening_2023_pkey PRIMARY KEY (id, started_at);


--
-- Name: music_listening_2024 music_listening_2024_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_listening_2024
    ADD CONSTRAINT music_listening_2024_pkey PRIMARY KEY (id, started_at);


--
-- Name: music_listening_2025 music_listening_2025_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_listening_2025
    ADD CONSTRAINT music_listening_2025_pkey PRIMARY KEY (id, started_at);


--
-- Name: music_listening_2026 music_listening_2026_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_listening_2026
    ADD CONSTRAINT music_listening_2026_pkey PRIMARY KEY (id, started_at);


--
-- Name: music_listening_default music_listening_default_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_listening_default
    ADD CONSTRAINT music_listening_default_pkey PRIMARY KEY (id, started_at);


--
-- Name: music_playlist_tracks music_playlist_tracks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_playlist_tracks
    ADD CONSTRAINT music_playlist_tracks_pkey PRIMARY KEY (id);


--
-- Name: music_playlist_tracks music_playlist_tracks_playlist_id_track_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_playlist_tracks
    ADD CONSTRAINT music_playlist_tracks_playlist_id_track_id_key UNIQUE (playlist_id, track_id);


--
-- Name: music_playlists music_playlists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_playlists
    ADD CONSTRAINT music_playlists_pkey PRIMARY KEY (id);


--
-- Name: music_tracks music_tracks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_tracks
    ADD CONSTRAINT music_tracks_pkey PRIMARY KEY (id);


--
-- Name: note_shares note_shares_note_id_shared_with_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_shares
    ADD CONSTRAINT note_shares_note_id_shared_with_user_id_key UNIQUE (note_id, shared_with_user_id);


--
-- Name: note_shares note_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_shares
    ADD CONSTRAINT note_shares_pkey PRIMARY KEY (id);


--
-- Name: note_tags note_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_tags
    ADD CONSTRAINT note_tags_pkey PRIMARY KEY (note_id, tag_id);


--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- Name: persons persons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_pkey PRIMARY KEY (id);


--
-- Name: places places_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.places
    ADD CONSTRAINT places_pkey PRIMARY KEY (id);


--
-- Name: plaid_items plaid_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plaid_items
    ADD CONSTRAINT plaid_items_pkey PRIMARY KEY (id);


--
-- Name: plaid_items plaid_items_user_id_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plaid_items
    ADD CONSTRAINT plaid_items_user_id_item_id_key UNIQUE (user_id, item_id);


--
-- Name: possession_containers possession_containers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.possession_containers
    ADD CONSTRAINT possession_containers_pkey PRIMARY KEY (id);


--
-- Name: possessions possessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.possessions
    ADD CONSTRAINT possessions_pkey PRIMARY KEY (id);


--
-- Name: possessions_usage possessions_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.possessions_usage
    ADD CONSTRAINT possessions_usage_pkey PRIMARY KEY (id);


--
-- Name: schools schools_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_pkey PRIMARY KEY (id);


--
-- Name: searches searches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.searches
    ADD CONSTRAINT searches_pkey PRIMARY KEY (id, created_at);


--
-- Name: searches_2025_q1 searches_2025_q1_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.searches_2025_q1
    ADD CONSTRAINT searches_2025_q1_pkey PRIMARY KEY (id, created_at);


--
-- Name: searches_2025_q2 searches_2025_q2_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.searches_2025_q2
    ADD CONSTRAINT searches_2025_q2_pkey PRIMARY KEY (id, created_at);


--
-- Name: searches_2025_q3 searches_2025_q3_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.searches_2025_q3
    ADD CONSTRAINT searches_2025_q3_pkey PRIMARY KEY (id, created_at);


--
-- Name: searches_2025_q4 searches_2025_q4_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.searches_2025_q4
    ADD CONSTRAINT searches_2025_q4_pkey PRIMARY KEY (id, created_at);


--
-- Name: searches_2026_q1 searches_2026_q1_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.searches_2026_q1
    ADD CONSTRAINT searches_2026_q1_pkey PRIMARY KEY (id, created_at);


--
-- Name: searches_default searches_default_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.searches_default
    ADD CONSTRAINT searches_default_pkey PRIMARY KEY (id, created_at);


--
-- Name: tag_shares tag_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag_shares
    ADD CONSTRAINT tag_shares_pkey PRIMARY KEY (id);


--
-- Name: tag_shares tag_shares_tag_id_shared_with_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag_shares
    ADD CONSTRAINT tag_shares_tag_id_shared_with_user_id_key UNIQUE (tag_id, shared_with_user_id);


--
-- Name: tagged_items tagged_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tagged_items
    ADD CONSTRAINT tagged_items_pkey PRIMARY KEY (id);


--
-- Name: tagged_items tagged_items_tag_id_entity_type_entity_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tagged_items
    ADD CONSTRAINT tagged_items_tag_id_entity_type_entity_id_key UNIQUE (tag_id, entity_type, entity_id);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: task_list_collaborators task_list_collaborators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_list_collaborators
    ADD CONSTRAINT task_list_collaborators_pkey PRIMARY KEY (list_id, user_id);


--
-- Name: task_list_invites task_list_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_list_invites
    ADD CONSTRAINT task_list_invites_pkey PRIMARY KEY (id);


--
-- Name: task_list_invites task_list_invites_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_list_invites
    ADD CONSTRAINT task_list_invites_token_key UNIQUE (token);


--
-- Name: task_lists task_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_lists
    ADD CONSTRAINT task_lists_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: travel_flights travel_flights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_flights
    ADD CONSTRAINT travel_flights_pkey PRIMARY KEY (id);


--
-- Name: travel_hotels travel_hotels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_hotels
    ADD CONSTRAINT travel_hotels_pkey PRIMARY KEY (id);


--
-- Name: travel_trips travel_trips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_trips
    ADD CONSTRAINT travel_trips_pkey PRIMARY KEY (id);


--
-- Name: user_account user_account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_account
    ADD CONSTRAINT user_account_pkey PRIMARY KEY (id);


--
-- Name: user_accounts user_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_accounts
    ADD CONSTRAINT user_accounts_pkey PRIMARY KEY (id);


--
-- Name: user_accounts user_accounts_user_id_provider_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_accounts
    ADD CONSTRAINT user_accounts_user_id_provider_account_id_key UNIQUE (user_id, provider, account_id);


--
-- Name: user_api_keys user_api_keys_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_api_keys
    ADD CONSTRAINT user_api_keys_key_hash_key UNIQUE (key_hash);


--
-- Name: user_api_keys user_api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_api_keys
    ADD CONSTRAINT user_api_keys_pkey PRIMARY KEY (id);


--
-- Name: user_device_code user_device_code_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_device_code
    ADD CONSTRAINT user_device_code_pkey PRIMARY KEY (id);


--
-- Name: user_jwks user_jwks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_jwks
    ADD CONSTRAINT user_jwks_pkey PRIMARY KEY (id);


--
-- Name: user_passkey user_passkey_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_passkey
    ADD CONSTRAINT user_passkey_pkey PRIMARY KEY (id);


--
-- Name: user_person_relations user_person_relations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_person_relations
    ADD CONSTRAINT user_person_relations_pkey PRIMARY KEY (id);


--
-- Name: user_person_relations user_person_relations_user_id_person_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_person_relations
    ADD CONSTRAINT user_person_relations_user_id_person_id_key UNIQUE (user_id, person_id);


--
-- Name: user_session user_session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_session
    ADD CONSTRAINT user_session_pkey PRIMARY KEY (id);


--
-- Name: user_session user_session_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_session
    ADD CONSTRAINT user_session_token_key UNIQUE (token);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_token_key UNIQUE (token);


--
-- Name: user_verification user_verification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_verification
    ADD CONSTRAINT user_verification_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: video_channels video_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_channels
    ADD CONSTRAINT video_channels_pkey PRIMARY KEY (id);


--
-- Name: video_subscriptions video_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_subscriptions
    ADD CONSTRAINT video_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: video_subscriptions video_subscriptions_user_id_channel_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_subscriptions
    ADD CONSTRAINT video_subscriptions_user_id_channel_id_key UNIQUE (user_id, channel_id);


--
-- Name: video_viewings video_viewings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_viewings
    ADD CONSTRAINT video_viewings_pkey PRIMARY KEY (id, watched_at);


--
-- Name: video_viewings_2023 video_viewings_2023_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_viewings_2023
    ADD CONSTRAINT video_viewings_2023_pkey PRIMARY KEY (id, watched_at);


--
-- Name: video_viewings_2024 video_viewings_2024_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_viewings_2024
    ADD CONSTRAINT video_viewings_2024_pkey PRIMARY KEY (id, watched_at);


--
-- Name: video_viewings_2025 video_viewings_2025_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_viewings_2025
    ADD CONSTRAINT video_viewings_2025_pkey PRIMARY KEY (id, watched_at);


--
-- Name: video_viewings_2026 video_viewings_2026_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_viewings_2026
    ADD CONSTRAINT video_viewings_2026_pkey PRIMARY KEY (id, watched_at);


--
-- Name: video_viewings_default video_viewings_default_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_viewings_default
    ADD CONSTRAINT video_viewings_default_pkey PRIMARY KEY (id, watched_at);


--
-- Name: auth_refresh_tokens_family_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_refresh_tokens_family_id_idx ON public.auth_refresh_tokens USING btree (family_id);


--
-- Name: auth_refresh_tokens_session_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_refresh_tokens_session_id_idx ON public.auth_refresh_tokens USING btree (session_id);


--
-- Name: auth_sessions_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_sessions_user_id_idx ON public.auth_sessions USING btree (user_id);


--
-- Name: bookmarks_folder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookmarks_folder_idx ON public.bookmarks USING btree (user_id, folder) WHERE (folder IS NOT NULL);


--
-- Name: bookmarks_search_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookmarks_search_idx ON public.bookmarks USING gin (search_vector);


--
-- Name: bookmarks_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookmarks_user_idx ON public.bookmarks USING btree (user_id, created_at DESC);


--
-- Name: budget_goals_category_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX budget_goals_category_id_idx ON public.budget_goals USING btree (category_id);


--
-- Name: budget_goals_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX budget_goals_user_id_idx ON public.budget_goals USING btree (user_id);


--
-- Name: calendar_attendees_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX calendar_attendees_event_idx ON public.calendar_attendees USING btree (event_id);


--
-- Name: calendar_attendees_person_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX calendar_attendees_person_idx ON public.calendar_attendees USING btree (person_id);


--
-- Name: calendar_events_agenda_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX calendar_events_agenda_idx ON public.calendar_events USING btree (user_id, start_time, end_time, all_day) INCLUDE (title, color);


--
-- Name: calendar_events_search_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX calendar_events_search_idx ON public.calendar_events USING gin (search_vector);


--
-- Name: calendar_events_user_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX calendar_events_user_time_idx ON public.calendar_events USING btree (user_id, start_time DESC);


--
-- Name: career_applications_job_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX career_applications_job_idx ON public.career_applications USING btree (job_id);


--
-- Name: career_applications_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX career_applications_user_idx ON public.career_applications USING btree (user_id, stage);


--
-- Name: career_companies_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX career_companies_name_trgm ON public.career_companies USING gin (name public.gin_trgm_ops);


--
-- Name: career_companies_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX career_companies_user_idx ON public.career_companies USING btree (user_id);


--
-- Name: career_interviews_application_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX career_interviews_application_idx ON public.career_interviews USING btree (application_id);


--
-- Name: career_jobs_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX career_jobs_user_idx ON public.career_jobs USING btree (user_id, status);


--
-- Name: chat_message_chat_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chat_message_chat_idx ON public.chat_message USING btree (chat_id);


--
-- Name: chat_message_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chat_message_user_idx ON public.chat_message USING btree (user_id);


--
-- Name: chat_note_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chat_note_idx ON public.chat USING btree (note_id);


--
-- Name: chat_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chat_user_idx ON public.chat USING btree (user_id);


--
-- Name: contact_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contact_email_idx ON public.contacts USING btree (email);


--
-- Name: contact_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contact_user_id_idx ON public.contacts USING btree (user_id);


--
-- Name: finance_accounts_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_accounts_active_idx ON public.finance_accounts USING btree (user_id, account_type) WHERE (is_active = true);


--
-- Name: finance_accounts_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_accounts_user_idx ON public.finance_accounts USING btree (user_id);


--
-- Name: finance_transactions_account_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_account_idx ON ONLY public.finance_transactions USING btree (account_id, date DESC);


--
-- Name: finance_transactions_2022_account_id_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2022_account_id_date_idx ON public.finance_transactions_2022 USING btree (account_id, date DESC);


--
-- Name: finance_transactions_date_brin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_date_brin ON ONLY public.finance_transactions USING brin (date) WITH (pages_per_range='32');


--
-- Name: finance_transactions_2022_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2022_date_idx ON public.finance_transactions_2022 USING brin (date) WITH (pages_per_range='32');


--
-- Name: finance_transactions_user_account_date_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_user_account_date_id_idx ON ONLY public.finance_transactions USING btree (user_id, account_id, date DESC, id DESC);


--
-- Name: finance_transactions_2022_user_id_account_id_date_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2022_user_id_account_id_date_id_idx ON public.finance_transactions_2022 USING btree (user_id, account_id, date DESC, id DESC);


--
-- Name: finance_transactions_user_date_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_user_date_id_idx ON ONLY public.finance_transactions USING btree (user_id, date DESC, id DESC);


--
-- Name: finance_transactions_2022_user_id_date_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2022_user_id_date_id_idx ON public.finance_transactions_2022 USING btree (user_id, date DESC, id DESC);


--
-- Name: finance_transactions_user_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_user_date_idx ON ONLY public.finance_transactions USING btree (user_id, date DESC);


--
-- Name: finance_transactions_2022_user_id_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2022_user_id_date_idx ON public.finance_transactions_2022 USING btree (user_id, date DESC);


--
-- Name: finance_transactions_pending_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_pending_idx ON ONLY public.finance_transactions USING btree (user_id, date DESC) WHERE (pending = true);


--
-- Name: finance_transactions_2022_user_id_date_idx1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2022_user_id_date_idx1 ON public.finance_transactions_2022 USING btree (user_id, date DESC) WHERE (pending = true);


--
-- Name: finance_transactions_2023_account_id_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2023_account_id_date_idx ON public.finance_transactions_2023 USING btree (account_id, date DESC);


--
-- Name: finance_transactions_2023_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2023_date_idx ON public.finance_transactions_2023 USING brin (date) WITH (pages_per_range='32');


--
-- Name: finance_transactions_2023_user_id_account_id_date_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2023_user_id_account_id_date_id_idx ON public.finance_transactions_2023 USING btree (user_id, account_id, date DESC, id DESC);


--
-- Name: finance_transactions_2023_user_id_date_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2023_user_id_date_id_idx ON public.finance_transactions_2023 USING btree (user_id, date DESC, id DESC);


--
-- Name: finance_transactions_2023_user_id_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2023_user_id_date_idx ON public.finance_transactions_2023 USING btree (user_id, date DESC);


--
-- Name: finance_transactions_2023_user_id_date_idx1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2023_user_id_date_idx1 ON public.finance_transactions_2023 USING btree (user_id, date DESC) WHERE (pending = true);


--
-- Name: finance_transactions_2024_account_id_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2024_account_id_date_idx ON public.finance_transactions_2024 USING btree (account_id, date DESC);


--
-- Name: finance_transactions_2024_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2024_date_idx ON public.finance_transactions_2024 USING brin (date) WITH (pages_per_range='32');


--
-- Name: finance_transactions_2024_user_id_account_id_date_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2024_user_id_account_id_date_id_idx ON public.finance_transactions_2024 USING btree (user_id, account_id, date DESC, id DESC);


--
-- Name: finance_transactions_2024_user_id_date_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2024_user_id_date_id_idx ON public.finance_transactions_2024 USING btree (user_id, date DESC, id DESC);


--
-- Name: finance_transactions_2024_user_id_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2024_user_id_date_idx ON public.finance_transactions_2024 USING btree (user_id, date DESC);


--
-- Name: finance_transactions_2024_user_id_date_idx1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2024_user_id_date_idx1 ON public.finance_transactions_2024 USING btree (user_id, date DESC) WHERE (pending = true);


--
-- Name: finance_transactions_2025_account_id_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2025_account_id_date_idx ON public.finance_transactions_2025 USING btree (account_id, date DESC);


--
-- Name: finance_transactions_2025_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2025_date_idx ON public.finance_transactions_2025 USING brin (date) WITH (pages_per_range='32');


--
-- Name: finance_transactions_2025_user_id_account_id_date_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2025_user_id_account_id_date_id_idx ON public.finance_transactions_2025 USING btree (user_id, account_id, date DESC, id DESC);


--
-- Name: finance_transactions_2025_user_id_date_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2025_user_id_date_id_idx ON public.finance_transactions_2025 USING btree (user_id, date DESC, id DESC);


--
-- Name: finance_transactions_2025_user_id_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2025_user_id_date_idx ON public.finance_transactions_2025 USING btree (user_id, date DESC);


--
-- Name: finance_transactions_2025_user_id_date_idx1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2025_user_id_date_idx1 ON public.finance_transactions_2025 USING btree (user_id, date DESC) WHERE (pending = true);


--
-- Name: finance_transactions_2026_account_id_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2026_account_id_date_idx ON public.finance_transactions_2026 USING btree (account_id, date DESC);


--
-- Name: finance_transactions_2026_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2026_date_idx ON public.finance_transactions_2026 USING brin (date) WITH (pages_per_range='32');


--
-- Name: finance_transactions_2026_user_id_account_id_date_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2026_user_id_account_id_date_id_idx ON public.finance_transactions_2026 USING btree (user_id, account_id, date DESC, id DESC);


--
-- Name: finance_transactions_2026_user_id_date_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2026_user_id_date_id_idx ON public.finance_transactions_2026 USING btree (user_id, date DESC, id DESC);


--
-- Name: finance_transactions_2026_user_id_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2026_user_id_date_idx ON public.finance_transactions_2026 USING btree (user_id, date DESC);


--
-- Name: finance_transactions_2026_user_id_date_idx1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_2026_user_id_date_idx1 ON public.finance_transactions_2026 USING btree (user_id, date DESC) WHERE (pending = true);


--
-- Name: finance_transactions_default_account_id_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_default_account_id_date_idx ON public.finance_transactions_default USING btree (account_id, date DESC);


--
-- Name: finance_transactions_default_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_default_date_idx ON public.finance_transactions_default USING brin (date) WITH (pages_per_range='32');


--
-- Name: finance_transactions_default_user_id_account_id_date_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_default_user_id_account_id_date_id_idx ON public.finance_transactions_default USING btree (user_id, account_id, date DESC, id DESC);


--
-- Name: finance_transactions_default_user_id_date_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_default_user_id_date_id_idx ON public.finance_transactions_default USING btree (user_id, date DESC, id DESC);


--
-- Name: finance_transactions_default_user_id_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_default_user_id_date_idx ON public.finance_transactions_default USING btree (user_id, date DESC);


--
-- Name: finance_transactions_default_user_id_date_idx1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_transactions_default_user_id_date_idx1 ON public.finance_transactions_default USING btree (user_id, date DESC) WHERE (pending = true);


--
-- Name: financial_institutions_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX financial_institutions_name_idx ON public.financial_institutions USING btree (name);


--
-- Name: goals_user_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX goals_user_status_idx ON public.goals USING btree (user_id, status);


--
-- Name: health_records_recorded_brin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX health_records_recorded_brin ON ONLY public.health_records USING brin (recorded_at) WITH (pages_per_range='128');


--
-- Name: health_records_2023_recorded_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX health_records_2023_recorded_at_idx ON public.health_records_2023 USING brin (recorded_at) WITH (pages_per_range='128');


--
-- Name: health_records_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX health_records_type_idx ON ONLY public.health_records USING btree (user_id, record_type, recorded_at DESC);


--
-- Name: health_records_2023_user_id_record_type_recorded_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX health_records_2023_user_id_record_type_recorded_at_idx ON public.health_records_2023 USING btree (user_id, record_type, recorded_at DESC);


--
-- Name: health_records_user_recorded_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX health_records_user_recorded_idx ON ONLY public.health_records USING btree (user_id, recorded_at DESC);


--
-- Name: health_records_2023_user_id_recorded_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX health_records_2023_user_id_recorded_at_idx ON public.health_records_2023 USING btree (user_id, recorded_at DESC);


--
-- Name: health_records_2024_recorded_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX health_records_2024_recorded_at_idx ON public.health_records_2024 USING brin (recorded_at) WITH (pages_per_range='128');


--
-- Name: health_records_2024_user_id_record_type_recorded_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX health_records_2024_user_id_record_type_recorded_at_idx ON public.health_records_2024 USING btree (user_id, record_type, recorded_at DESC);


--
-- Name: health_records_2024_user_id_recorded_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX health_records_2024_user_id_recorded_at_idx ON public.health_records_2024 USING btree (user_id, recorded_at DESC);


--
-- Name: health_records_2025_recorded_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX health_records_2025_recorded_at_idx ON public.health_records_2025 USING brin (recorded_at) WITH (pages_per_range='128');


--
-- Name: health_records_2025_user_id_record_type_recorded_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX health_records_2025_user_id_record_type_recorded_at_idx ON public.health_records_2025 USING btree (user_id, record_type, recorded_at DESC);


--
-- Name: health_records_2025_user_id_recorded_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX health_records_2025_user_id_recorded_at_idx ON public.health_records_2025 USING btree (user_id, recorded_at DESC);


--
-- Name: health_records_2026_recorded_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX health_records_2026_recorded_at_idx ON public.health_records_2026 USING brin (recorded_at) WITH (pages_per_range='128');


--
-- Name: health_records_2026_user_id_record_type_recorded_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX health_records_2026_user_id_record_type_recorded_at_idx ON public.health_records_2026 USING btree (user_id, record_type, recorded_at DESC);


--
-- Name: health_records_2026_user_id_recorded_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX health_records_2026_user_id_recorded_at_idx ON public.health_records_2026 USING btree (user_id, recorded_at DESC);


--
-- Name: health_records_default_recorded_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX health_records_default_recorded_at_idx ON public.health_records_default USING brin (recorded_at) WITH (pages_per_range='128');


--
-- Name: health_records_default_user_id_record_type_recorded_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX health_records_default_user_id_record_type_recorded_at_idx ON public.health_records_default USING btree (user_id, record_type, recorded_at DESC);


--
-- Name: health_records_default_user_id_recorded_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX health_records_default_user_id_recorded_at_idx ON public.health_records_default USING btree (user_id, recorded_at DESC);


--
-- Name: key_results_goal_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX key_results_goal_idx ON public.key_results USING btree (goal_id);


--
-- Name: logs_created_brin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_created_brin ON ONLY public.logs USING brin (created_at) WITH (pages_per_range='128');


--
-- Name: logs_2025_01_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_01_created_at_idx ON public.logs_2025_01 USING brin (created_at) WITH (pages_per_range='128');


--
-- Name: logs_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_entity_idx ON ONLY public.logs USING btree (entity_type, entity_id, created_at DESC) WHERE (entity_type IS NOT NULL);


--
-- Name: logs_2025_01_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_01_entity_type_entity_id_created_at_idx ON public.logs_2025_01 USING btree (entity_type, entity_id, created_at DESC) WHERE (entity_type IS NOT NULL);


--
-- Name: logs_user_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_user_created_idx ON ONLY public.logs USING btree (user_id, created_at DESC);


--
-- Name: logs_2025_01_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_01_user_id_created_at_idx ON public.logs_2025_01 USING btree (user_id, created_at DESC);


--
-- Name: logs_2025_02_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_02_created_at_idx ON public.logs_2025_02 USING brin (created_at) WITH (pages_per_range='128');


--
-- Name: logs_2025_02_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_02_entity_type_entity_id_created_at_idx ON public.logs_2025_02 USING btree (entity_type, entity_id, created_at DESC) WHERE (entity_type IS NOT NULL);


--
-- Name: logs_2025_02_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_02_user_id_created_at_idx ON public.logs_2025_02 USING btree (user_id, created_at DESC);


--
-- Name: logs_2025_03_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_03_created_at_idx ON public.logs_2025_03 USING brin (created_at) WITH (pages_per_range='128');


--
-- Name: logs_2025_03_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_03_entity_type_entity_id_created_at_idx ON public.logs_2025_03 USING btree (entity_type, entity_id, created_at DESC) WHERE (entity_type IS NOT NULL);


--
-- Name: logs_2025_03_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_03_user_id_created_at_idx ON public.logs_2025_03 USING btree (user_id, created_at DESC);


--
-- Name: logs_2025_04_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_04_created_at_idx ON public.logs_2025_04 USING brin (created_at) WITH (pages_per_range='128');


--
-- Name: logs_2025_04_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_04_entity_type_entity_id_created_at_idx ON public.logs_2025_04 USING btree (entity_type, entity_id, created_at DESC) WHERE (entity_type IS NOT NULL);


--
-- Name: logs_2025_04_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_04_user_id_created_at_idx ON public.logs_2025_04 USING btree (user_id, created_at DESC);


--
-- Name: logs_2025_05_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_05_created_at_idx ON public.logs_2025_05 USING brin (created_at) WITH (pages_per_range='128');


--
-- Name: logs_2025_05_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_05_entity_type_entity_id_created_at_idx ON public.logs_2025_05 USING btree (entity_type, entity_id, created_at DESC) WHERE (entity_type IS NOT NULL);


--
-- Name: logs_2025_05_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_05_user_id_created_at_idx ON public.logs_2025_05 USING btree (user_id, created_at DESC);


--
-- Name: logs_2025_06_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_06_created_at_idx ON public.logs_2025_06 USING brin (created_at) WITH (pages_per_range='128');


--
-- Name: logs_2025_06_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_06_entity_type_entity_id_created_at_idx ON public.logs_2025_06 USING btree (entity_type, entity_id, created_at DESC) WHERE (entity_type IS NOT NULL);


--
-- Name: logs_2025_06_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_06_user_id_created_at_idx ON public.logs_2025_06 USING btree (user_id, created_at DESC);


--
-- Name: logs_2025_07_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_07_created_at_idx ON public.logs_2025_07 USING brin (created_at) WITH (pages_per_range='128');


--
-- Name: logs_2025_07_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_07_entity_type_entity_id_created_at_idx ON public.logs_2025_07 USING btree (entity_type, entity_id, created_at DESC) WHERE (entity_type IS NOT NULL);


--
-- Name: logs_2025_07_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_07_user_id_created_at_idx ON public.logs_2025_07 USING btree (user_id, created_at DESC);


--
-- Name: logs_2025_08_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_08_created_at_idx ON public.logs_2025_08 USING brin (created_at) WITH (pages_per_range='128');


--
-- Name: logs_2025_08_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_08_entity_type_entity_id_created_at_idx ON public.logs_2025_08 USING btree (entity_type, entity_id, created_at DESC) WHERE (entity_type IS NOT NULL);


--
-- Name: logs_2025_08_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_08_user_id_created_at_idx ON public.logs_2025_08 USING btree (user_id, created_at DESC);


--
-- Name: logs_2025_09_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_09_created_at_idx ON public.logs_2025_09 USING brin (created_at) WITH (pages_per_range='128');


--
-- Name: logs_2025_09_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_09_entity_type_entity_id_created_at_idx ON public.logs_2025_09 USING btree (entity_type, entity_id, created_at DESC) WHERE (entity_type IS NOT NULL);


--
-- Name: logs_2025_09_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_09_user_id_created_at_idx ON public.logs_2025_09 USING btree (user_id, created_at DESC);


--
-- Name: logs_2025_10_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_10_created_at_idx ON public.logs_2025_10 USING brin (created_at) WITH (pages_per_range='128');


--
-- Name: logs_2025_10_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_10_entity_type_entity_id_created_at_idx ON public.logs_2025_10 USING btree (entity_type, entity_id, created_at DESC) WHERE (entity_type IS NOT NULL);


--
-- Name: logs_2025_10_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_10_user_id_created_at_idx ON public.logs_2025_10 USING btree (user_id, created_at DESC);


--
-- Name: logs_2025_11_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_11_created_at_idx ON public.logs_2025_11 USING brin (created_at) WITH (pages_per_range='128');


--
-- Name: logs_2025_11_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_11_entity_type_entity_id_created_at_idx ON public.logs_2025_11 USING btree (entity_type, entity_id, created_at DESC) WHERE (entity_type IS NOT NULL);


--
-- Name: logs_2025_11_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_11_user_id_created_at_idx ON public.logs_2025_11 USING btree (user_id, created_at DESC);


--
-- Name: logs_2025_12_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_12_created_at_idx ON public.logs_2025_12 USING brin (created_at) WITH (pages_per_range='128');


--
-- Name: logs_2025_12_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_12_entity_type_entity_id_created_at_idx ON public.logs_2025_12 USING btree (entity_type, entity_id, created_at DESC) WHERE (entity_type IS NOT NULL);


--
-- Name: logs_2025_12_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2025_12_user_id_created_at_idx ON public.logs_2025_12 USING btree (user_id, created_at DESC);


--
-- Name: logs_2026_01_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2026_01_created_at_idx ON public.logs_2026_01 USING brin (created_at) WITH (pages_per_range='128');


--
-- Name: logs_2026_01_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2026_01_entity_type_entity_id_created_at_idx ON public.logs_2026_01 USING btree (entity_type, entity_id, created_at DESC) WHERE (entity_type IS NOT NULL);


--
-- Name: logs_2026_01_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2026_01_user_id_created_at_idx ON public.logs_2026_01 USING btree (user_id, created_at DESC);


--
-- Name: logs_2026_02_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2026_02_created_at_idx ON public.logs_2026_02 USING brin (created_at) WITH (pages_per_range='128');


--
-- Name: logs_2026_02_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2026_02_entity_type_entity_id_created_at_idx ON public.logs_2026_02 USING btree (entity_type, entity_id, created_at DESC) WHERE (entity_type IS NOT NULL);


--
-- Name: logs_2026_02_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2026_02_user_id_created_at_idx ON public.logs_2026_02 USING btree (user_id, created_at DESC);


--
-- Name: logs_2026_03_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2026_03_created_at_idx ON public.logs_2026_03 USING brin (created_at) WITH (pages_per_range='128');


--
-- Name: logs_2026_03_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2026_03_entity_type_entity_id_created_at_idx ON public.logs_2026_03 USING btree (entity_type, entity_id, created_at DESC) WHERE (entity_type IS NOT NULL);


--
-- Name: logs_2026_03_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_2026_03_user_id_created_at_idx ON public.logs_2026_03 USING btree (user_id, created_at DESC);


--
-- Name: logs_default_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_default_created_at_idx ON public.logs_default USING brin (created_at) WITH (pages_per_range='128');


--
-- Name: logs_default_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_default_entity_type_entity_id_created_at_idx ON public.logs_default USING btree (entity_type, entity_id, created_at DESC) WHERE (entity_type IS NOT NULL);


--
-- Name: logs_default_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX logs_default_user_id_created_at_idx ON public.logs_default USING btree (user_id, created_at DESC);


--
-- Name: music_albums_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX music_albums_user_idx ON public.music_albums USING btree (user_id, source);


--
-- Name: music_artists_external_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX music_artists_external_idx ON public.music_artists USING btree (source, external_id);


--
-- Name: music_artists_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX music_artists_name_trgm ON public.music_artists USING gin (name public.gin_trgm_ops);


--
-- Name: music_artists_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX music_artists_user_idx ON public.music_artists USING btree (user_id, source);


--
-- Name: music_liked_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX music_liked_user_idx ON public.music_liked USING btree (user_id, liked_at DESC);


--
-- Name: music_listening_started_brin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX music_listening_started_brin ON ONLY public.music_listening USING brin (started_at) WITH (pages_per_range='128');


--
-- Name: music_listening_2023_started_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX music_listening_2023_started_at_idx ON public.music_listening_2023 USING brin (started_at) WITH (pages_per_range='128');


--
-- Name: music_listening_user_started_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX music_listening_user_started_idx ON ONLY public.music_listening USING btree (user_id, started_at DESC);


--
-- Name: music_listening_2023_user_id_started_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX music_listening_2023_user_id_started_at_idx ON public.music_listening_2023 USING btree (user_id, started_at DESC);


--
-- Name: music_listening_2024_started_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX music_listening_2024_started_at_idx ON public.music_listening_2024 USING brin (started_at) WITH (pages_per_range='128');


--
-- Name: music_listening_2024_user_id_started_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX music_listening_2024_user_id_started_at_idx ON public.music_listening_2024 USING btree (user_id, started_at DESC);


--
-- Name: music_listening_2025_started_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX music_listening_2025_started_at_idx ON public.music_listening_2025 USING brin (started_at) WITH (pages_per_range='128');


--
-- Name: music_listening_2025_user_id_started_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX music_listening_2025_user_id_started_at_idx ON public.music_listening_2025 USING btree (user_id, started_at DESC);


--
-- Name: music_listening_2026_started_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX music_listening_2026_started_at_idx ON public.music_listening_2026 USING brin (started_at) WITH (pages_per_range='128');


--
-- Name: music_listening_2026_user_id_started_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX music_listening_2026_user_id_started_at_idx ON public.music_listening_2026 USING btree (user_id, started_at DESC);


--
-- Name: music_listening_default_started_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX music_listening_default_started_at_idx ON public.music_listening_default USING brin (started_at) WITH (pages_per_range='128');


--
-- Name: music_listening_default_user_id_started_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX music_listening_default_user_id_started_at_idx ON public.music_listening_default USING btree (user_id, started_at DESC);


--
-- Name: music_playlist_tracks_playlist_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX music_playlist_tracks_playlist_idx ON public.music_playlist_tracks USING btree (playlist_id, "position");


--
-- Name: music_playlist_tracks_track_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX music_playlist_tracks_track_idx ON public.music_playlist_tracks USING btree (track_id);


--
-- Name: music_playlists_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX music_playlists_user_idx ON public.music_playlists USING btree (user_id, source);


--
-- Name: music_tracks_external_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX music_tracks_external_idx ON public.music_tracks USING btree (source, external_id);


--
-- Name: music_tracks_isrc_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX music_tracks_isrc_idx ON public.music_tracks USING btree (isrc) WHERE (isrc IS NOT NULL);


--
-- Name: music_tracks_search_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX music_tracks_search_idx ON public.music_tracks USING gin (search_vector);


--
-- Name: music_tracks_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX music_tracks_user_idx ON public.music_tracks USING btree (user_id, source);


--
-- Name: note_shares_note_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX note_shares_note_idx ON public.note_shares USING btree (note_id);


--
-- Name: note_shares_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX note_shares_user_idx ON public.note_shares USING btree (shared_with_user_id);


--
-- Name: note_tags_note_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX note_tags_note_idx ON public.note_tags USING btree (note_id);


--
-- Name: note_tags_tag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX note_tags_tag_idx ON public.note_tags USING btree (tag_id);


--
-- Name: notes_latest_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notes_latest_idx ON public.notes USING btree (is_latest_version);


--
-- Name: notes_parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notes_parent_idx ON public.notes USING btree (parent_note_id);


--
-- Name: notes_published_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notes_published_at_idx ON public.notes USING btree (published_at);


--
-- Name: notes_search_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notes_search_idx ON public.notes USING gin (search_vector);


--
-- Name: notes_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notes_status_idx ON public.notes USING btree (status);


--
-- Name: notes_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notes_type_idx ON public.notes USING btree (type);


--
-- Name: notes_user_unlocked_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notes_user_unlocked_idx ON public.notes USING btree (user_id, updated_at DESC) WHERE (is_locked = false);


--
-- Name: notes_user_updated_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notes_user_updated_idx ON public.notes USING btree (user_id, updated_at DESC);


--
-- Name: notes_version_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notes_version_idx ON public.notes USING btree (parent_note_id, version_number);


--
-- Name: persons_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX persons_email_idx ON public.persons USING btree (owner_user_id, email);


--
-- Name: persons_name_trgm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX persons_name_trgm_idx ON public.persons USING gin ((((COALESCE(first_name, ''::text) || ' '::text) || COALESCE(last_name, ''::text))) public.gin_trgm_ops);


--
-- Name: persons_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX persons_owner_idx ON public.persons USING btree (owner_user_id, person_type);


--
-- Name: persons_search_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX persons_search_idx ON public.persons USING gin (search_vector);


--
-- Name: places_location_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX places_location_idx ON public.places USING gist (location);


--
-- Name: places_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX places_type_idx ON public.places USING btree (user_id, place_type);


--
-- Name: places_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX places_user_idx ON public.places USING btree (user_id);


--
-- Name: plaid_items_item_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plaid_items_item_id_idx ON public.plaid_items USING btree (item_id, created_at DESC);


--
-- Name: plaid_items_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plaid_items_user_id_idx ON public.plaid_items USING btree (user_id, created_at DESC);


--
-- Name: possession_containers_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX possession_containers_user_idx ON public.possession_containers USING btree (user_id);


--
-- Name: possessions_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX possessions_category_idx ON public.possessions USING btree (user_id, category);


--
-- Name: possessions_container_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX possessions_container_idx ON public.possessions USING btree (container_id);


--
-- Name: possessions_usage_container_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX possessions_usage_container_idx ON public.possessions_usage USING btree (container_id);


--
-- Name: possessions_usage_possession_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX possessions_usage_possession_idx ON public.possessions_usage USING btree (possession_id);


--
-- Name: possessions_usage_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX possessions_usage_user_idx ON public.possessions_usage USING btree (user_id);


--
-- Name: possessions_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX possessions_user_idx ON public.possessions USING btree (user_id);


--
-- Name: schools_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX schools_user_idx ON public.schools USING btree (user_id);


--
-- Name: searches_created_brin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX searches_created_brin ON ONLY public.searches USING brin (created_at) WITH (pages_per_range='128');


--
-- Name: searches_2025_q1_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX searches_2025_q1_created_at_idx ON public.searches_2025_q1 USING brin (created_at) WITH (pages_per_range='128');


--
-- Name: searches_query_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX searches_query_trgm ON ONLY public.searches USING gin (query public.gin_trgm_ops);


--
-- Name: searches_2025_q1_query_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX searches_2025_q1_query_idx ON public.searches_2025_q1 USING gin (query public.gin_trgm_ops);


--
-- Name: searches_user_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX searches_user_created_idx ON ONLY public.searches USING btree (user_id, created_at DESC);


--
-- Name: searches_2025_q1_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX searches_2025_q1_user_id_created_at_idx ON public.searches_2025_q1 USING btree (user_id, created_at DESC);


--
-- Name: searches_2025_q2_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX searches_2025_q2_created_at_idx ON public.searches_2025_q2 USING brin (created_at) WITH (pages_per_range='128');


--
-- Name: searches_2025_q2_query_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX searches_2025_q2_query_idx ON public.searches_2025_q2 USING gin (query public.gin_trgm_ops);


--
-- Name: searches_2025_q2_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX searches_2025_q2_user_id_created_at_idx ON public.searches_2025_q2 USING btree (user_id, created_at DESC);


--
-- Name: searches_2025_q3_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX searches_2025_q3_created_at_idx ON public.searches_2025_q3 USING brin (created_at) WITH (pages_per_range='128');


--
-- Name: searches_2025_q3_query_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX searches_2025_q3_query_idx ON public.searches_2025_q3 USING gin (query public.gin_trgm_ops);


--
-- Name: searches_2025_q3_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX searches_2025_q3_user_id_created_at_idx ON public.searches_2025_q3 USING btree (user_id, created_at DESC);


--
-- Name: searches_2025_q4_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX searches_2025_q4_created_at_idx ON public.searches_2025_q4 USING brin (created_at) WITH (pages_per_range='128');


--
-- Name: searches_2025_q4_query_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX searches_2025_q4_query_idx ON public.searches_2025_q4 USING gin (query public.gin_trgm_ops);


--
-- Name: searches_2025_q4_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX searches_2025_q4_user_id_created_at_idx ON public.searches_2025_q4 USING btree (user_id, created_at DESC);


--
-- Name: searches_2026_q1_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX searches_2026_q1_created_at_idx ON public.searches_2026_q1 USING brin (created_at) WITH (pages_per_range='128');


--
-- Name: searches_2026_q1_query_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX searches_2026_q1_query_idx ON public.searches_2026_q1 USING gin (query public.gin_trgm_ops);


--
-- Name: searches_2026_q1_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX searches_2026_q1_user_id_created_at_idx ON public.searches_2026_q1 USING btree (user_id, created_at DESC);


--
-- Name: searches_default_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX searches_default_created_at_idx ON public.searches_default USING brin (created_at) WITH (pages_per_range='128');


--
-- Name: searches_default_query_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX searches_default_query_idx ON public.searches_default USING gin (query public.gin_trgm_ops);


--
-- Name: searches_default_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX searches_default_user_id_created_at_idx ON public.searches_default USING btree (user_id, created_at DESC);


--
-- Name: tag_shares_tag_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tag_shares_tag_id_idx ON public.tag_shares USING btree (tag_id);


--
-- Name: tag_shares_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tag_shares_user_id_idx ON public.tag_shares USING btree (shared_with_user_id);


--
-- Name: tagged_items_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tagged_items_entity_idx ON public.tagged_items USING btree (entity_type, entity_id);


--
-- Name: tagged_items_finance_txn_entity_tag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tagged_items_finance_txn_entity_tag_idx ON public.tagged_items USING btree (entity_id, tag_id) WHERE (entity_type = 'finance_transaction'::text);


--
-- Name: tagged_items_finance_txn_tag_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tagged_items_finance_txn_tag_entity_idx ON public.tagged_items USING btree (tag_id, entity_id) WHERE (entity_type = 'finance_transaction'::text);


--
-- Name: tagged_items_tag_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tagged_items_tag_id_idx ON public.tagged_items USING btree (tag_id);


--
-- Name: tags_owner_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tags_owner_id_idx ON public.tags USING btree (owner_id);


--
-- Name: tags_owner_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tags_owner_name_idx ON public.tags USING btree (owner_id, name);


--
-- Name: task_list_collaborators_list_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_list_collaborators_list_idx ON public.task_list_collaborators USING btree (list_id);


--
-- Name: task_list_collaborators_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_list_collaborators_user_idx ON public.task_list_collaborators USING btree (user_id);


--
-- Name: task_list_invites_email_lower_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_list_invites_email_lower_idx ON public.task_list_invites USING btree (lower(invited_user_email));


--
-- Name: task_list_invites_invited_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_list_invites_invited_user_idx ON public.task_list_invites USING btree (invited_user_id);


--
-- Name: task_list_invites_list_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_list_invites_list_idx ON public.task_list_invites USING btree (list_id);


--
-- Name: task_list_invites_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_list_invites_user_idx ON public.task_list_invites USING btree (user_id);


--
-- Name: task_lists_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_lists_user_idx ON public.task_lists USING btree (user_id);


--
-- Name: tasks_open_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tasks_open_idx ON public.tasks USING btree (user_id, due_date, priority) WHERE (status = ANY (ARRAY['pending'::text, 'in_progress'::text]));


--
-- Name: tasks_user_due_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tasks_user_due_idx ON public.tasks USING btree (user_id, due_date);


--
-- Name: tasks_user_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tasks_user_status_idx ON public.tasks USING btree (user_id, status);


--
-- Name: travel_flights_trip_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX travel_flights_trip_idx ON public.travel_flights USING btree (trip_id);


--
-- Name: travel_flights_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX travel_flights_user_idx ON public.travel_flights USING btree (user_id, departure_time);


--
-- Name: travel_hotels_trip_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX travel_hotels_trip_idx ON public.travel_hotels USING btree (trip_id);


--
-- Name: travel_hotels_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX travel_hotels_user_idx ON public.travel_hotels USING btree (user_id, check_in);


--
-- Name: travel_trips_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX travel_trips_user_idx ON public.travel_trips USING btree (user_id, start_date DESC);


--
-- Name: user_account_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_account_user_id_idx ON public.user_account USING btree (user_id);


--
-- Name: user_accounts_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_accounts_user_id_idx ON public.user_accounts USING btree (user_id);


--
-- Name: user_api_keys_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_api_keys_user_id_idx ON public.user_api_keys USING btree (user_id);


--
-- Name: user_device_code_device_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_device_code_device_code_idx ON public.user_device_code USING btree (device_code);


--
-- Name: user_device_code_user_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_device_code_user_code_idx ON public.user_device_code USING btree (user_code);


--
-- Name: user_passkey_credential_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_passkey_credential_id_idx ON public.user_passkey USING btree (credential_id);


--
-- Name: user_passkey_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_passkey_user_id_idx ON public.user_passkey USING btree (user_id);


--
-- Name: user_person_relations_person_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_person_relations_person_idx ON public.user_person_relations USING btree (person_id);


--
-- Name: user_person_relations_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_person_relations_user_idx ON public.user_person_relations USING btree (user_id);


--
-- Name: user_session_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_session_user_id_idx ON public.user_session USING btree (user_id);


--
-- Name: user_sessions_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_sessions_token_idx ON public.user_sessions USING btree (token);


--
-- Name: user_sessions_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_sessions_user_id_idx ON public.user_sessions USING btree (user_id);


--
-- Name: user_verification_identifier_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_verification_identifier_idx ON public.user_verification USING btree (identifier);


--
-- Name: users_email_lower_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_email_lower_idx ON public.users USING btree (lower(email));


--
-- Name: video_channels_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX video_channels_user_idx ON public.video_channels USING btree (user_id, source);


--
-- Name: video_viewings_content_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX video_viewings_content_type_idx ON ONLY public.video_viewings USING btree (user_id, content_type);


--
-- Name: video_viewings_2023_user_id_content_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX video_viewings_2023_user_id_content_type_idx ON public.video_viewings_2023 USING btree (user_id, content_type);


--
-- Name: video_viewings_user_watched_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX video_viewings_user_watched_idx ON ONLY public.video_viewings USING btree (user_id, watched_at DESC);


--
-- Name: video_viewings_2023_user_id_watched_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX video_viewings_2023_user_id_watched_at_idx ON public.video_viewings_2023 USING btree (user_id, watched_at DESC);


--
-- Name: video_viewings_watched_brin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX video_viewings_watched_brin ON ONLY public.video_viewings USING brin (watched_at) WITH (pages_per_range='128');


--
-- Name: video_viewings_2023_watched_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX video_viewings_2023_watched_at_idx ON public.video_viewings_2023 USING brin (watched_at) WITH (pages_per_range='128');


--
-- Name: video_viewings_2024_user_id_content_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX video_viewings_2024_user_id_content_type_idx ON public.video_viewings_2024 USING btree (user_id, content_type);


--
-- Name: video_viewings_2024_user_id_watched_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX video_viewings_2024_user_id_watched_at_idx ON public.video_viewings_2024 USING btree (user_id, watched_at DESC);


--
-- Name: video_viewings_2024_watched_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX video_viewings_2024_watched_at_idx ON public.video_viewings_2024 USING brin (watched_at) WITH (pages_per_range='128');


--
-- Name: video_viewings_2025_user_id_content_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX video_viewings_2025_user_id_content_type_idx ON public.video_viewings_2025 USING btree (user_id, content_type);


--
-- Name: video_viewings_2025_user_id_watched_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX video_viewings_2025_user_id_watched_at_idx ON public.video_viewings_2025 USING btree (user_id, watched_at DESC);


--
-- Name: video_viewings_2025_watched_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX video_viewings_2025_watched_at_idx ON public.video_viewings_2025 USING brin (watched_at) WITH (pages_per_range='128');


--
-- Name: video_viewings_2026_user_id_content_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX video_viewings_2026_user_id_content_type_idx ON public.video_viewings_2026 USING btree (user_id, content_type);


--
-- Name: video_viewings_2026_user_id_watched_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX video_viewings_2026_user_id_watched_at_idx ON public.video_viewings_2026 USING btree (user_id, watched_at DESC);


--
-- Name: video_viewings_2026_watched_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX video_viewings_2026_watched_at_idx ON public.video_viewings_2026 USING brin (watched_at) WITH (pages_per_range='128');


--
-- Name: video_viewings_default_user_id_content_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX video_viewings_default_user_id_content_type_idx ON public.video_viewings_default USING btree (user_id, content_type);


--
-- Name: video_viewings_default_user_id_watched_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX video_viewings_default_user_id_watched_at_idx ON public.video_viewings_default USING btree (user_id, watched_at DESC);


--
-- Name: video_viewings_default_watched_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX video_viewings_default_watched_at_idx ON public.video_viewings_default USING brin (watched_at) WITH (pages_per_range='128');


--
-- Name: finance_transactions_2022_account_id_date_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_account_idx ATTACH PARTITION public.finance_transactions_2022_account_id_date_idx;


--
-- Name: finance_transactions_2022_date_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_date_brin ATTACH PARTITION public.finance_transactions_2022_date_idx;


--
-- Name: finance_transactions_2022_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_pkey ATTACH PARTITION public.finance_transactions_2022_pkey;


--
-- Name: finance_transactions_2022_user_id_account_id_date_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_user_account_date_id_idx ATTACH PARTITION public.finance_transactions_2022_user_id_account_id_date_id_idx;


--
-- Name: finance_transactions_2022_user_id_date_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_user_date_id_idx ATTACH PARTITION public.finance_transactions_2022_user_id_date_id_idx;


--
-- Name: finance_transactions_2022_user_id_date_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_user_date_idx ATTACH PARTITION public.finance_transactions_2022_user_id_date_idx;


--
-- Name: finance_transactions_2022_user_id_date_idx1; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_pending_idx ATTACH PARTITION public.finance_transactions_2022_user_id_date_idx1;


--
-- Name: finance_transactions_2023_account_id_date_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_account_idx ATTACH PARTITION public.finance_transactions_2023_account_id_date_idx;


--
-- Name: finance_transactions_2023_date_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_date_brin ATTACH PARTITION public.finance_transactions_2023_date_idx;


--
-- Name: finance_transactions_2023_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_pkey ATTACH PARTITION public.finance_transactions_2023_pkey;


--
-- Name: finance_transactions_2023_user_id_account_id_date_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_user_account_date_id_idx ATTACH PARTITION public.finance_transactions_2023_user_id_account_id_date_id_idx;


--
-- Name: finance_transactions_2023_user_id_date_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_user_date_id_idx ATTACH PARTITION public.finance_transactions_2023_user_id_date_id_idx;


--
-- Name: finance_transactions_2023_user_id_date_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_user_date_idx ATTACH PARTITION public.finance_transactions_2023_user_id_date_idx;


--
-- Name: finance_transactions_2023_user_id_date_idx1; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_pending_idx ATTACH PARTITION public.finance_transactions_2023_user_id_date_idx1;


--
-- Name: finance_transactions_2024_account_id_date_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_account_idx ATTACH PARTITION public.finance_transactions_2024_account_id_date_idx;


--
-- Name: finance_transactions_2024_date_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_date_brin ATTACH PARTITION public.finance_transactions_2024_date_idx;


--
-- Name: finance_transactions_2024_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_pkey ATTACH PARTITION public.finance_transactions_2024_pkey;


--
-- Name: finance_transactions_2024_user_id_account_id_date_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_user_account_date_id_idx ATTACH PARTITION public.finance_transactions_2024_user_id_account_id_date_id_idx;


--
-- Name: finance_transactions_2024_user_id_date_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_user_date_id_idx ATTACH PARTITION public.finance_transactions_2024_user_id_date_id_idx;


--
-- Name: finance_transactions_2024_user_id_date_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_user_date_idx ATTACH PARTITION public.finance_transactions_2024_user_id_date_idx;


--
-- Name: finance_transactions_2024_user_id_date_idx1; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_pending_idx ATTACH PARTITION public.finance_transactions_2024_user_id_date_idx1;


--
-- Name: finance_transactions_2025_account_id_date_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_account_idx ATTACH PARTITION public.finance_transactions_2025_account_id_date_idx;


--
-- Name: finance_transactions_2025_date_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_date_brin ATTACH PARTITION public.finance_transactions_2025_date_idx;


--
-- Name: finance_transactions_2025_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_pkey ATTACH PARTITION public.finance_transactions_2025_pkey;


--
-- Name: finance_transactions_2025_user_id_account_id_date_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_user_account_date_id_idx ATTACH PARTITION public.finance_transactions_2025_user_id_account_id_date_id_idx;


--
-- Name: finance_transactions_2025_user_id_date_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_user_date_id_idx ATTACH PARTITION public.finance_transactions_2025_user_id_date_id_idx;


--
-- Name: finance_transactions_2025_user_id_date_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_user_date_idx ATTACH PARTITION public.finance_transactions_2025_user_id_date_idx;


--
-- Name: finance_transactions_2025_user_id_date_idx1; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_pending_idx ATTACH PARTITION public.finance_transactions_2025_user_id_date_idx1;


--
-- Name: finance_transactions_2026_account_id_date_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_account_idx ATTACH PARTITION public.finance_transactions_2026_account_id_date_idx;


--
-- Name: finance_transactions_2026_date_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_date_brin ATTACH PARTITION public.finance_transactions_2026_date_idx;


--
-- Name: finance_transactions_2026_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_pkey ATTACH PARTITION public.finance_transactions_2026_pkey;


--
-- Name: finance_transactions_2026_user_id_account_id_date_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_user_account_date_id_idx ATTACH PARTITION public.finance_transactions_2026_user_id_account_id_date_id_idx;


--
-- Name: finance_transactions_2026_user_id_date_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_user_date_id_idx ATTACH PARTITION public.finance_transactions_2026_user_id_date_id_idx;


--
-- Name: finance_transactions_2026_user_id_date_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_user_date_idx ATTACH PARTITION public.finance_transactions_2026_user_id_date_idx;


--
-- Name: finance_transactions_2026_user_id_date_idx1; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_pending_idx ATTACH PARTITION public.finance_transactions_2026_user_id_date_idx1;


--
-- Name: finance_transactions_default_account_id_date_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_account_idx ATTACH PARTITION public.finance_transactions_default_account_id_date_idx;


--
-- Name: finance_transactions_default_date_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_date_brin ATTACH PARTITION public.finance_transactions_default_date_idx;


--
-- Name: finance_transactions_default_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_pkey ATTACH PARTITION public.finance_transactions_default_pkey;


--
-- Name: finance_transactions_default_user_id_account_id_date_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_user_account_date_id_idx ATTACH PARTITION public.finance_transactions_default_user_id_account_id_date_id_idx;


--
-- Name: finance_transactions_default_user_id_date_id_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_user_date_id_idx ATTACH PARTITION public.finance_transactions_default_user_id_date_id_idx;


--
-- Name: finance_transactions_default_user_id_date_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_user_date_idx ATTACH PARTITION public.finance_transactions_default_user_id_date_idx;


--
-- Name: finance_transactions_default_user_id_date_idx1; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.finance_transactions_pending_idx ATTACH PARTITION public.finance_transactions_default_user_id_date_idx1;


--
-- Name: health_records_2023_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.health_records_pkey ATTACH PARTITION public.health_records_2023_pkey;


--
-- Name: health_records_2023_recorded_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.health_records_recorded_brin ATTACH PARTITION public.health_records_2023_recorded_at_idx;


--
-- Name: health_records_2023_user_id_record_type_recorded_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.health_records_type_idx ATTACH PARTITION public.health_records_2023_user_id_record_type_recorded_at_idx;


--
-- Name: health_records_2023_user_id_recorded_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.health_records_user_recorded_idx ATTACH PARTITION public.health_records_2023_user_id_recorded_at_idx;


--
-- Name: health_records_2024_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.health_records_pkey ATTACH PARTITION public.health_records_2024_pkey;


--
-- Name: health_records_2024_recorded_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.health_records_recorded_brin ATTACH PARTITION public.health_records_2024_recorded_at_idx;


--
-- Name: health_records_2024_user_id_record_type_recorded_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.health_records_type_idx ATTACH PARTITION public.health_records_2024_user_id_record_type_recorded_at_idx;


--
-- Name: health_records_2024_user_id_recorded_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.health_records_user_recorded_idx ATTACH PARTITION public.health_records_2024_user_id_recorded_at_idx;


--
-- Name: health_records_2025_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.health_records_pkey ATTACH PARTITION public.health_records_2025_pkey;


--
-- Name: health_records_2025_recorded_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.health_records_recorded_brin ATTACH PARTITION public.health_records_2025_recorded_at_idx;


--
-- Name: health_records_2025_user_id_record_type_recorded_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.health_records_type_idx ATTACH PARTITION public.health_records_2025_user_id_record_type_recorded_at_idx;


--
-- Name: health_records_2025_user_id_recorded_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.health_records_user_recorded_idx ATTACH PARTITION public.health_records_2025_user_id_recorded_at_idx;


--
-- Name: health_records_2026_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.health_records_pkey ATTACH PARTITION public.health_records_2026_pkey;


--
-- Name: health_records_2026_recorded_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.health_records_recorded_brin ATTACH PARTITION public.health_records_2026_recorded_at_idx;


--
-- Name: health_records_2026_user_id_record_type_recorded_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.health_records_type_idx ATTACH PARTITION public.health_records_2026_user_id_record_type_recorded_at_idx;


--
-- Name: health_records_2026_user_id_recorded_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.health_records_user_recorded_idx ATTACH PARTITION public.health_records_2026_user_id_recorded_at_idx;


--
-- Name: health_records_default_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.health_records_pkey ATTACH PARTITION public.health_records_default_pkey;


--
-- Name: health_records_default_recorded_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.health_records_recorded_brin ATTACH PARTITION public.health_records_default_recorded_at_idx;


--
-- Name: health_records_default_user_id_record_type_recorded_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.health_records_type_idx ATTACH PARTITION public.health_records_default_user_id_record_type_recorded_at_idx;


--
-- Name: health_records_default_user_id_recorded_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.health_records_user_recorded_idx ATTACH PARTITION public.health_records_default_user_id_recorded_at_idx;


--
-- Name: logs_2025_01_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_created_brin ATTACH PARTITION public.logs_2025_01_created_at_idx;


--
-- Name: logs_2025_01_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_entity_idx ATTACH PARTITION public.logs_2025_01_entity_type_entity_id_created_at_idx;


--
-- Name: logs_2025_01_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_pkey ATTACH PARTITION public.logs_2025_01_pkey;


--
-- Name: logs_2025_01_user_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_user_created_idx ATTACH PARTITION public.logs_2025_01_user_id_created_at_idx;


--
-- Name: logs_2025_02_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_created_brin ATTACH PARTITION public.logs_2025_02_created_at_idx;


--
-- Name: logs_2025_02_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_entity_idx ATTACH PARTITION public.logs_2025_02_entity_type_entity_id_created_at_idx;


--
-- Name: logs_2025_02_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_pkey ATTACH PARTITION public.logs_2025_02_pkey;


--
-- Name: logs_2025_02_user_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_user_created_idx ATTACH PARTITION public.logs_2025_02_user_id_created_at_idx;


--
-- Name: logs_2025_03_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_created_brin ATTACH PARTITION public.logs_2025_03_created_at_idx;


--
-- Name: logs_2025_03_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_entity_idx ATTACH PARTITION public.logs_2025_03_entity_type_entity_id_created_at_idx;


--
-- Name: logs_2025_03_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_pkey ATTACH PARTITION public.logs_2025_03_pkey;


--
-- Name: logs_2025_03_user_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_user_created_idx ATTACH PARTITION public.logs_2025_03_user_id_created_at_idx;


--
-- Name: logs_2025_04_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_created_brin ATTACH PARTITION public.logs_2025_04_created_at_idx;


--
-- Name: logs_2025_04_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_entity_idx ATTACH PARTITION public.logs_2025_04_entity_type_entity_id_created_at_idx;


--
-- Name: logs_2025_04_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_pkey ATTACH PARTITION public.logs_2025_04_pkey;


--
-- Name: logs_2025_04_user_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_user_created_idx ATTACH PARTITION public.logs_2025_04_user_id_created_at_idx;


--
-- Name: logs_2025_05_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_created_brin ATTACH PARTITION public.logs_2025_05_created_at_idx;


--
-- Name: logs_2025_05_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_entity_idx ATTACH PARTITION public.logs_2025_05_entity_type_entity_id_created_at_idx;


--
-- Name: logs_2025_05_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_pkey ATTACH PARTITION public.logs_2025_05_pkey;


--
-- Name: logs_2025_05_user_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_user_created_idx ATTACH PARTITION public.logs_2025_05_user_id_created_at_idx;


--
-- Name: logs_2025_06_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_created_brin ATTACH PARTITION public.logs_2025_06_created_at_idx;


--
-- Name: logs_2025_06_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_entity_idx ATTACH PARTITION public.logs_2025_06_entity_type_entity_id_created_at_idx;


--
-- Name: logs_2025_06_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_pkey ATTACH PARTITION public.logs_2025_06_pkey;


--
-- Name: logs_2025_06_user_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_user_created_idx ATTACH PARTITION public.logs_2025_06_user_id_created_at_idx;


--
-- Name: logs_2025_07_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_created_brin ATTACH PARTITION public.logs_2025_07_created_at_idx;


--
-- Name: logs_2025_07_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_entity_idx ATTACH PARTITION public.logs_2025_07_entity_type_entity_id_created_at_idx;


--
-- Name: logs_2025_07_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_pkey ATTACH PARTITION public.logs_2025_07_pkey;


--
-- Name: logs_2025_07_user_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_user_created_idx ATTACH PARTITION public.logs_2025_07_user_id_created_at_idx;


--
-- Name: logs_2025_08_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_created_brin ATTACH PARTITION public.logs_2025_08_created_at_idx;


--
-- Name: logs_2025_08_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_entity_idx ATTACH PARTITION public.logs_2025_08_entity_type_entity_id_created_at_idx;


--
-- Name: logs_2025_08_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_pkey ATTACH PARTITION public.logs_2025_08_pkey;


--
-- Name: logs_2025_08_user_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_user_created_idx ATTACH PARTITION public.logs_2025_08_user_id_created_at_idx;


--
-- Name: logs_2025_09_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_created_brin ATTACH PARTITION public.logs_2025_09_created_at_idx;


--
-- Name: logs_2025_09_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_entity_idx ATTACH PARTITION public.logs_2025_09_entity_type_entity_id_created_at_idx;


--
-- Name: logs_2025_09_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_pkey ATTACH PARTITION public.logs_2025_09_pkey;


--
-- Name: logs_2025_09_user_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_user_created_idx ATTACH PARTITION public.logs_2025_09_user_id_created_at_idx;


--
-- Name: logs_2025_10_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_created_brin ATTACH PARTITION public.logs_2025_10_created_at_idx;


--
-- Name: logs_2025_10_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_entity_idx ATTACH PARTITION public.logs_2025_10_entity_type_entity_id_created_at_idx;


--
-- Name: logs_2025_10_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_pkey ATTACH PARTITION public.logs_2025_10_pkey;


--
-- Name: logs_2025_10_user_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_user_created_idx ATTACH PARTITION public.logs_2025_10_user_id_created_at_idx;


--
-- Name: logs_2025_11_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_created_brin ATTACH PARTITION public.logs_2025_11_created_at_idx;


--
-- Name: logs_2025_11_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_entity_idx ATTACH PARTITION public.logs_2025_11_entity_type_entity_id_created_at_idx;


--
-- Name: logs_2025_11_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_pkey ATTACH PARTITION public.logs_2025_11_pkey;


--
-- Name: logs_2025_11_user_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_user_created_idx ATTACH PARTITION public.logs_2025_11_user_id_created_at_idx;


--
-- Name: logs_2025_12_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_created_brin ATTACH PARTITION public.logs_2025_12_created_at_idx;


--
-- Name: logs_2025_12_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_entity_idx ATTACH PARTITION public.logs_2025_12_entity_type_entity_id_created_at_idx;


--
-- Name: logs_2025_12_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_pkey ATTACH PARTITION public.logs_2025_12_pkey;


--
-- Name: logs_2025_12_user_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_user_created_idx ATTACH PARTITION public.logs_2025_12_user_id_created_at_idx;


--
-- Name: logs_2026_01_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_created_brin ATTACH PARTITION public.logs_2026_01_created_at_idx;


--
-- Name: logs_2026_01_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_entity_idx ATTACH PARTITION public.logs_2026_01_entity_type_entity_id_created_at_idx;


--
-- Name: logs_2026_01_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_pkey ATTACH PARTITION public.logs_2026_01_pkey;


--
-- Name: logs_2026_01_user_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_user_created_idx ATTACH PARTITION public.logs_2026_01_user_id_created_at_idx;


--
-- Name: logs_2026_02_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_created_brin ATTACH PARTITION public.logs_2026_02_created_at_idx;


--
-- Name: logs_2026_02_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_entity_idx ATTACH PARTITION public.logs_2026_02_entity_type_entity_id_created_at_idx;


--
-- Name: logs_2026_02_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_pkey ATTACH PARTITION public.logs_2026_02_pkey;


--
-- Name: logs_2026_02_user_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_user_created_idx ATTACH PARTITION public.logs_2026_02_user_id_created_at_idx;


--
-- Name: logs_2026_03_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_created_brin ATTACH PARTITION public.logs_2026_03_created_at_idx;


--
-- Name: logs_2026_03_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_entity_idx ATTACH PARTITION public.logs_2026_03_entity_type_entity_id_created_at_idx;


--
-- Name: logs_2026_03_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_pkey ATTACH PARTITION public.logs_2026_03_pkey;


--
-- Name: logs_2026_03_user_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_user_created_idx ATTACH PARTITION public.logs_2026_03_user_id_created_at_idx;


--
-- Name: logs_default_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_created_brin ATTACH PARTITION public.logs_default_created_at_idx;


--
-- Name: logs_default_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_entity_idx ATTACH PARTITION public.logs_default_entity_type_entity_id_created_at_idx;


--
-- Name: logs_default_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_pkey ATTACH PARTITION public.logs_default_pkey;


--
-- Name: logs_default_user_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.logs_user_created_idx ATTACH PARTITION public.logs_default_user_id_created_at_idx;


--
-- Name: music_listening_2023_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.music_listening_pkey ATTACH PARTITION public.music_listening_2023_pkey;


--
-- Name: music_listening_2023_started_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.music_listening_started_brin ATTACH PARTITION public.music_listening_2023_started_at_idx;


--
-- Name: music_listening_2023_user_id_started_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.music_listening_user_started_idx ATTACH PARTITION public.music_listening_2023_user_id_started_at_idx;


--
-- Name: music_listening_2024_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.music_listening_pkey ATTACH PARTITION public.music_listening_2024_pkey;


--
-- Name: music_listening_2024_started_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.music_listening_started_brin ATTACH PARTITION public.music_listening_2024_started_at_idx;


--
-- Name: music_listening_2024_user_id_started_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.music_listening_user_started_idx ATTACH PARTITION public.music_listening_2024_user_id_started_at_idx;


--
-- Name: music_listening_2025_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.music_listening_pkey ATTACH PARTITION public.music_listening_2025_pkey;


--
-- Name: music_listening_2025_started_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.music_listening_started_brin ATTACH PARTITION public.music_listening_2025_started_at_idx;


--
-- Name: music_listening_2025_user_id_started_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.music_listening_user_started_idx ATTACH PARTITION public.music_listening_2025_user_id_started_at_idx;


--
-- Name: music_listening_2026_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.music_listening_pkey ATTACH PARTITION public.music_listening_2026_pkey;


--
-- Name: music_listening_2026_started_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.music_listening_started_brin ATTACH PARTITION public.music_listening_2026_started_at_idx;


--
-- Name: music_listening_2026_user_id_started_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.music_listening_user_started_idx ATTACH PARTITION public.music_listening_2026_user_id_started_at_idx;


--
-- Name: music_listening_default_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.music_listening_pkey ATTACH PARTITION public.music_listening_default_pkey;


--
-- Name: music_listening_default_started_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.music_listening_started_brin ATTACH PARTITION public.music_listening_default_started_at_idx;


--
-- Name: music_listening_default_user_id_started_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.music_listening_user_started_idx ATTACH PARTITION public.music_listening_default_user_id_started_at_idx;


--
-- Name: searches_2025_q1_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.searches_created_brin ATTACH PARTITION public.searches_2025_q1_created_at_idx;


--
-- Name: searches_2025_q1_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.searches_pkey ATTACH PARTITION public.searches_2025_q1_pkey;


--
-- Name: searches_2025_q1_query_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.searches_query_trgm ATTACH PARTITION public.searches_2025_q1_query_idx;


--
-- Name: searches_2025_q1_user_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.searches_user_created_idx ATTACH PARTITION public.searches_2025_q1_user_id_created_at_idx;


--
-- Name: searches_2025_q2_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.searches_created_brin ATTACH PARTITION public.searches_2025_q2_created_at_idx;


--
-- Name: searches_2025_q2_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.searches_pkey ATTACH PARTITION public.searches_2025_q2_pkey;


--
-- Name: searches_2025_q2_query_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.searches_query_trgm ATTACH PARTITION public.searches_2025_q2_query_idx;


--
-- Name: searches_2025_q2_user_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.searches_user_created_idx ATTACH PARTITION public.searches_2025_q2_user_id_created_at_idx;


--
-- Name: searches_2025_q3_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.searches_created_brin ATTACH PARTITION public.searches_2025_q3_created_at_idx;


--
-- Name: searches_2025_q3_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.searches_pkey ATTACH PARTITION public.searches_2025_q3_pkey;


--
-- Name: searches_2025_q3_query_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.searches_query_trgm ATTACH PARTITION public.searches_2025_q3_query_idx;


--
-- Name: searches_2025_q3_user_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.searches_user_created_idx ATTACH PARTITION public.searches_2025_q3_user_id_created_at_idx;


--
-- Name: searches_2025_q4_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.searches_created_brin ATTACH PARTITION public.searches_2025_q4_created_at_idx;


--
-- Name: searches_2025_q4_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.searches_pkey ATTACH PARTITION public.searches_2025_q4_pkey;


--
-- Name: searches_2025_q4_query_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.searches_query_trgm ATTACH PARTITION public.searches_2025_q4_query_idx;


--
-- Name: searches_2025_q4_user_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.searches_user_created_idx ATTACH PARTITION public.searches_2025_q4_user_id_created_at_idx;


--
-- Name: searches_2026_q1_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.searches_created_brin ATTACH PARTITION public.searches_2026_q1_created_at_idx;


--
-- Name: searches_2026_q1_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.searches_pkey ATTACH PARTITION public.searches_2026_q1_pkey;


--
-- Name: searches_2026_q1_query_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.searches_query_trgm ATTACH PARTITION public.searches_2026_q1_query_idx;


--
-- Name: searches_2026_q1_user_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.searches_user_created_idx ATTACH PARTITION public.searches_2026_q1_user_id_created_at_idx;


--
-- Name: searches_default_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.searches_created_brin ATTACH PARTITION public.searches_default_created_at_idx;


--
-- Name: searches_default_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.searches_pkey ATTACH PARTITION public.searches_default_pkey;


--
-- Name: searches_default_query_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.searches_query_trgm ATTACH PARTITION public.searches_default_query_idx;


--
-- Name: searches_default_user_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.searches_user_created_idx ATTACH PARTITION public.searches_default_user_id_created_at_idx;


--
-- Name: video_viewings_2023_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.video_viewings_pkey ATTACH PARTITION public.video_viewings_2023_pkey;


--
-- Name: video_viewings_2023_user_id_content_type_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.video_viewings_content_type_idx ATTACH PARTITION public.video_viewings_2023_user_id_content_type_idx;


--
-- Name: video_viewings_2023_user_id_watched_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.video_viewings_user_watched_idx ATTACH PARTITION public.video_viewings_2023_user_id_watched_at_idx;


--
-- Name: video_viewings_2023_watched_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.video_viewings_watched_brin ATTACH PARTITION public.video_viewings_2023_watched_at_idx;


--
-- Name: video_viewings_2024_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.video_viewings_pkey ATTACH PARTITION public.video_viewings_2024_pkey;


--
-- Name: video_viewings_2024_user_id_content_type_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.video_viewings_content_type_idx ATTACH PARTITION public.video_viewings_2024_user_id_content_type_idx;


--
-- Name: video_viewings_2024_user_id_watched_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.video_viewings_user_watched_idx ATTACH PARTITION public.video_viewings_2024_user_id_watched_at_idx;


--
-- Name: video_viewings_2024_watched_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.video_viewings_watched_brin ATTACH PARTITION public.video_viewings_2024_watched_at_idx;


--
-- Name: video_viewings_2025_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.video_viewings_pkey ATTACH PARTITION public.video_viewings_2025_pkey;


--
-- Name: video_viewings_2025_user_id_content_type_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.video_viewings_content_type_idx ATTACH PARTITION public.video_viewings_2025_user_id_content_type_idx;


--
-- Name: video_viewings_2025_user_id_watched_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.video_viewings_user_watched_idx ATTACH PARTITION public.video_viewings_2025_user_id_watched_at_idx;


--
-- Name: video_viewings_2025_watched_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.video_viewings_watched_brin ATTACH PARTITION public.video_viewings_2025_watched_at_idx;


--
-- Name: video_viewings_2026_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.video_viewings_pkey ATTACH PARTITION public.video_viewings_2026_pkey;


--
-- Name: video_viewings_2026_user_id_content_type_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.video_viewings_content_type_idx ATTACH PARTITION public.video_viewings_2026_user_id_content_type_idx;


--
-- Name: video_viewings_2026_user_id_watched_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.video_viewings_user_watched_idx ATTACH PARTITION public.video_viewings_2026_user_id_watched_at_idx;


--
-- Name: video_viewings_2026_watched_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.video_viewings_watched_brin ATTACH PARTITION public.video_viewings_2026_watched_at_idx;


--
-- Name: video_viewings_default_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.video_viewings_pkey ATTACH PARTITION public.video_viewings_default_pkey;


--
-- Name: video_viewings_default_user_id_content_type_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.video_viewings_content_type_idx ATTACH PARTITION public.video_viewings_default_user_id_content_type_idx;


--
-- Name: video_viewings_default_user_id_watched_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.video_viewings_user_watched_idx ATTACH PARTITION public.video_viewings_default_user_id_watched_at_idx;


--
-- Name: video_viewings_default_watched_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.video_viewings_watched_brin ATTACH PARTITION public.video_viewings_default_watched_at_idx;


--
-- Name: calendar_events calendar_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER calendar_events_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: finance_accounts finance_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER finance_accounts_updated_at BEFORE UPDATE ON public.finance_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: music_playlist_tracks music_playlist_tracks_count_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER music_playlist_tracks_count_delete AFTER DELETE ON public.music_playlist_tracks FOR EACH ROW EXECUTE FUNCTION public.music_playlist_track_count();


--
-- Name: music_playlist_tracks music_playlist_tracks_count_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER music_playlist_tracks_count_insert AFTER INSERT ON public.music_playlist_tracks FOR EACH ROW EXECUTE FUNCTION public.music_playlist_track_count();


--
-- Name: music_playlists music_playlists_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER music_playlists_updated_at BEFORE UPDATE ON public.music_playlists FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: music_tracks music_tracks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER music_tracks_updated_at BEFORE UPDATE ON public.music_tracks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: notes notes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: persons persons_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER persons_updated_at BEFORE UPDATE ON public.persons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: places places_sync_location_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER places_sync_location_trigger BEFORE INSERT OR UPDATE OF latitude, longitude ON public.places FOR EACH ROW EXECUTE FUNCTION public.places_sync_location();


--
-- Name: tasks tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: users users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: auth_refresh_tokens auth_refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_refresh_tokens
    ADD CONSTRAINT auth_refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.auth_sessions(id) ON DELETE CASCADE;


--
-- Name: auth_sessions auth_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: auth_subjects auth_subjects_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_subjects
    ADD CONSTRAINT auth_subjects_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: bookmarks bookmarks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookmarks
    ADD CONSTRAINT bookmarks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: budget_goals budget_goals_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_goals
    ADD CONSTRAINT budget_goals_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: budget_goals budget_goals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_goals
    ADD CONSTRAINT budget_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: calendar_attendees calendar_attendees_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_attendees
    ADD CONSTRAINT calendar_attendees_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.calendar_events(id) ON DELETE CASCADE;


--
-- Name: calendar_attendees calendar_attendees_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_attendees
    ADD CONSTRAINT calendar_attendees_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- Name: calendar_events calendar_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: career_applications career_applications_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.career_applications
    ADD CONSTRAINT career_applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.career_jobs(id) ON DELETE CASCADE;


--
-- Name: career_applications career_applications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.career_applications
    ADD CONSTRAINT career_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: career_companies career_companies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.career_companies
    ADD CONSTRAINT career_companies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: career_interviews career_interviews_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.career_interviews
    ADD CONSTRAINT career_interviews_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.career_applications(id) ON DELETE CASCADE;


--
-- Name: career_jobs career_jobs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.career_jobs
    ADD CONSTRAINT career_jobs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.career_companies(id) ON DELETE SET NULL;


--
-- Name: career_jobs career_jobs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.career_jobs
    ADD CONSTRAINT career_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_message chat_message_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_message
    ADD CONSTRAINT chat_message_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chat(id) ON DELETE CASCADE;


--
-- Name: chat_message chat_message_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_message
    ADD CONSTRAINT chat_message_parent_id_fkey FOREIGN KEY (parent_message_id) REFERENCES public.chat_message(id) ON DELETE SET NULL;


--
-- Name: chat_message chat_message_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_message
    ADD CONSTRAINT chat_message_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat chat_note_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat
    ADD CONSTRAINT chat_note_id_fkey FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE;


--
-- Name: chat chat_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat
    ADD CONSTRAINT chat_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: contacts contacts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: finance_accounts finance_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_accounts
    ADD CONSTRAINT finance_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: goals goals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: key_results key_results_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.key_results
    ADD CONSTRAINT key_results_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE CASCADE;


--
-- Name: music_albums music_albums_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_albums
    ADD CONSTRAINT music_albums_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: music_artists music_artists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_artists
    ADD CONSTRAINT music_artists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: music_liked music_liked_track_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_liked
    ADD CONSTRAINT music_liked_track_id_fkey FOREIGN KEY (track_id) REFERENCES public.music_tracks(id) ON DELETE CASCADE;


--
-- Name: music_liked music_liked_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_liked
    ADD CONSTRAINT music_liked_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: music_playlist_tracks music_playlist_tracks_playlist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_playlist_tracks
    ADD CONSTRAINT music_playlist_tracks_playlist_id_fkey FOREIGN KEY (playlist_id) REFERENCES public.music_playlists(id) ON DELETE CASCADE;


--
-- Name: music_playlist_tracks music_playlist_tracks_track_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_playlist_tracks
    ADD CONSTRAINT music_playlist_tracks_track_id_fkey FOREIGN KEY (track_id) REFERENCES public.music_tracks(id) ON DELETE CASCADE;


--
-- Name: music_playlists music_playlists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_playlists
    ADD CONSTRAINT music_playlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: music_tracks music_tracks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_tracks
    ADD CONSTRAINT music_tracks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: note_shares note_shares_note_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_shares
    ADD CONSTRAINT note_shares_note_id_fkey FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE;


--
-- Name: note_shares note_shares_shared_with_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_shares
    ADD CONSTRAINT note_shares_shared_with_user_id_fkey FOREIGN KEY (shared_with_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: note_tags note_tags_note_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_tags
    ADD CONSTRAINT note_tags_note_id_fkey FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE;


--
-- Name: note_tags note_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_tags
    ADD CONSTRAINT note_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: notes notes_parent_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_parent_fk FOREIGN KEY (parent_note_id) REFERENCES public.notes(id) ON DELETE CASCADE;


--
-- Name: notes notes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: persons persons_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: places places_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.places
    ADD CONSTRAINT places_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: plaid_items plaid_items_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plaid_items
    ADD CONSTRAINT plaid_items_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.financial_institutions(id) ON DELETE SET NULL;


--
-- Name: plaid_items plaid_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plaid_items
    ADD CONSTRAINT plaid_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: possession_containers possession_containers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.possession_containers
    ADD CONSTRAINT possession_containers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: possessions possessions_container_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.possessions
    ADD CONSTRAINT possessions_container_id_fkey FOREIGN KEY (container_id) REFERENCES public.possession_containers(id) ON DELETE SET NULL;


--
-- Name: possessions_usage possessions_usage_container_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.possessions_usage
    ADD CONSTRAINT possessions_usage_container_id_fkey FOREIGN KEY (container_id) REFERENCES public.possession_containers(id) ON DELETE SET NULL;


--
-- Name: possessions_usage possessions_usage_possession_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.possessions_usage
    ADD CONSTRAINT possessions_usage_possession_id_fkey FOREIGN KEY (possession_id) REFERENCES public.possessions(id) ON DELETE CASCADE;


--
-- Name: possessions_usage possessions_usage_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.possessions_usage
    ADD CONSTRAINT possessions_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: possessions possessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.possessions
    ADD CONSTRAINT possessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: schools schools_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tag_shares tag_shares_shared_with_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag_shares
    ADD CONSTRAINT tag_shares_shared_with_user_id_fkey FOREIGN KEY (shared_with_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tag_shares tag_shares_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag_shares
    ADD CONSTRAINT tag_shares_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: tagged_items tagged_items_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tagged_items
    ADD CONSTRAINT tagged_items_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: tags tags_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task_list_collaborators task_list_collaborators_added_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_list_collaborators
    ADD CONSTRAINT task_list_collaborators_added_by_user_id_fkey FOREIGN KEY (added_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: task_list_collaborators task_list_collaborators_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_list_collaborators
    ADD CONSTRAINT task_list_collaborators_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.task_lists(id) ON DELETE CASCADE;


--
-- Name: task_list_collaborators task_list_collaborators_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_list_collaborators
    ADD CONSTRAINT task_list_collaborators_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task_list_invites task_list_invites_invited_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_list_invites
    ADD CONSTRAINT task_list_invites_invited_user_id_fkey FOREIGN KEY (invited_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: task_list_invites task_list_invites_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_list_invites
    ADD CONSTRAINT task_list_invites_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.task_lists(id) ON DELETE CASCADE;


--
-- Name: task_list_invites task_list_invites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_list_invites
    ADD CONSTRAINT task_list_invites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task_lists task_lists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_lists
    ADD CONSTRAINT task_lists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.task_lists(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.tasks(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: travel_flights travel_flights_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_flights
    ADD CONSTRAINT travel_flights_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.travel_trips(id) ON DELETE SET NULL;


--
-- Name: travel_flights travel_flights_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_flights
    ADD CONSTRAINT travel_flights_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: travel_hotels travel_hotels_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_hotels
    ADD CONSTRAINT travel_hotels_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.travel_trips(id) ON DELETE SET NULL;


--
-- Name: travel_hotels travel_hotels_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_hotels
    ADD CONSTRAINT travel_hotels_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: travel_trips travel_trips_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_trips
    ADD CONSTRAINT travel_trips_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_account user_account_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_account
    ADD CONSTRAINT user_account_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_accounts user_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_accounts
    ADD CONSTRAINT user_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_api_keys user_api_keys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_api_keys
    ADD CONSTRAINT user_api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_device_code user_device_code_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_device_code
    ADD CONSTRAINT user_device_code_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_passkey user_passkey_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_passkey
    ADD CONSTRAINT user_passkey_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_person_relations user_person_relations_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_person_relations
    ADD CONSTRAINT user_person_relations_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- Name: user_person_relations user_person_relations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_person_relations
    ADD CONSTRAINT user_person_relations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_session user_session_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_session
    ADD CONSTRAINT user_session_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: video_channels video_channels_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_channels
    ADD CONSTRAINT video_channels_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: video_subscriptions video_subscriptions_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_subscriptions
    ADD CONSTRAINT video_subscriptions_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.video_channels(id) ON DELETE CASCADE;


--
-- Name: video_subscriptions video_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_subscriptions
    ADD CONSTRAINT video_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: bookmarks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

--
-- Name: bookmarks bookmarks_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bookmarks_tenant_policy ON public.bookmarks USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: budget_goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.budget_goals ENABLE ROW LEVEL SECURITY;

--
-- Name: budget_goals budget_goals_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_goals_tenant_policy ON public.budget_goals USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: calendar_attendees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calendar_attendees ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar_attendees calendar_attendees_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY calendar_attendees_tenant_policy ON public.calendar_attendees USING ((public.app_is_service_role() OR (EXISTS ( SELECT 1
   FROM public.calendar_events e
  WHERE ((e.id = calendar_attendees.event_id) AND (e.user_id = public.app_current_user_id())))))) WITH CHECK ((public.app_is_service_role() OR (EXISTS ( SELECT 1
   FROM public.calendar_events e
  WHERE ((e.id = calendar_attendees.event_id) AND (e.user_id = public.app_current_user_id()))))));


--
-- Name: calendar_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar_events calendar_events_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY calendar_events_tenant_policy ON public.calendar_events USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: career_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.career_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: career_applications career_applications_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY career_applications_tenant_policy ON public.career_applications USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: career_companies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.career_companies ENABLE ROW LEVEL SECURITY;

--
-- Name: career_companies career_companies_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY career_companies_tenant_policy ON public.career_companies USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: career_interviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.career_interviews ENABLE ROW LEVEL SECURITY;

--
-- Name: career_interviews career_interviews_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY career_interviews_tenant_policy ON public.career_interviews USING ((public.app_is_service_role() OR (EXISTS ( SELECT 1
   FROM public.career_applications a
  WHERE ((a.id = career_interviews.application_id) AND (a.user_id = public.app_current_user_id())))))) WITH CHECK ((public.app_is_service_role() OR (EXISTS ( SELECT 1
   FROM public.career_applications a
  WHERE ((a.id = career_interviews.application_id) AND (a.user_id = public.app_current_user_id()))))));


--
-- Name: career_jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.career_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: career_jobs career_jobs_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY career_jobs_tenant_policy ON public.career_jobs USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: chat; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_message; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_message ENABLE ROW LEVEL SECURITY;

--
-- Name: contacts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

--
-- Name: contacts contacts_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY contacts_tenant_policy ON public.contacts USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: finance_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.finance_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: finance_accounts finance_accounts_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY finance_accounts_tenant_policy ON public.finance_accounts USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: finance_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: finance_transactions finance_transactions_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY finance_transactions_tenant_policy ON public.finance_transactions USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: financial_institutions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.financial_institutions ENABLE ROW LEVEL SECURITY;

--
-- Name: financial_institutions financial_institutions_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY financial_institutions_tenant_policy ON public.financial_institutions USING ((public.app_is_service_role() OR true)) WITH CHECK ((public.app_is_service_role() OR true));


--
-- Name: goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

--
-- Name: goals goals_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goals_tenant_policy ON public.goals USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: health_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;

--
-- Name: health_records health_records_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY health_records_tenant_policy ON public.health_records USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: key_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.key_results ENABLE ROW LEVEL SECURITY;

--
-- Name: key_results key_results_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY key_results_tenant_policy ON public.key_results USING ((public.app_is_service_role() OR (EXISTS ( SELECT 1
   FROM public.goals g
  WHERE ((g.id = key_results.goal_id) AND (g.user_id = public.app_current_user_id())))))) WITH CHECK ((public.app_is_service_role() OR (EXISTS ( SELECT 1
   FROM public.goals g
  WHERE ((g.id = key_results.goal_id) AND (g.user_id = public.app_current_user_id()))))));


--
-- Name: logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

--
-- Name: logs logs_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY logs_tenant_policy ON public.logs USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: music_albums; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.music_albums ENABLE ROW LEVEL SECURITY;

--
-- Name: music_albums music_albums_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY music_albums_tenant_policy ON public.music_albums USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: music_artists; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.music_artists ENABLE ROW LEVEL SECURITY;

--
-- Name: music_artists music_artists_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY music_artists_tenant_policy ON public.music_artists USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: music_liked; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.music_liked ENABLE ROW LEVEL SECURITY;

--
-- Name: music_liked music_liked_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY music_liked_tenant_policy ON public.music_liked USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: music_listening; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.music_listening ENABLE ROW LEVEL SECURITY;

--
-- Name: music_listening music_listening_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY music_listening_tenant_policy ON public.music_listening USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: music_playlist_tracks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.music_playlist_tracks ENABLE ROW LEVEL SECURITY;

--
-- Name: music_playlist_tracks music_playlist_tracks_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY music_playlist_tracks_tenant_policy ON public.music_playlist_tracks USING ((public.app_is_service_role() OR (EXISTS ( SELECT 1
   FROM public.music_playlists p
  WHERE ((p.id = music_playlist_tracks.playlist_id) AND (p.user_id = public.app_current_user_id())))))) WITH CHECK ((public.app_is_service_role() OR (EXISTS ( SELECT 1
   FROM public.music_playlists p
  WHERE ((p.id = music_playlist_tracks.playlist_id) AND (p.user_id = public.app_current_user_id()))))));


--
-- Name: music_playlists; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.music_playlists ENABLE ROW LEVEL SECURITY;

--
-- Name: music_playlists music_playlists_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY music_playlists_tenant_policy ON public.music_playlists USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: music_tracks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;

--
-- Name: music_tracks music_tracks_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY music_tracks_tenant_policy ON public.music_tracks USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: note_shares; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.note_shares ENABLE ROW LEVEL SECURITY;

--
-- Name: note_shares note_shares_owner_write_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY note_shares_owner_write_policy ON public.note_shares USING ((public.app_is_service_role() OR (EXISTS ( SELECT 1
   FROM public.notes n
  WHERE ((n.id = note_shares.note_id) AND (n.user_id = public.app_current_user_id())))))) WITH CHECK ((public.app_is_service_role() OR (EXISTS ( SELECT 1
   FROM public.notes n
  WHERE ((n.id = note_shares.note_id) AND (n.user_id = public.app_current_user_id()))))));


--
-- Name: note_shares note_shares_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY note_shares_select_policy ON public.note_shares FOR SELECT USING ((public.app_is_service_role() OR (shared_with_user_id = public.app_current_user_id()) OR (EXISTS ( SELECT 1
   FROM public.notes n
  WHERE ((n.id = note_shares.note_id) AND (n.user_id = public.app_current_user_id()))))));


--
-- Name: note_tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.note_tags ENABLE ROW LEVEL SECURITY;

--
-- Name: note_tags note_tags_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY note_tags_tenant_policy ON public.note_tags USING ((public.app_is_service_role() OR (EXISTS ( SELECT 1
   FROM public.notes n
  WHERE ((n.id = note_tags.note_id) AND (n.user_id = public.app_current_user_id())))))) WITH CHECK ((public.app_is_service_role() OR (EXISTS ( SELECT 1
   FROM public.notes n
  WHERE ((n.id = note_tags.note_id) AND (n.user_id = public.app_current_user_id()))))));


--
-- Name: notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

--
-- Name: notes notes_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notes_tenant_policy ON public.notes USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: persons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;

--
-- Name: persons persons_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY persons_tenant_policy ON public.persons USING ((public.app_is_service_role() OR (owner_user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (owner_user_id = public.app_current_user_id())));


--
-- Name: places; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

--
-- Name: places places_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY places_tenant_policy ON public.places USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: plaid_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plaid_items ENABLE ROW LEVEL SECURITY;

--
-- Name: plaid_items plaid_items_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY plaid_items_tenant_policy ON public.plaid_items USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: possession_containers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.possession_containers ENABLE ROW LEVEL SECURITY;

--
-- Name: possession_containers possession_containers_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY possession_containers_tenant_policy ON public.possession_containers USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: possessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.possessions ENABLE ROW LEVEL SECURITY;

--
-- Name: possessions possessions_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY possessions_tenant_policy ON public.possessions USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: possessions_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.possessions_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: possessions_usage possessions_usage_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY possessions_usage_tenant_policy ON public.possessions_usage USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: schools; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

--
-- Name: schools schools_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY schools_tenant_policy ON public.schools USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: searches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.searches ENABLE ROW LEVEL SECURITY;

--
-- Name: searches searches_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY searches_tenant_policy ON public.searches USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: tag_shares; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tag_shares ENABLE ROW LEVEL SECURITY;

--
-- Name: tag_shares tag_shares_owner_write_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tag_shares_owner_write_policy ON public.tag_shares USING ((public.app_is_service_role() OR (EXISTS ( SELECT 1
   FROM public.tags t
  WHERE ((t.id = tag_shares.tag_id) AND (t.owner_id = public.app_current_user_id())))))) WITH CHECK ((public.app_is_service_role() OR (EXISTS ( SELECT 1
   FROM public.tags t
  WHERE ((t.id = tag_shares.tag_id) AND (t.owner_id = public.app_current_user_id()))))));


--
-- Name: tag_shares tag_shares_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tag_shares_select_policy ON public.tag_shares FOR SELECT USING ((public.app_is_service_role() OR (shared_with_user_id = public.app_current_user_id()) OR (EXISTS ( SELECT 1
   FROM public.tags t
  WHERE ((t.id = tag_shares.tag_id) AND (t.owner_id = public.app_current_user_id()))))));


--
-- Name: tagged_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tagged_items ENABLE ROW LEVEL SECURITY;

--
-- Name: tagged_items tagged_items_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tagged_items_tenant_policy ON public.tagged_items USING ((public.app_is_service_role() OR (EXISTS ( SELECT 1
   FROM public.tags t
  WHERE ((t.id = tagged_items.tag_id) AND (t.owner_id = public.app_current_user_id())))))) WITH CHECK ((public.app_is_service_role() OR (EXISTS ( SELECT 1
   FROM public.tags t
  WHERE ((t.id = tagged_items.tag_id) AND (t.owner_id = public.app_current_user_id()))))));


--
-- Name: tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

--
-- Name: tags tags_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tags_tenant_policy ON public.tags USING ((public.app_is_service_role() OR (owner_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (owner_id = public.app_current_user_id())));


--
-- Name: task_list_collaborators; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_list_collaborators ENABLE ROW LEVEL SECURITY;

--
-- Name: task_list_collaborators task_list_collaborators_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_list_collaborators_tenant_policy ON public.task_list_collaborators USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()) OR (EXISTS ( SELECT 1
   FROM public.task_lists tl
  WHERE ((tl.id = task_list_collaborators.list_id) AND (tl.user_id = public.app_current_user_id())))))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id()) OR (EXISTS ( SELECT 1
   FROM public.task_lists tl
  WHERE ((tl.id = task_list_collaborators.list_id) AND (tl.user_id = public.app_current_user_id()))))));


--
-- Name: task_list_invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_list_invites ENABLE ROW LEVEL SECURITY;

--
-- Name: task_list_invites task_list_invites_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_list_invites_tenant_policy ON public.task_list_invites USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()) OR (invited_user_id = public.app_current_user_id()) OR (EXISTS ( SELECT 1
   FROM public.task_lists tl
  WHERE ((tl.id = task_list_invites.list_id) AND (tl.user_id = public.app_current_user_id())))))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id()) OR (EXISTS ( SELECT 1
   FROM public.task_lists tl
  WHERE ((tl.id = task_list_invites.list_id) AND (tl.user_id = public.app_current_user_id()))))));


--
-- Name: task_lists; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_lists ENABLE ROW LEVEL SECURITY;

--
-- Name: task_lists task_lists_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_lists_tenant_policy ON public.task_lists USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks tasks_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tasks_tenant_policy ON public.tasks USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: travel_flights; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.travel_flights ENABLE ROW LEVEL SECURITY;

--
-- Name: travel_flights travel_flights_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY travel_flights_tenant_policy ON public.travel_flights USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: travel_hotels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.travel_hotels ENABLE ROW LEVEL SECURITY;

--
-- Name: travel_hotels travel_hotels_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY travel_hotels_tenant_policy ON public.travel_hotels USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: travel_trips; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.travel_trips ENABLE ROW LEVEL SECURITY;

--
-- Name: travel_trips travel_trips_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY travel_trips_tenant_policy ON public.travel_trips USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: user_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: user_accounts user_accounts_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_accounts_tenant_policy ON public.user_accounts USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: user_api_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: user_api_keys user_api_keys_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_api_keys_tenant_policy ON public.user_api_keys USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: user_person_relations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_person_relations ENABLE ROW LEVEL SECURITY;

--
-- Name: user_person_relations user_person_relations_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_person_relations_tenant_policy ON public.user_person_relations USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: user_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_sessions user_sessions_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_sessions_tenant_policy ON public.user_sessions USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_tenant_policy ON public.users USING ((public.app_is_service_role() OR (id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (id = public.app_current_user_id())));


--
-- Name: video_channels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.video_channels ENABLE ROW LEVEL SECURITY;

--
-- Name: video_channels video_channels_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY video_channels_tenant_policy ON public.video_channels USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: video_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.video_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: video_subscriptions video_subscriptions_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY video_subscriptions_tenant_policy ON public.video_subscriptions USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- Name: video_viewings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.video_viewings ENABLE ROW LEVEL SECURITY;

--
-- Name: video_viewings video_viewings_tenant_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY video_viewings_tenant_policy ON public.video_viewings USING ((public.app_is_service_role() OR (user_id = public.app_current_user_id()))) WITH CHECK ((public.app_is_service_role() OR (user_id = public.app_current_user_id())));


--
-- PostgreSQL database dump complete
--



-- +goose StatementEnd

-- +goose Down
DO $$ BEGIN RAISE NOTICE 'baseline down migration is intentionally a no-op'; END $$;
