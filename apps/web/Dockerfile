FROM node:24.18.0-alpine AS builder

WORKDIR /app

ARG VITE_PUBLIC_API_URL
ARG VITE_POSTHOG_HOST

ENV TURBO_TELEMETRY_DISABLED=1 \
    VITE_PUBLIC_API_URL=${VITE_PUBLIC_API_URL} \
    VITE_POSTHOG_HOST=${VITE_POSTHOG_HOST}

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages ./packages
COPY services/api ./services/api
COPY apps/web ./apps/web
COPY tsconfig.base.json ./
COPY tsconfig.profiles ./tsconfig.profiles
COPY tsconfig.json ./

RUN npm install -g pnpm@11.10.0 && \
    pnpm install --frozen-lockfile --filter @hominem/web...

# react-router build bundles all @hominem/* packages into build/server and build/client
RUN pnpm --filter @ponti-studios/auth build
RUN pnpm --filter @hominem/web run build
RUN pnpm --filter @hominem/web --prod deploy /app/deploy

FROM node:24.18.0-alpine AS server

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

RUN apk add --no-cache ca-certificates curl && \
    addgroup -g 1001 webuser && \
    adduser -D -u 1001 -G webuser -s /sbin/nologin -h /app webuser

COPY --from=builder --chown=webuser:webuser /app/deploy ./
COPY --from=builder --chown=webuser:webuser /app/apps/web/build ./build

USER webuser

EXPOSE 3000

# Railway injects PORT (often 8080), which react-router-serve reads from the
# environment.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f -s -m 2 http://localhost:${PORT:-3000}/ || exit 1

CMD ["node_modules/.bin/react-router-serve", "./build/server/index.js"]
