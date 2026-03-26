# syntax=docker/dockerfile:1.7

ARG BUN_IMAGE=oven/bun:1.3.0-alpine@sha256:37e6b1cbe053939bccf6ae4507977ed957eaa6e7f275670b72ad6348e0d2c11f
ARG TURBO_VERSION=2.8.20

FROM ${BUN_IMAGE} AS pruner

WORKDIR /repo

ENV TURBO_TELEMETRY_DISABLED=1

RUN --mount=type=cache,target=/root/.bun/install/cache \
  bun install --global turbo@${TURBO_VERSION}

COPY . .

RUN turbo prune --docker --out-dir /repo/out @hominem/api

FROM ${BUN_IMAGE} AS deps

WORKDIR /app

ENV NODE_ENV=production \
  TURBO_TELEMETRY_DISABLED=1

COPY --from=pruner /repo/out/json/ ./
COPY --from=pruner /repo/out/bun.lock ./bun.lock

RUN --mount=type=cache,target=/root/.bun/install/cache \
  bun install --ignore-scripts

FROM ${BUN_IMAGE} AS builder

WORKDIR /app

ENV NODE_ENV=production \
  TURBO_TELEMETRY_DISABLED=1

COPY --from=pruner /repo/out/full/ ./
COPY --from=pruner /repo/config ./config
COPY --from=pruner /repo/tools ./tools
COPY --from=pruner /repo/tsconfig.json ./tsconfig.json
COPY --from=pruner /repo/tsconfig.profiles ./tsconfig.profiles
COPY --from=deps /app/node_modules ./node_modules

RUN --mount=type=cache,target=/root/.bun/install/cache \
  bun install --ignore-scripts

RUN bun run --filter @hominem/env build \
  && bun run --filter @hominem/db build \
  && bun run --filter @hominem/auth build \
  && bun run --filter @hominem/rpc build

RUN bun build \
  --compile \
  --target bun \
  --outfile /app/api \
  ./services/api/src/index.ts \
  && test -x /app/api

FROM ${BUN_IMAGE} AS release

WORKDIR /app

ENV NODE_ENV=production \
  TURBO_TELEMETRY_DISABLED=1 \
  PORT=3000

RUN addgroup -g 1001 bunuser \
  && adduser -D -u 1001 -G bunuser -s /sbin/nologin -h /app hominem

COPY --from=builder --chown=hominem:bunuser /app/api ./api

USER hominem

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=3s --retries=3 \
  CMD ["bun", "-e", "const port = process.env.PORT ?? '3000'; const res = await fetch(`http://127.0.0.1:${port}/api/status`); if (!res.ok) throw new Error(`healthcheck failed: ${res.status}`)"]

ENTRYPOINT ["./api"]
