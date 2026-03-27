# Fly Migration Session Spec

## Purpose

This document captures the implementation work completed during the Fly migration session across two related systems:

1. the self-hosted observability stack now represented in `/infra/fly/observability`
2. the `hominem` production deployment migration in `/Users/charlesponti/Developer/hominem`

It is intended to serve as a handoff and execution reference for finishing the remaining rollout work without re-discovering architecture decisions made during the session.

## Scope

This session covered:

- replacing the earlier Railway-oriented observability deployment shape with a Fly-first topology
- hardening the HyperDX UI behind Cloudflare Tunnel and Cloudflare Access
- moving `hominem` deployment infrastructure from Railway assumptions to Fly.io
- selecting Fly-hosted custom Postgres and Upstash Redis as the production data layer
- deploying and validating the database, API, and workers on Fly
- partially preparing the web app for Fly, but not finishing a successful production deploy

This session did not complete:

- final production rollout of `hominem-web`
- DNS and certificate completion for `api.ponti.io` and `app.ponti.io`
- final auth and passkey validation across production subdomains
- final confirmation that Cloudflare Access fully gates the HyperDX UI

## Repositories and Working Areas

### Observability deployment assets

- Path: `/infra/fly/observability`
- Primary deployment guide: `/infra/fly/observability/README.md`

### Hominem app deployment assets

- Path: `/infra/fly/apps`
- Primary deployment guide: `/infra/fly/apps/README.md`

## High-Level Decisions

### Observability

- Fly.io became the production target instead of Railway.
- The previous all-in-one ClickStack shape was split into separate Fly apps for operational clarity and tighter exposure control.
- The HyperDX UI was kept private on Fly and exposed only through Cloudflare Tunnel.
- Cloudflare Access became the intended UI security boundary instead of nginx basic auth.
- OTEL ingest remained publicly reachable so apps can export telemetry without requiring Cloudflare-authenticated browser access.

### Hominem

- Railway was not used for the new production topology.
- PostgreSQL is self-hosted on Fly using the custom image in `infra/docker/images/postgres/Dockerfile` because the schema depends on extensions, including `pgrouting`, that make Fly Managed Postgres a poor fit.
- Redis is provided by Upstash because the app uses standard Redis and BullMQ features and does not require a custom Redis deployment.
- Production subdomains are split as:
  - `api.ponti.io` for API
  - `app.ponti.io` for web
- Auth cookies are intended to span `.ponti.io`.
- Passkey RP ID remains `api.ponti.io` for the first Fly production rollout.

## Target Architecture

## Observability Target Topology

Five-app Fly topology:

- `hominem-clickhouse`: private ClickHouse storage on Flycast
- `hominem-mongo`: private MongoDB metadata store on Flycast
- `hominem-hyperdx`: private HyperDX application on Flycast
- `hominem-otel`: public OTEL collector ingress
- `hominem-observe-tunnel`: private `cloudflared` connector routing `observe.ponti.io` to HyperDX

Traffic model:

- application telemetry -> `hominem-otel`
- OTEL collector -> HyperDX/ClickHouse stack internals
- user browser -> Cloudflare Access -> Cloudflare Tunnel -> `hominem-hyperdx.flycast:8080`

Security model:

- ClickHouse, Mongo, and HyperDX have private Flycast addressing only
- HyperDX should not have a public Fly IP or bypassable public UI origin
- only the OTEL collector is intentionally public on Fly
- UI access depends on Cloudflare Access policy enforcement, not just tunnel reachability

## Hominem Target Topology

Four-app Fly topology plus managed Redis:

- `hominem-postgres`: private Postgres on Fly using the repo's custom Postgres image
- `hominem-api`: public API service intended for `api.ponti.io`
- `hominem-workers`: private always-on background workers
- `hominem-web`: public web frontend intended for `app.ponti.io`
- Upstash Redis: managed Redis for cache, queues, and BullMQ-style workloads

Dependency model:

- API and workers use the same Fly Postgres instance
- API and workers use the same Upstash Redis database
- web and API export telemetry to `hominem-otel`
- auth cookies are designed to work across the app and API subdomains

## Work Completed

## Observability Work Completed

### Deployment assets and infrastructure

Created or updated Fly deployment assets under `/infra/fly/observability/` for:

- ClickHouse
- Mongo
- HyperDX
- OTEL collector
- Cloudflare tunnel

