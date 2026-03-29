# Container Observability Assets

These assets are provider-neutral Docker build inputs for the observability stack.

## Contents

- `clickhouse/` - ClickHouse image and config
- `mongo/` - MongoDB image wrapper
- `hyperdx/` - HyperDX image wrapper
- `otel/` - OpenTelemetry Collector image and config
- `cloudflare-tunnel/` - optional Cloudflare tunnel image

## Usage

Use these directories anywhere a container runtime can build images from a Dockerfile:

- Railway services
- local Docker Compose
- any OCI-compatible platform

The deploy platform should supply runtime configuration such as environment variables,
networking, volumes, domains, and secrets. These assets should not encode provider-
specific topology.
