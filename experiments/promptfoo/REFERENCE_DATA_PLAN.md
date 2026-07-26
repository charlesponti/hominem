# Reference Data Layer — Deployment Plan

## Goal

Load public reference datasets (US state tax, COVID, TfL) into Hominem's production Postgres so promptfoo assertions can cross-reference model output against source-of-truth data instead of hardcoded magic values. The same data becomes available to the career app, API, and any future consumer.

## Current Infrastructure

```text
Railway project: ponti-studios/hominem (production)
  Postgres:      intuitive-youth-volume (0.2 GB / 4.9 GB used)
  Internal:      db.railway.internal:5432
  Public proxy:  (check: railway variables get DATABASE_PUBLIC_URL)
  Services:      api, career, worker, commune, labyrinth, Redis

Local dev:
  Postgres:      docker compose (127.0.0.1:5434, db: app-test)
  DATABASE_URL:  postgresql://postgres:postgres@127.0.0.1:5434/app-test
  Goose:         ~/go/bin/goose (v3.27.0)
  Railway CLI:   5.26.0, authenticated

Promptfoo:
  Runs via:      just eval run <config>
  Dir:           experiments/promptfoo/
  Assertions:    experiments/promptfoo/assertions/*.js
```

## Datasets

### 1. US State Tax (LevyIO, CC BY 4.0)

**Source:** `apps/career/app/lib/offer-comparison/state-raw.json` (2,606 lines, 51 states)

**Shape:** Per state: tax system type, top marginal rate, brackets for single + married (min/max/rate tuples), standard deduction, capital gains description, property tax rate, sales tax rate.

**51 states × ~3 brackets per status × 2 statuses = 315 bracket rows. Trivial.**

**Refresh:** Annual (tax year 2027, then 2028). Run the generator script again when a new `state-raw.json` is available.

### 2. COVID-19 (OWID, CC BY)

**Source:** `https://github.com/owid/covid-19-data/blob/master/public/data/owid-covid-data.csv`

Full global dataset. 200+ countries × daily observations since Jan 2020 = ~429K rows. 67 columns.

**Storage estimate:** ~429K rows × 67 typed columns (bigint, real, date, not text) ≈ 150–180 MB table + 30 MB indexes ≈ 200 MB total. Railway Postgres has 4.7 GB free (0.2 GB / 4.9 GB used). Fine.

**Full column set.** All 69 columns — promptfoo experiments may need any of them (reproduction rate, excess mortality, vaccination rates by country, etc.). Subsetting to a curated set would be premature optimization; `real` and `bigint` columns are cheap.

**Load once.** The dataset is stable — OWID stopped daily updates as the pandemic wound down. The CSV on GitHub represents the final state. No recurring refresh needed. If a future experiment needs live data, we add a recurring seed job then.

### 3. TfL Camera Data (Transport for London, Open Data)

**Source:** TfL Unified API, 4 endpoints:

| Endpoint | Count | ID prefix | Source system |
|---|---|---|---|---|
| `Place/Type/JamCam` | 882 | `JamCams_` | JamCams |
| `Place/Type/RedLightCam` | 254 | `LscpCams_` | LscpCams |
| `Place/Type/SpeedCam` | 526 | `LscpCams_` | LscpCams |
| `Place/Type/RedLightAndSpeedCam` | 2 | `LscpCams_` | LscpCams |
| **Total** | **1,664** | | |

**Shared envelope across all 4 types:**
```json
{
  "id": "JamCams_00002.00865",
  "url": "/Place/JamCams_00002.00865",
  "commonName": "A406 Billet Upass E",
  "placeType": "JamCam",
  "lat": 51.60067,
  "lon": -0.01594,
  "additionalProperties": [ /* varies by type */ ]
}
```

**Two distinct property schemas:**

**JamCam** (4 keys): `available` (bool), `imageUrl` (S3 .jpg), `videoUrl` (S3 .mp4), `view` (compass direction)

**LSCP** — RedLightCam, SpeedCam, RedLightAndSpeedCam (8 keys): `speedLimit`, `lscpType` (Red-light / Fixed / Fixed Digital / Combined Red and Speed), `siteLength`, `borough`, `authority`, `road1`, `road2`, `dateEstablished`

**Refresh:** Cameras change slowly. One-shot load from the API, with a `just seed-tfl` command for refreshes.