Key files include:

- `/infra/fly/observability/clickhouse/fly.toml`
- `/infra/fly/observability/mongo/fly.toml`
- `/infra/fly/observability/hyperdx/fly.toml`
- `/infra/fly/observability/otel/fly.toml`
- `/infra/fly/observability/otel/otelcol.yaml`
- `/infra/fly/observability/cloudflare-tunnel/fly.toml`
- `/infra/fly/observability/README.md`

### Collector stabilization

- The original HyperDX OTEL collector approach that depended on OpAMP/supervisor behavior proved unstable on Fly.
- The collector was replaced with a plain static `otel/opentelemetry-collector-contrib` configuration.
- This change reduced orchestration complexity and produced a stable OTEL ingress deployment.

### Deployments completed

The following Fly apps were deployed:

- `hominem-clickhouse`
- `hominem-mongo`
- `hominem-hyperdx`
- `hominem-otel`
- `hominem-observe-tunnel`

### Validation completed

- `observe.ponti.io` successfully routed through the Cloudflare tunnel to HyperDX and returned `200`
- the public OTEL endpoint responded on Fly, confirming the ingress service was live
- the system design was verified to keep the UI private while exposing only ingestion publicly

### Security state at end of session

- tunnel connectivity was functioning
- Cloudflare Access still needed explicit final verification as the effective UI gate
- if Access policy is not enforced correctly, the tunnel alone does not provide sufficient protection for the HyperDX UI and signup flow

## Hominem Work Completed

### Deployment planning and configuration

Created or updated Fly deployment assets under `/infra/fly/apps/` for:

- Postgres
- API
- workers
- web

Key files include:

- `/infra/fly/apps/postgres.toml`
- `/infra/fly/apps/api.toml`
- `/infra/fly/apps/workers.toml`
- `/infra/fly/apps/web.toml`
- `/infra/fly/apps/README.md`

### Web deploy preparation

Prepared Fly web deployment assets and runtime environment support, including:

- `/apps/web/Dockerfile`
- runtime OTEL env plumbing in `/apps/web/app/lib/env.ts`
- app wiring in `/apps/web/app/root.tsx`
- Fly-oriented examples in `/apps/web/.env.example`

The web app no longer hardcodes browser telemetry to `http://localhost:4318` and instead reads runtime configuration.

### Secret and build hygiene work

- `.dockerignore` was updated so `.env*` files are excluded from Docker build context
- this prevents accidental inclusion of environment files in deployed images

### Fly app creation and infrastructure provisioning

The following Fly apps were created:

- `hominem-postgres`
- `hominem-api`
- `hominem-workers`
- `hominem-web`

Infrastructure created for Postgres:

- persistent volume
- private Flycast IP

### Database deployment and migration

- the custom Postgres image from `infra/docker/images/postgres/Dockerfile` was deployed successfully on Fly
- Goose migrations were run successfully via Fly proxy against the deployed database
- the schema was brought up on the Fly-hosted Postgres instance

### API deployment

- the API image was deployed to Fly
- required service configuration was aligned with the new Fly topology
- the API reached a healthy state and passed health checks

### Workers deployment

- the workers image was deployed to Fly
- missing required env configuration, especially `OPENROUTER_API_KEY`, initially blocked stable runtime startup
- after secrets were corrected, workers started successfully and logged normal startup behavior

### Runtime validation completed

Validated at the end of the session:

- `hominem-postgres` running and healthy
- `hominem-api` running and healthy
- `hominem-workers` running after env fixes
- workers emitted startup logs such as `Place Photo Enrichment worker started`

## Known Issues and Constraints

## Observability Known Issues

- Cloudflare Tunnel is configured and working, but Cloudflare Access enforcement still needs explicit verification in the final production state.
- Access JWT validation at the origin should remain disabled unless origin-side validation is intentionally implemented.
- The OTEL collector is intentionally public, so only the UI should be treated as Access-protected.

## Hominem Known Issues

- `hominem-web` did not complete a successful first Fly deployment during the session.
- At the last known state, `hominem-web` did not yet have a successful machine deployment.
- API and workers require `OPENROUTER_API_KEY` because `packages/services/src/env.ts` treats it as mandatory.
- The web codebase has pre-existing typecheck issues unrelated to the Fly migration.

Known typecheck failures observed:

- `/apps/web/app/routes/notes/components/note-editor.tsx:38`
- `/packages/ui/src/lib/gsap/sequences.ts`

