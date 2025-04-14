# Build stage
FROM node:23.11-bookworm-slim AS base
WORKDIR /app

# Install bun and wget
RUN apt-get update && apt-get install -y curl unzip wget

# Install bun in a location accessible to all users
RUN curl -fsSL https://bun.sh/install | bash && \
    mv /root/.bun/bin/bun /usr/local/bin/bun

# Add bun to PATH
ENV PATH="/usr/local/bin:${PATH}"

FROM base AS install
WORKDIR /app

# Copy source code from parent directory
COPY .. .

# Install dependencies
RUN bun install

# Production stage
FROM base AS release
WORKDIR /app
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --gid 1001 nodejs && \
    adduser --uid 1001 --gid 1001 hominem

# Create logs directory with correct permissions
RUN mkdir -p /app/logs && \
  chown -R hominem:nodejs /app/logs

# Copy built files from builder
COPY --from=install --chown=hominem:nodejs /app ./

# Security: Run as non-root user
USER hominem

# Expose port
EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Start the application
ENTRYPOINT ["bun", "run", "apps/api/src/index"]
CMD []