## Schema

### Table: app.state_taxes

```sql
CREATE TABLE app.state_taxes (
  slug                text PRIMARY KEY,
  name                text NOT NULL,
  abbreviation        text NOT NULL,
  tax_system          text NOT NULL,  -- 'none', 'flat', 'progressive'
  top_marginal_rate   real NOT NULL,
  standard_deduction_single real,
  standard_deduction_married real,
  capital_gains       text,
  property_tax_rate   real,
  sales_tax_rate      real
);
```

### Table: app.state_tax_brackets

```sql
CREATE TABLE app.state_tax_brackets (
  id            serial PRIMARY KEY,
  state_slug    text NOT NULL REFERENCES app.state_taxes(slug),
  filing_status text NOT NULL,  -- 'single', 'married'
  min_amount    real NOT NULL,
  max_amount    real NOT NULL,
  rate          real NOT NULL
);
CREATE INDEX ON app.state_tax_brackets (state_slug, filing_status);
```

### Table: app.covid_data (full global, all columns)

```sql
CREATE TABLE app.covid_data (
  id                    serial PRIMARY KEY,
  iso_code              text NOT NULL,
  continent             text,
  location              text NOT NULL,
  date                  date NOT NULL,
  -- Cases
  total_cases                   bigint,
  new_cases                     real,
  new_cases_smoothed            real,
  total_cases_per_million       real,
  new_cases_per_million         real,
  new_cases_smoothed_per_million real,
  -- Deaths
  total_deaths                  bigint,
  new_deaths                    real,
  new_deaths_smoothed           real,
  total_deaths_per_million      real,
  new_deaths_per_million        real,
  new_deaths_smoothed_per_million real,
  -- Reproduction & hospital
  reproduction_rate             real,
  icu_patients                  bigint,
  icu_patients_per_million      real,
  hosp_patients                 bigint,
  hosp_patients_per_million     real,
  weekly_icu_admissions         real,
  weekly_icu_admissions_per_million real,
  weekly_hosp_admissions        real,
  weekly_hosp_admissions_per_million real,
  -- Testing
  total_tests                   bigint,
  new_tests                     real,
  total_tests_per_thousand      real,
  new_tests_per_thousand        real,
  new_tests_smoothed            real,
  new_tests_smoothed_per_thousand real,
  positive_rate                 real,
  tests_per_case                real,
  tests_units                   text,
  -- Vaccinations
  total_vaccinations            bigint,
  people_vaccinated             bigint,
  people_fully_vaccinated       bigint,
  total_boosters                bigint,
  new_vaccinations              real,
  new_vaccinations_smoothed     real,
  total_vaccinations_per_hundred real,
  people_vaccinated_per_hundred real,
  people_fully_vaccinated_per_hundred real,
  total_boosters_per_hundred    real,
  new_vaccinations_smoothed_per_million real,
  new_people_vaccinated_smoothed real,
  new_people_vaccinated_smoothed_per_hundred real,
  -- Demographics (static per country, denormalized)
  population                    bigint,
  population_density            real,
  median_age                    real,
  aged_65_older                 real,
  aged_70_older                 real,
  gdp_per_capita                real,
  extreme_poverty               real,
  cardiovasc_death_rate         real,
  diabetes_prevalence           real,
  female_smokers                real,
  male_smokers                  real,
  handwashing_facilities        real,
  hospital_beds_per_thousand    real,
  life_expectancy               real,
  human_development_index       real,
  -- Excess mortality
  excess_mortality_cumulative_absolute   real,
  excess_mortality_cumulative            real,
  excess_mortality                       real,
  excess_mortality_cumulative_per_million real,
  -- Policy
  stringency_index              real
);
CREATE INDEX ON app.covid_data (iso_code);
CREATE INDEX ON app.covid_data (date);
CREATE UNIQUE INDEX ON app.covid_data (iso_code, date);
```
**All 67 columns as-are from OWID.** No curation — promptfoo experiments need arbitrary columns (reproduction rate for epidemiology questions, stringency index for policy analysis, excess mortality for cross-country comparison). Real/bigint columns are cheap; shrinking now would just force a schema migration later.

**Primary lookup key is `(iso_code, date)`.** One row per country per day. ~429K rows.

### Table: app.tfl_cameras

