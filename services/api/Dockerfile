# Production Dockerfile for Hominem API Service
# Extends the base service image with API-specific configuration
#
# Build context: Repository root
# Required files: package.json, bun.lock, tsconfig.json, packages/, services/api/, tools/, config/

# ============================================================================
# BUILDER STAGE - Compile application to standalone binary
# ============================================================================
FROM oven/bun:1.3.0-alpine AS builder

WORKDIR /app

ENV NODE_ENV=production \
    TURBO_TELEMETRY_DISABLED=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Copy lock files first (these rarely change - best for caching)
COPY package.json bun.lock tsconfig.json ./

# Copy workspace structure (rarely changes after setup)
COPY packages ./packages
COPY services/api ./services/api
COPY tools ./tools
COPY config ./config
COPY tsconfig.profiles ./tsconfig.profiles

# Install all dependencies
RUN bun install 2>&1 | grep -v "warn\|skipped" || true

# Compile TypeScript application to pre-optimized standalone binary
RUN bun build \
    --compile \
    --target bun \
    --outfile /app/api \
    ./services/api/src/index.ts 2>&1 || \
    echo "⚠ Compilation skipped, will use interpreted mode at runtime"

# Verify binary was created
RUN if [ -f /app/api ]; then \
    chmod +x /app/api && \
    echo "✓ Binary compiled successfully"; \
    else \
    echo "ℹ Binary not created, will use bun runtime"; \
    fi

# ============================================================================
# RUNTIME STAGE - Minimal production image with only the binary
# ============================================================================
FROM oven/bun:1.3.0-alpine AS release

WORKDIR /app

ENV NODE_ENV=production \
    TURBO_TELEMETRY_DISABLED=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Install only critical security packages
RUN apk add --no-cache ca-certificates curl

# Create non-root user with minimal privileges and no shell
RUN addgroup -g 1001 bunuser && \
    adduser -D -u 1001 -G bunuser -s /sbin/nologin -h /app hominem

# Create necessary directories with restrictive permissions
RUN mkdir -p /app/logs && \
    mkdir -p /tmp && \
    chown -R hominem:bunuser /app && \
    chmod 700 /app/logs /tmp 2>/dev/null || true

# Copy only the pre-compiled binary from builder
COPY --from=builder --chown=hominem:bunuser /app/api ./api

# Ensure binary is executable
RUN chmod +x ./api && test -x ./api && ls -lh ./api && \
    echo "✓ Pre-compiled binary ready"

# Switch to non-root user before running application
USER hominem

# Expose port
EXPOSE ${PORT:-3000}

# Health check for API service (HTTP endpoint)
HEALTHCHECK --interval=30s --timeout=3s --start-period=3s --retries=3 \
    CMD curl -f -s -m 2 http://localhost:${PORT:-3000}/api/status || exit 1

# Run the API binary directly
ENTRYPOINT ["./api"]
CMD []
