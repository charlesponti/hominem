# syntax=docker/dockerfile:1.7

ARG BUN_IMAGE=oven/bun:1.3.0-alpine@sha256:37e6b1cbe053939bccf6ae4507977ed957eaa6e7f275670b72ad6348e0d2c11f
ARG TURBO_VERSION=2.8.20

FROM ${BUN_IMAGE} AS pruner

WORKDIR /repo

ENV TURBO_TELEMETRY_DISABLED=1

RUN --mount=type=cache,target=/root/.bun/install/cache \
  bun install --global turbo@${TURBO_VERSION}

COPY . .

RUN turbo prune --docker --out-dir /repo/out @hominem/web

FROM ${BUN_IMAGE} AS deps

WORKDIR /app

ENV NODE_ENV=production \
  TURBO_TELEMETRY_DISABLED=1

COPY --from=pruner /repo/out/json/ ./
COPY --from=pruner /repo/out/bun.lock ./bun.lock

RUN --mount=type=cache,target=/root/.bun/install/cache \
  bun install --ignore-scripts

FROM ${BUN_IMAGE} AS runtime-deps

WORKDIR /app

ENV NODE_ENV=production \
  TURBO_TELEMETRY_DISABLED=1

COPY --from=pruner /repo/out/json/ ./
COPY --from=pruner /repo/out/bun.lock ./bun.lock

RUN --mount=type=cache,target=/root/.bun/install/cache \
  bun install --omit=dev --ignore-scripts --no-save

FROM ${BUN_IMAGE} AS builder

WORKDIR /app

ARG VITE_APP_BASE_URL="https://app.ponti.io"
ARG VITE_PUBLIC_API_URL="https://api.ponti.io"

ENV NODE_ENV=production \
  TURBO_TELEMETRY_DISABLED=1 \
  VITE_APP_BASE_URL=${VITE_APP_BASE_URL} \
  VITE_PUBLIC_API_URL=${VITE_PUBLIC_API_URL}

COPY --from=pruner /repo/out/full/ ./
COPY --from=pruner /repo/config ./config
COPY --from=pruner /repo/tools ./tools
COPY --from=pruner /repo/tsconfig.json ./tsconfig.json
COPY --from=pruner /repo/tsconfig.profiles ./tsconfig.profiles
COPY --from=deps /app/node_modules ./node_modules

RUN --mount=type=cache,target=/root/.bun/install/cache \
  bun install --ignore-scripts

RUN --mount=type=cache,target=/root/.bun/install/cache \
  --mount=type=cache,target=/root/.cache/turbo \
  bun turbo run build --filter=@hominem/web

RUN find apps/web/build -type f -name '*.map' -delete

FROM ${BUN_IMAGE} AS release

WORKDIR /app

ARG VITE_APP_BASE_URL="https://app.ponti.io"
ARG VITE_PUBLIC_API_URL="https://api.ponti.io"

ENV NODE_ENV=production \
  TURBO_TELEMETRY_DISABLED=1 \
  PORT=3000 \
  VITE_APP_BASE_URL=${VITE_APP_BASE_URL} \
  VITE_PUBLIC_API_URL=${VITE_PUBLIC_API_URL}

RUN addgroup -g 1001 bunuser \
  && adduser -D -u 1001 -G bunuser -s /sbin/nologin -h /app hominem

COPY --from=runtime-deps --chown=hominem:bunuser /app/node_modules ./node_modules
COPY --from=builder --chown=hominem:bunuser /app/apps/web/build ./apps/web/build

USER hominem

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["bun", "-e", "const port = process.env.PORT ?? '3000'; const res = await fetch(`http://127.0.0.1:${port}/`); if (!res.ok) throw new Error(`healthcheck failed: ${res.status}`)"]

ENTRYPOINT ["./node_modules/.bin/react-router-serve", "./apps/web/build/server/index.js"]