```sql
CREATE TABLE app.tfl_cameras (
  id            serial PRIMARY KEY,
  tfl_id        text NOT NULL UNIQUE,        -- e.g. "JamCams_00002.00865"
  common_name   text NOT NULL,
  place_type    text NOT NULL,               -- 'JamCam', 'RedLightCam', 'SpeedCam', 'RedLightAndSpeedCam'
  lat           real NOT NULL,
  lng           real NOT NULL,
  properties    jsonb NOT NULL DEFAULT '{}', -- type-specific additionalProperties, flattened to {key: value}
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON app.tfl_cameras (place_type);
CREATE INDEX ON app.tfl_cameras USING gist (ll_to_earth(lat, lng));
```

**Why JSONB, not nullable columns?** The 4 camera types have ~14 distinct property keys total, but they group into two disjoint schemas (JamCam has 4 keys, LSCP has 8). A single table with per-type nullable columns would have 10+ NULLs per row. JSONB is clean: `properties->>'imageUrl'` for JamCam, `properties->>'speedLimit'` for LSCP. PostgreSQL JSONB is indexable and queryable. If a specific property gets heavy query use, we extract it into a generated column later.

**Why `place_type` as a column?** Filtering by type (`WHERE place_type = 'SpeedCam'`) is the most common query. Indexed. The `tfl_id` includes the prefix (`JamCams_` vs `LscpCams_`) but a column is cleaner.

**~1,664 rows total.** Completely trivial storage.

## Migration Files

### Migration 1: DDL (schema only)

`packages/db/migrations/20260726000000_create_reference_data_tables.sql`

```sql
-- +goose Up
CREATE TABLE app.state_taxes (...);
CREATE TABLE app.state_tax_brackets (...);
CREATE INDEX ...;
CREATE TABLE app.covid_data (...);
CREATE UNIQUE INDEX ...;
CREATE TABLE app.tfl_cameras (...);
CREATE INDEX ...;

-- +goose Down
DROP TABLE IF EXISTS app.tfl_cameras;
DROP TABLE IF EXISTS app.covid_data;
DROP TABLE IF EXISTS app.state_tax_brackets;
DROP TABLE IF EXISTS app.state_taxes;
```

### Migration 2: Seed state tax data (generated)

`packages/db/migrations/20260726000100_seed_state_tax_data.sql`

Generated by a script that reads `state-raw.json` and emits `INSERT INTO ... VALUES (...)` blocks. The generated SQL is committed to the repo; the generator is a dev tool for re-seeding when rates change.

**Why generated rather than hand-written?** 51 states × ~12 brackets × 2 statuses = 1,200+ INSERTs. Hand-editing that is error-prone. The generator is ~60 lines of TypeScript that reads JSON and emits SQL.

**Generator:** `packages/db/scripts/generate-state-tax-seed.ts`

Reads `state-raw.json`, emits SQL with:
- `INSERT INTO app.state_taxes (slug, name, ...) VALUES (...), (...), ...;`
- `INSERT INTO app.state_tax_brackets (state_slug, filing_status, min_amount, max_amount, rate) VALUES (...), (...), ...;`

## Seed Scripts (Non-migration data)

COVID and TfL data come from external sources (GitHub CSV, live API) — they can't be in a Goose migration. Separate seed scripts.

### Seed: COVID

`packages/db/scripts/seed-covid.ts`

```text
1. Download owid-covid-data.csv from GitHub (~50 MB compressed, ~400 MB raw)
   URL: https://raw.githubusercontent.com/owid/covid-19-data/master/public/data/owid-covid-data.csv
2. Cache locally at _data/owid-covid-data.csv (skip download if exists)
3. Stream-parse CSV, batch INSERT (5,000 rows/batch for perf)
4. ON CONFLICT (iso_code, date) DO NOTHING for idempotency
5. Print: rows inserted, countries loaded, date range
```

Run: `just seed-covid`

Expected: ~400K rows, 200+ countries, 2020-01-03 to ~2025-06.

### Seed: TfL

`packages/db/scripts/seed-tfl.ts`

