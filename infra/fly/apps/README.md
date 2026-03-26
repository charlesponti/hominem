# Fly App Deployment

This repo now includes a Fly-first production topology:

- `hominem-postgres` on Fly using the custom Postgres 18 image from `infra/docker/images/postgres/Dockerfile`
- `hominem-api` on Fly at `api.ponti.io`
- `hominem-workers` on Fly as a private always-on worker process
- `hominem-web` on Fly at `app.ponti.io`
- Upstash Redis as the managed Redis backing store

## Why this shape

- PostgreSQL stays on Fly because the schema requires extensions that Fly Managed Postgres does not fully support, especially `pgrouting`
- Redis stays managed via Upstash because the app uses standard Redis + BullMQ features and does not need a custom Redis image
- Web and API use custom domains on separate subdomains and share auth cookies via `.ponti.io`

## Files

- `infra/fly/apps/postgres.toml`
- `infra/fly/apps/api.toml`
- `infra/fly/apps/workers.toml`
- `infra/fly/apps/web.toml`
- `apps/web/Dockerfile`

## Apps and domains

- `hominem-postgres` -> private Flycast app
- `hominem-api` -> `api.ponti.io`
- `hominem-workers` -> private Fly app
- `hominem-web` -> `app.ponti.io`

## Prerequisites

1. Install and log into `flyctl`
2. Provision an Upstash Redis database and copy the Redis TCP `REDIS_URL`
3. Gather production secrets for API and workers

## Create apps

Run from the repo root:

```bash
fly apps create hominem-postgres
fly apps create hominem-api
fly apps create hominem-workers
fly apps create hominem-web
```

## Create Postgres volume and private IP

```bash
fly volumes create pg_data --app hominem-postgres --region sjc --size 50
fly ips allocate-v6 --private --app hominem-postgres
```

## Set Postgres secret

```bash
fly secrets set POSTGRES_PASSWORD='replace-me' --app hominem-postgres
```

## Deploy order

Deploy from the repo root:

```bash
fly deploy --config infra/fly/apps/postgres.toml
fly deploy --config infra/fly/apps/api.toml
fly deploy --config infra/fly/apps/workers.toml
fly deploy --config infra/fly/apps/web.toml
```

## Required secrets

### `hominem-api`

At minimum:

```bash
fly secrets set \
  DATABASE_URL='postgresql://postgres:replace-me@hominem-postgres.flycast:5432/hominem?sslmode=disable' \
  REDIS_URL='redis://default:replace-me@your-upstash-host:6379' \
  BETTER_AUTH_SECRET='replace-me' \
  COOKIE_SECRET='replace-me' \
  RESEND_API_KEY='replace-me' \
  RESEND_FROM_EMAIL='replace-me' \
  RESEND_FROM_NAME='replace-me' \
  R2_ENDPOINT='replace-me' \
  R2_ACCESS_KEY_ID='replace-me' \
  R2_SECRET_ACCESS_KEY='replace-me' \
  R2_BUCKET_NAME='replace-me' \
  OPENROUTER_API_KEY='replace-me' \
  OTEL_EXPORTER_OTLP_ENDPOINT='https://hominem-otel.fly.dev' \
  --app hominem-api
```

Add optional secrets as needed for Plaid, Google, Twitter, Apple auth, and OpenAI audio features.

### `hominem-workers`

```bash
fly secrets set \
  DATABASE_URL='postgresql://postgres:replace-me@hominem-postgres.flycast:5432/hominem?sslmode=disable' \
  REDIS_URL='redis://default:replace-me@your-upstash-host:6379' \
  GOOGLE_API_KEY='replace-me' \
  OPENROUTER_API_KEY='replace-me' \
  R2_ENDPOINT='replace-me' \
  R2_ACCESS_KEY_ID='replace-me' \
  R2_SECRET_ACCESS_KEY='replace-me' \
  R2_BUCKET_NAME='replace-me' \
  OTEL_EXPORTER_OTLP_ENDPOINT='https://hominem-otel.fly.dev' \
  --app hominem-workers
```

Add Plaid secrets if finance workers are enabled in production.

### `hominem-web`

```bash
fly secrets set \
  OTEL_EXPORTER_OTLP_ENDPOINT='https://hominem-otel.fly.dev' \
  --app hominem-web
```

Add PostHog env vars if you want analytics enabled.
If `OTEL_EXPORTER_OTLP_ENDPOINT` is omitted, browser telemetry stays disabled in production instead of falling back to `localhost`.

## Run database migrations

Use the existing Goose workflow after Postgres is deployed:

```bash
DATABASE_URL='postgresql://postgres:replace-me@hominem-postgres.flycast:5432/hominem?sslmode=disable' \
goose -dir packages/db/migrations postgres "$DATABASE_URL" up
```

## Attach custom domains

```bash
fly certs add api.ponti.io --app hominem-api
fly certs add app.ponti.io --app hominem-web
```

Then add the required DNS records in your DNS provider.

## Verification

- API health: `curl https://api.ponti.io/api/status`
- Web: `curl -I https://app.ponti.io`
- Workers: `fly logs --app hominem-workers`
- OTEL ingest: `curl -i https://hominem-otel.fly.dev/v1/traces`
- Postgres private IPs only: `fly ips list --app hominem-postgres`

## Notes

- `AUTH_COOKIE_DOMAIN` is set to `.ponti.io` so auth cookies can span `app.ponti.io` and `api.ponti.io`
- `AUTH_PASSKEY_RP_ID` stays `api.ponti.io` for the first production rollout
- The web app now reads browser OTLP settings from runtime env instead of hardcoding `localhost`
