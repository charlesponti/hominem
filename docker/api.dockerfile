# Build stage
FROM oven/bun:1 AS base
WORKDIR /app



FROM base AS prune
WORKDIR /app
# Copy package files from parent directory
COPY ../package*.json bun.lock /app/

# Install dependencies
RUN bun install

# Copy source code from parent directory
COPY .. .

# Prune monorepo to only include the api and related packages
RUN bunx turbo prune @hominem/api



FROM base AS install
WORKDIR /app

# Copy pruned directory
COPY --from=prune /app/out /app

# Install the pruned dependencies
RUN bun install

# Build the application
RUN bun run build



# Production stage
FROM base AS release
WORKDIR /app
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs hominem

# Copy built files from builder
COPY --from=install --chown=hominem:nodejs /app/package*.json ./
COPY --from=install --chown=hominem:nodejs /app/node_modules ./node_modules
COPY --from=install --chown=hominem:nodejs /app/apps/api/build ./build

# Security: Run as non-root user
USER hominem

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application
ENTRYPOINT ["bun", "run", "build/src/index"]
CMD []