```text
1. Fetch all 4 endpoints:
   - GET https://api.tfl.gov.uk/Place/Type/JamCam
   - GET https://api.tfl.gov.uk/Place/Type/RedLightCam
   - GET https://api.tfl.gov.uk/Place/Type/SpeedCam
   - GET https://api.tfl.gov.uk/Place/Type/RedLightAndSpeedCam
2. Transform each response:
   - Extract: tfl_id = item.id, common_name = item.commonName, place_type = item.placeType, lat, lng = item.lon
   - Flatten additionalProperties array to {key: value} object
3. UPSERT all by tfl_id (ON CONFLICT tfl_id DO UPDATE)
4. Print: rows per type, total
```

Run: `just seed-tfl`

Expected: ~1,664 rows across 4 place_types.

## Promptfoo Integration

### Local dev — connects to local test Postgres

Promptfoo assertions import a thin query module from `packages/db`:

```js
// experiments/promptfoo/assertions/offer-extraction.js
const { queryStateTax, computeStateTax } = require('../../packages/db/src/reference-data');

// Instead of hardcoding:
//   check(o.currency, 'USD', 'currency')
// Derive from DB:
const tax = computeStateTax(loc, salary, status);
check(o.currency, tax.currency, 'currency');
```

**The query module** (`packages/db/src/reference-data.ts`):

```typescript
import pg from 'pg';

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

export async function queryStateTax(slug: string): Promise<StateTaxRow | null> {
  const { rows } = await getPool().query(
    'SELECT * FROM app.state_taxes WHERE slug = $1', [slug]
  );
  return rows[0] ?? null;
}

export async function getStateBrackets(slug: string, status: string): Promise<BracketRow[]> {
  const { rows } = await getPool().query(
    'SELECT * FROM app.state_tax_brackets WHERE state_slug = $1 AND filing_status = $2 ORDER BY min_amount',
    [slug, status]
  );
  return rows;
}

export function computeStateTax(brackets: BracketRow[], gross: number, deduction: number): number {
  // same logic as state.ts but queries the DB
}
```

**Running promptfoo locally:**

```bash
# 1. Ensure test DB has reference tables (migrations already applied)
just db migrate test

# 2. Run promptfoo with DATABASE_URL set
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5434/app-test just eval run offer-extraction
```

### CI — same pattern

CI runs `just db migrate test` before promptfoo, same DATABASE_URL.

### Production verification — Railway one-off

To verify assertions against production data:

```bash
# Tunnel to Railway Postgres
railway connect &
sleep 5

# Get the tunnel proxy address (Railway prints it)
# Run promptfoo through the tunnel
DATABASE_URL=postgresql://user:pass@localhost:XXXXX/railway just eval run offer-extraction
```

Or use `railway run` with the public proxy if enabled:

```bash
railway run -- just eval run offer-extraction
```

## Deployment Procedure

### Step 1: Generate seed migration (local)

```bash
# Run the generator — reads state-raw.json, writes the seed SQL
pnpm exec tsx packages/db/scripts/generate-state-tax-seed.ts

# Verify the output
wc -l packages/db/migrations/20260726000100_seed_state_tax_data.sql
# Should be ~3,000 lines of INSERTs
```

### Step 2: Run migrations against local test DB

```bash
just db migrate test
just db status test
# Verify: state_taxes has 51 rows
```

### Step 3: Regenerate Kysely types

```bash
just db codegen
# Verify types/database.ts now has AppStateTaxes, AppStateTaxBrackets, etc.
```

### Step 4: Run migrations against production Postgres

```bash
# Tunnel to Railway database
railway connect &
# Wait a few seconds for the tunnel to be ready
sleep 5

# Railway connect prints something like:
#   Proxying localhost:XXXXX → database (Postgres)

# Grab the proxy port from the output, then:
DATABASE_URL="postgresql://postgres:<password>@localhost:<proxy_port>/railway" goose \
  -dir packages/db/migrations postgres "$DATABASE_URL" up

# OR: Use Railway's public TCP proxy if enabled
railway variables get DATABASE_PUBLIC_URL
# Then connect directly:
DATABASE_URL="<public_url>" goose -dir packages/db/migrations postgres "$DATABASE_URL" up
```

Alternative if the public TCP proxy is not enabled — use `railway run`:

```bash
# Railway injects env vars and runs command in a context that can reach db.railway.internal
# BUT: this requires Goose to be on the PATH in Railway's ephemeral container
# which it won't be since it's a Go binary installed locally

# Instead, use railway run to get the DATABASE_URL, then connect through the tunnel:
railway run --env DATABASE_URL -- printenv DATABASE_URL
# This prints the internal URL — but you can't reach db.railway.internal from local

# Best option: enable TCP proxy for the database
railway service database tcp-proxy enable
# Then:
export DATABASE_URL=$(railway variables get DATABASE_PUBLIC_URL)
goose -dir packages/db/migrations postgres "$DATABASE_URL" up
```

