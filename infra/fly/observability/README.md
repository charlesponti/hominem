# Fly Observability Deployment

This is the hardened Fly.io topology for self-hosted ClickStack with a private HyperDX UI behind Cloudflare Access.

## Topology

- `hominem-clickhouse`: private ClickHouse storage on Flycast
- `hominem-mongo`: private MongoDB metadata store on Flycast
- `hominem-hyperdx`: private HyperDX app on Flycast
- `hominem-otel`: public OTEL collector for ingestion
- `hominem-observe-tunnel`: private `cloudflared` connector for `observe.ponti.io`

Only `hominem-otel` is directly public on Fly. The HyperDX UI is not exposed on a Fly public IP.

## Why This Layout

- ClickHouse and Mongo are split out of the all-in-one image
- OTLP stays public without exposing the HyperDX signup flow
- HyperDX stays private and is only reachable through Cloudflare Tunnel + Access
- there is no public `fly.dev` UI origin to bypass Access if you keep the HyperDX app private

## Prerequisites

1. Install `flyctl`: https://fly.io/docs/flyctl/install/
2. Log in:

```bash
fly auth login
```

3. Create the five apps:

```bash
fly apps create hominem-clickhouse
fly apps create hominem-mongo
fly apps create hominem-hyperdx
fly apps create hominem-otel
fly apps create hominem-observe-tunnel
```

4. Create the stateful volumes:

```bash
fly volumes create clickhouse_data --app hominem-clickhouse --region sjc --size 100
fly volumes create mongo_data --app hominem-mongo --region sjc --size 20
```

5. Allocate private Flycast IPs for the private apps:

```bash
fly ips allocate-v6 --private --app hominem-clickhouse
fly ips allocate-v6 --private --app hominem-mongo
fly ips allocate-v6 --private --app hominem-hyperdx
```

If you use different app names, domains, or regions, update the `fly.toml` files first.

## Cloudflare Access

Recommended UI model: Cloudflare Tunnel + Cloudflare Access.

1. In Cloudflare Zero Trust, create a tunnel for the UI.
2. Add the public hostname `observe.ponti.io`.
3. Point that hostname at the private HyperDX origin:

```text
http://hominem-hyperdx.flycast:8080
```

4. Create an Access application for `observe.ponti.io`.
5. Add an allow policy for your email or identity provider group.
6. Copy the tunnel token and store it as a Fly secret:

```bash
fly secrets set TUNNEL_TOKEN='replace-me' --app hominem-observe-tunnel
```

## HyperDX App Settings

Update `infra/fly/observability/hyperdx/fly.toml` before deploy if your UI hostname is not `observe.ponti.io`.

Key values:

- `FRONTEND_URL`
- `HYPERDX_APP_URL`

## Deploy Order

Deploy storage first, then app services, then the tunnel:

```bash
fly deploy --config infra/fly/observability/clickhouse/fly.toml
fly deploy --config infra/fly/observability/mongo/fly.toml
fly deploy --config infra/fly/observability/hyperdx/fly.toml
fly deploy --config infra/fly/observability/otel/fly.toml
fly deploy --config infra/fly/observability/cloudflare-tunnel/fly.toml
```

## Hard Requirements

Verify the private apps have private Flycast IPs and no public IPs:

```bash
fly ips list --app hominem-clickhouse
fly ips list --app hominem-mongo
fly ips list --app hominem-hyperdx
```

If any public IPs exist on those apps, release them:

```bash
fly ips release <ip> --app hominem-clickhouse
fly ips release <ip> --app hominem-mongo
fly ips release <ip> --app hominem-hyperdx
```

The private apps should only be reachable from the Fly private network via `*.flycast`.

## Verification

OTLP HTTP should be reachable publicly:

```bash
curl -i https://hominem-otel.fly.dev/v1/traces
```

Expected: a collector response such as `400` or `405` for an empty or invalid request, which confirms the endpoint is exposed.

UI should require Cloudflare Access login at the protected hostname:

```bash
open https://observe.ponti.io
```

Expected: Cloudflare Access challenge, then the HyperDX UI after successful auth.

## App Telemetry Settings

For server-side OTLP over HTTP/protobuf:

```env
OTEL_EXPORTER_OTLP_ENDPOINT=https://hominem-otel.fly.dev
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

If you add a custom ingest domain, point the endpoint there instead.

## Custom Domains

Current domains:

- `observe.ponti.io` -> Cloudflare Tunnel + Access -> `hominem-hyperdx.flycast:8080`
- `hominem-otel.fly.dev` -> public OTEL ingest

If you later add a custom ingest domain, attach it to `hominem-otel` with Fly:

```bash
fly certs add ingest.ponti.io --app hominem-otel
```

## Notes

- The UI security boundary is Cloudflare Access in front of the private HyperDX origin
- The remaining public Fly surface is only the OTEL collector
- The starter sizing in these configs is constrained to shared CPUs and 4 GB max memory for ClickHouse to fit standard Fly limits
- `observe.ponti.io` was already routed through Cloudflare Tunnel during the session; final verification is still to confirm Access enforcement blocks anonymous users
