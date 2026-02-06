# Base stage with common tools
FROM oven/bun:1.3.0-debian AS base
WORKDIR /app

# Install necessary tools
RUN apt-get update && \
  apt-get install -y --no-install-recommends curl ca-certificates && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

# Set up environment
ENV PATH="/usr/local/bin:${PATH}"
ENV NODE_ENV=production
ENV TURBO_TELEMETRY_DISABLED=1

# Builder stage - install all dependencies
FROM base AS builder
WORKDIR /app

# Copy the entire workspace
COPY package.json bun.lock ./
COPY packages ./packages
COPY services ./services
COPY tools ./tools
COPY apps ./apps
COPY config ./config

# Install all dependencies with the lock file
RUN bun install --frozen-lockfile

# Production stage
FROM oven/bun:1.3.0-debian AS release
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

# Copy package files from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bun.lock ./bun.lock

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy source code and workspace packages
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/api ./services/api

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
ENTRYPOINT ["bun", "run", "services/api/src/index.ts"]
CMD []