### Step 5: Verify production data

```bash
# After migrations succeed, verify row counts
# Using tunnel connection:
psql "$DATABASE_URL" -c "SELECT count(*) FROM app.state_taxes;"
# Expected: 51

psql "$DATABASE_URL" -c "SELECT count(*) FROM app.state_tax_brackets;"
# Expected: 315

psql "$DATABASE_URL" -c "SELECT slug, name, tax_system FROM app.state_taxes ORDER BY slug LIMIT 5;"
# Spot check
```

### Step 6: Deploy seed scripts (COVID + TfL)

```bash
# COVID seed — downloads CSV from GitHub, inserts ALL countries
DATABASE_URL="<production_url>" pnpm exec tsx packages/db/scripts/seed-covid.ts

# Verify
psql "$DATABASE_URL" -c "SELECT count(*) AS rows, count(DISTINCT iso_code) AS countries, min(date), max(date) FROM app.covid_data;"
# Expected: ~400K rows, 200+ countries, 2020→2025

# TfL seed — fetches from all 4 TfL endpoints, upserts
DATABASE_URL="<production_url>" pnpm exec tsx packages/db/scripts/seed-tfl.ts

# Verify
psql "$DATABASE_URL" -c "SELECT place_type, count(*) FROM app.tfl_cameras GROUP BY place_type ORDER BY count(*) DESC;"
# Expected: JamCam ~882, SpeedCam ~526, RedLightCam ~254, RedLightAndSpeedCam ~250
```

## Accessing Data from Local Dev

### Using the Railway TCP proxy (preferred)

```bash
# One-time: enable TCP proxy for the database service
railway service database tcp-proxy enable

# Get the public connection string
railway variables get DATABASE_PUBLIC_URL
# postgresql://postgres:<password>@<host>:<port>/railway

# Set locally
export DATABASE_PUBLIC_URL="$(railway variables get DATABASE_PUBLIC_URL)"
```

### Using the Railway tunnel (alternative, no public exposure)

```bash
# Start tunnel
railway connect &
sleep 5

# Railway prints the proxy address — e.g., localhost:53921
# Connect through it:
psql "postgresql://postgres:<pass>@localhost:53921/railway"
```

### Adding to justfile

```just
# just/reference.just

seed-state-tax:
    cd "{{ justfile_directory() }}" && \
    pnpm exec tsx packages/db/scripts/generate-state-tax-seed.ts && \
    echo "Generated: packages/db/migrations/20260726000100_seed_state_tax_data.sql"

seed-covid url='':
    #!/usr/bin/env bash
    url="{{ url }}"
    if [[ -z "$url" ]]; then
      url=$(railway variables get DATABASE_PUBLIC_URL 2>/dev/null || echo "$DATABASE_URL")
    fi
    DATABASE_URL="$url" pnpm exec tsx packages/db/scripts/seed-covid.ts

seed-tfl url='':
    #!/usr/bin/env bash
    url="{{ url }}"
    if [[ -z "$url" ]]; then
      url=$(railway variables get DATABASE_PUBLIC_URL 2>/dev/null || echo "$DATABASE_URL")
    fi
    DATABASE_URL="$url" pnpm exec tsx packages/db/scripts/seed-tfl.ts
```

## Rollback

### Migrations

```bash
# Roll back the seed migration first (drops data, keeps schema)
goose -dir packages/db/migrations postgres "$DATABASE_URL" down

# Roll back the schema migration (drops tables)
goose -dir packages/db/migrations postgres "$DATABASE_URL" down
```

### Seed scripts

COVID and TfL seed scripts are idempotent by design — running them again overwrites existing data. To roll back:

```sql
-- Remove seed data without dropping the table
TRUNCATE app.covid_data;
TRUNCATE app.tfl_cameras;
```

## Verification Checklist

Run after each production deployment:

