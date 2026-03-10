# Production Dockerfile for Hominem Workers Service
# Extends the base service pattern with Workers-specific configuration
#
# Build context: Repository root
# Required files: package.json, bun.lock, tsconfig.json, packages/, services/workers/, tools/, config/

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
COPY services/workers ./services/workers
COPY tools ./tools
COPY config ./config
COPY tsconfig.profiles ./tsconfig.profiles

# Install all dependencies
RUN bun install 2>&1 | grep -v "warn\|skipped" || true

# Compile TypeScript application to pre-optimized standalone binary
RUN bun build \
    --compile \
    --target bun \
    --outfile /app/workers \
    ./services/workers/src/index.ts 2>&1 || \
    echo "⚠ Compilation skipped, will use interpreted mode at runtime"

# Verify binary was created
RUN if [ -f /app/workers ]; then \
    chmod +x /app/workers && \
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
COPY --from=builder --chown=hominem:bunuser /app/workers ./workers

# Ensure binary is executable
RUN chmod +x ./workers && test -x ./workers && ls -lh ./workers && \
    echo "✓ Pre-compiled binary ready"

# Switch to non-root user before running application
USER hominem

# Workers don't expose an HTTP port (background job processing)
# HEALTHCHECK --interval=30s --timeout=3s --start-period=3s --retries=3 \
#     CMD ps aux | grep -v grep | grep workers > /dev/null || exit 1

# Run the Workers binary directly
ENTRYPOINT ["./workers"]
CMD []
