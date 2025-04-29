# Base stage with common tools
FROM node:23.11-bookworm-slim AS base
WORKDIR /app

# Install necessary tools (only what's absolutely needed)
RUN apt-get update && \
  apt-get install -y --no-install-recommends curl ca-certificates && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

# Set up Node.js environment
ENV PATH="/usr/local/bin:${PATH}"
ENV NODE_ENV=production
ENV TURBO_TELEMETRY_DISABLED=1

# Pruner stage - use turbo to create a pruned workspace with only what's needed
FROM base AS pruner
WORKDIR /app

# Install turbo globally
RUN npm install -g turbo

# Copy repo content needed for pruning
COPY . .

# Prune the workspace to only include the API app and its deps
RUN turbo prune @hominem/api --docker

# Builder stage - build from the pruned source
FROM base AS builder
WORKDIR /app

# Install build tools
RUN npm install -g pnpm turbo esbuild

# Copy the pruned lockfile and package.json files
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Install all dependencies (including dev deps for building)
RUN pnpm install --frozen-lockfile --prod=false

# Copy the pruned source code
COPY --from=pruner /app/out/full/ .

# Copy turbo.json for the build
COPY turbo.json .

# Build
WORKDIR /app/apps/api
RUN node esbuild.config.js
WORKDIR /app

# Production stage
FROM node:23.11-bookworm-slim AS release
WORKDIR /app
ENV NODE_ENV=production
ENV TURBO_TELEMETRY_DISABLED=1

# Install only essential packages for production
RUN apt-get update && \
  apt-get install -y --no-install-recommends ca-certificates && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --gid 1001 nodejs && \
  adduser --uid 1001 --gid 1001 hominem

# Create logs directory with correct permissions
RUN mkdir -p /app/logs && \
  chown -R hominem:nodejs /app/logs

# Copy pruned package files needed for production
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Install production dependencies only
RUN npm install -g pnpm && \
  pnpm install --frozen-lockfile --prod=true

# Copy built artifacts
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Set proper permissions
RUN chown -R hominem:nodejs /app

# Security: Run as non-root user
USER hominem

# Expose port (use default if not specified)
EXPOSE ${PORT:-3000}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Simple startup for the application
USER hominem

# Start the application
ENTRYPOINT ["node", "apps/api/dist/index.js"]
CMD []