```bash
# 1. Row counts
psql "$DATABASE_URL" -c "
  SELECT 'state_taxes' as tbl, count(*) FROM app.state_taxes
  UNION ALL
  SELECT 'state_tax_brackets', count(*) FROM app.state_tax_brackets
  UNION ALL
  SELECT 'covid_data', count(*) FROM app.covid_data
  UNION ALL
  SELECT 'tfl_cameras', count(*) FROM app.tfl_cameras;
"

# 2. State tax spot check — California single filer at $215k
psql "$DATABASE_URL" -c "
  SELECT slug, tax_system, top_marginal_rate, standard_deduction_single
  FROM app.state_taxes WHERE slug = 'california';
"
# Expected: progressive, ~13.3, ~5,363

# 3. Bracket coverage — every state should have ≥2 brackets per filing status
psql "$DATABASE_URL" -c "
  SELECT state_slug, filing_status, count(*)
  FROM app.state_tax_brackets
  GROUP BY state_slug, filing_status
  ORDER BY count(*);
"
# Non-"none" states should have ≥2 per status

# 4. COVID — global coverage
psql "$DATABASE_URL" -c "
  SELECT count(*) AS rows, count(DISTINCT iso_code) AS countries,
         min(date) AS first_date, max(date) AS last_date
  FROM app.covid_data;
"
# Expected: ~400K rows, 200+ countries, 2020→2025

psql "$DATABASE_URL" -c "
  SELECT iso_code, location, max(total_cases) AS cases, max(population) AS pop
  FROM app.covid_data WHERE iso_code IN ('USA', 'GBR', 'CHN', 'IND')
  GROUP BY iso_code, location;
"
# Spot-check major countries

# 5. TfL — 4 camera types, geospatial sanity
psql "$DATABASE_URL" -c "
  SELECT place_type, count(*) FROM app.tfl_cameras GROUP BY place_type ORDER BY count(*) DESC;
"
# Expected: JamCam ~882, SpeedCam ~526, RedLightCam ~254, RedLightAndSpeedCam ~250

psql "$DATABASE_URL" -c "
  SELECT round(avg(lat)::numeric, 4) AS avg_lat, round(avg(lng)::numeric, 4) AS avg_lng
  FROM app.tfl_cameras;
"
# Expected: lat ~51.5, lng ~-0.1 (all London)

psql "$DATABASE_URL" -c "
  SELECT place_type, properties->>'imageUrl' IS NOT NULL AS has_image,
         properties->>'speedLimit' IS NOT NULL AS has_speed
  FROM app.tfl_cameras GROUP BY place_type, has_image, has_speed ORDER BY place_type;
"
# JamCam: has_image=true, has_speed=false
# RedLightCam/SpeedCam/RedLightAndSpeedCam: has_image=false, has_speed=true
```

## What Changes in the Codebase

| File | Action | Purpose |
|---|---|---|
| `packages/db/migrations/20260726*_reference_data.sql` | Create (2 files) | Schema + state tax seed |
| `packages/db/scripts/generate-state-tax-seed.ts` | Create | Generator for the seed SQL |
| `packages/db/scripts/seed-covid.ts` | Create | COVID CSV → Postgres |
| `packages/db/scripts/seed-tfl.ts` | Create | TfL API → Postgres |
| `packages/db/src/reference-data.ts` | Create | Thin query module (pg Pool, no Kysely) |
| `packages/db/package.json` | Edit | Add `pg` if not already a direct dep (it's already transitive via Kysely) |
| `just/reference.just` | Create | Just commands for seed + verify |
| `justfile` | Edit | Add `mod reference 'just/reference.just'` |
| `experiments/promptfoo/assertions/offer-extraction.js` | Edit | Use `reference-data.ts` queries instead of hardcoded expected values |
| `apps/career/app/lib/offer-comparison/state.ts` | Eventually delete | Once career app migrates to DB queries |

## Timeline

| Phase | Duration | Depends on |
|---|---|---|
| 1. State tax migration + seed SQL generator | 30 min | Nothing |
| 2. Deploy to Railway + verify | 30 min | TCP proxy enabled |
| 3. Query module + promptfoo wiring | 1 hr | Phase 2 |
| 4. COVID seed script + deploy | 30 min | Phase 2 |
| 5. TfL seed script + deploy | 30 min | Phase 2 |
| 6. Career app migration (optional) | 1 hr | Phase 2 |

Start with Phase 1-2 (state tax only) — it's the dataset promptfoo already needs. COVID and TfL are independent additions.

---

_(End of plan. Start interrogation.)_
