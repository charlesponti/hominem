FROM node:26.5.0-alpine AS builder

WORKDIR /app

ENV TURBO_TELEMETRY_DISABLED=1

# Railway's remote builder cannot see GitHub Actions secrets directly. The
# deploy workflow stores this as a service variable, which Railway exposes as
# a Docker build arg. GitHub Packages requires authentication even for the
# public @ponti-studios packages.
ARG GITHUB_PACKAGES_TOKEN

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages ./packages
COPY services/api ./services/api
COPY tsconfig.profiles ./tsconfig.profiles
COPY tsconfig.base.json ./
COPY tsconfig.json ./

# Read the build variable indirectly so the token is not interpolated into
# Railway's rendered build command/log output. The npmrc remains in the
# intermediate builder stage and is never copied into the runtime image.
RUN env | awk -F= '$1 == "GITHUB_PACKAGES_TOKEN" { print "//npm.pkg.github.com/:_authToken=" $2 }' >> ~/.npmrc
RUN npm install -g pnpm@11.10.0 && \
    pnpm install --frozen-lockfile --filter @hominem/api...

# Bundle API + all npm dependencies into dist/ (fully self-contained)
RUN pnpm --filter @hominem/api run build

FROM node:26.5.0-alpine AS release

WORKDIR /app

ENV NODE_ENV=production \
    SERVICE_NAME=api \
    TURBO_TELEMETRY_DISABLED=1

RUN apk add --no-cache ca-certificates && \
    addgroup -g 1001 apiuser && \
    adduser -D -u 1001 -G apiuser -s /sbin/nologin -h /app apiuser && \
    mkdir -p /app/logs /tmp && \
    chown -R apiuser:apiuser /app /tmp && \
    chmod 700 /app/logs && \
    chmod 1777 /tmp

# Fully bundled application — no node_modules needed at runtime
COPY --from=builder --chown=apiuser:apiuser /app/services/api/dist ./dist
COPY --from=builder --chown=apiuser:apiuser /app/services/api/public ./public

USER apiuser

EXPOSE ${PORT:-4040}

CMD ["node", "dist/index.mjs"]
