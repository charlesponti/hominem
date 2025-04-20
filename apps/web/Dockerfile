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
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_SHARP_PATH=/usr/local/lib/node_modules/sharp

# Pruner stage - use turbo to create a pruned workspace with only what's needed
FROM base AS pruner
WORKDIR /app

# Install turbo globally
RUN npm install -g turbo

# Copy repo content needed for pruning
COPY . .

# Prune the workspace to only include the web app and its deps
RUN turbo prune @hominem/web --docker

# Builder stage - build from the pruned source
FROM base AS builder
WORKDIR /app

# Install build tools
RUN npm install -g pnpm turbo

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

# Build the Next.js app and its dependencies
RUN turbo run build --filter=@hominem/web...

# Production stage - using Next.js standalone output
FROM node:23.11-bookworm-slim AS release
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

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

# Copy necessary production files - standalone Next.js output
COPY --from=builder --chown=hominem:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=hominem:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=hominem:nodejs /app/apps/web/public ./apps/web/public

# Set proper permissions
RUN chown -R hominem:nodejs /app

# Security: Run as non-root user
USER hominem

# Expose port (use default if not specified)
EXPOSE ${PORT:-4444}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-4444}/ || exit 1

# Start the Next.js application
CMD ["node", "apps/web/server.js"]