Typecheck status observed during the session:

- API typecheck passed
- workers typecheck passed
- web typecheck failed due to existing issues listed above

## Current State at End of Session

## Observability

- Fly topology exists and is deployed
- OTEL ingest is public and live
- HyperDX is reachable through Cloudflare Tunnel at `observe.ponti.io`
- Cloudflare Access still needs final verification as an enforced gate

## Hominem

- `hominem-postgres`: deployed and healthy
- `hominem-api`: deployed and healthy
- `hominem-workers`: deployed and healthy enough to start and process work
- `hominem-web`: deployment incomplete

## Remaining Work

## Priority 1: finish `hominem-web`

1. complete the first successful `hominem-web` Fly deploy
2. confirm the container boots, serves traffic, and passes Fly health checks
3. verify runtime env for telemetry and any required web-only configuration
4. confirm there is at least one healthy machine attached to the app

## Priority 2: attach and validate production domains

1. add Fly certificates for `api.ponti.io` on `hominem-api`
2. add Fly certificates for `app.ponti.io` on `hominem-web`
3. configure DNS records at the DNS provider
4. validate TLS issuance and propagation

## Priority 3: validate public endpoints

1. confirm `https://api.ponti.io/api/status` returns healthy status
2. confirm `https://app.ponti.io` serves the production web app
3. confirm telemetry export paths still point to the intended OTEL ingest endpoint

## Priority 4: validate auth and passkeys

1. verify `AUTH_COOKIE_DOMAIN=.ponti.io` works across `app.ponti.io` and `api.ponti.io`
2. verify login, session refresh, and logout flows in production
3. verify passkeys continue to work with RP ID `api.ponti.io`
4. verify cross-subdomain redirects and CSRF-sensitive flows

## Priority 5: close observability security verification

1. confirm anonymous access to `observe.ponti.io` is blocked by Cloudflare Access
2. confirm authorized users can pass Access and reach HyperDX successfully
3. confirm the HyperDX origin is not publicly bypassable through a Fly public IP or alternate hostname
4. confirm no unintended signup path is reachable without Access

## Suggested Verification Checklist

### Infra checks

- run `fly status --app hominem-postgres`
- run `fly status --app hominem-api`
- run `fly status --app hominem-workers`
- run `fly status --app hominem-web`
- run `fly status --app hominem-otel`

### Endpoint checks

- run `curl https://api.ponti.io/api/status`
- run `curl -I https://app.ponti.io`
- run `curl -i https://hominem-otel.fly.dev/v1/traces`
- open `https://observe.ponti.io` in an unauthenticated session and confirm Access challenge

### Security checks

- confirm `hominem-clickhouse`, `hominem-mongo`, and `hominem-hyperdx` only have private Flycast IPs
- confirm no public Fly endpoint can serve the HyperDX UI directly
- confirm production secrets remain stored in Fly secrets and are not committed to the repo

## Secrets and Sensitive State

The session created and/or used production secrets for:

- Postgres authentication
- Upstash Redis connection
- Better Auth secret material
- API provider credentials including email, storage, and AI integrations
- Cloudflare tunnel token

These values should be preserved in Fly secrets and password storage, but should not be copied into source-controlled documentation.

## Deliverables Produced During the Session

### Observability deliverables

- hardened Fly deployment topology for HyperDX/ClickStack
- static OTEL collector configuration for Fly stability
- Cloudflare tunnel deployment for private UI routing
- deployment documentation in `/infra/fly/observability/README.md`

### Hominem deliverables

- Fly deployment configs for Postgres, API, workers, and web
- deployed custom Postgres instance on Fly
- successful database migration against Fly Postgres
- deployed and healthy API
- deployed and starting workers
- initial Fly-compatible web deployment setup
- deployment documentation in `/infra/fly/apps/README.md`

## Recommended Next Execution Order

1. finish `hominem-web` deploy and confirm machine health
2. attach `api.ponti.io` and `app.ponti.io` and validate DNS/TLS
3. run end-to-end auth and passkey validation in production
4. verify Cloudflare Access protection for `observe.ponti.io`
5. capture final runbook updates once all services are fully live

## Source References

- `/infra/fly/observability/README.md`
- `/Users/charlesponti/.local/observability/README.md`
- `/infra/fly/apps/README.md`
- `/docs/observability.md`
