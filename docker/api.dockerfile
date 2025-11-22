# Base stage with common tools
FROM oven/bun:1.1.38-debian AS base
WORKDIR /app

# Install necessary tools (only what's absolutely needed)
RUN apt-get update && \
  apt-get install -y --no-install-recommends curl ca-certificates && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

# Set up environment
ENV PATH="/usr/local/bin:${PATH}"
ENV NODE_ENV=production
ENV TURBO_TELEMETRY_DISABLED=1

# Pruner stage - use turbo to create a pruned workspace with only what's needed
FROM base AS pruner
WORKDIR /app

# Install Node.js (required for turbo CLI)
RUN curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - && \
  apt-get install -y nodejs && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

# Install turbo globally
RUN bun install -g turbo

# Copy repo content needed for pruning
COPY . .

# Prune the workspace to only include the API app and its deps
RUN turbo prune @hominem/api --docker

# Dependencies stage - install dependencies
FROM base AS deps
WORKDIR /app

# Copy the pruned lockfile and package.json files
COPY --from=pruner /app/out/json/ .

# Install only production dependencies
RUN bun install --production --frozen-lockfile

# Production stage
FROM oven/bun:1.1.38-debian AS release
WORKDIR /app
ENV NODE_ENV=production
ENV TURBO_TELEMETRY_DISABLED=1

# Install only essential packages for production
RUN apt-get update && \
  apt-get install -y --no-install-recommends ca-certificates curl && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --gid 1001 bunuser && \
  adduser --uid 1001 --gid 1001 hominem

# Create logs directory with correct permissions
RUN mkdir -p /app/logs && \
  chown -R hominem:bunuser /app/logs

# Copy package files for reference
COPY --from=pruner /app/out/json/ .

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code from pruner (includes packages and app source)
COPY --from=pruner /app/out/full/packages ./packages
COPY --from=pruner /app/out/full/apps/api ./apps/api

# Set proper permissions
RUN chown -R hominem:bunuser /app

# Security: Run as non-root user
USER hominem

# Expose port (use default if not specified)
EXPOSE ${PORT:-3000}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/api/status || exit 1

# Start the application directly from source with Bun
ENTRYPOINT ["bun", "run", "apps/api/src/index.ts"]
CMD []
