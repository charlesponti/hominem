# Build stage
FROM node:23-bookworm-slim AS base
WORKDIR /app

# Define build arguments and set environment variables in one go
# These will be inherited by all stages
ARG NODE_ENV \
    PORT \
    APP_URL \
    COOKIE_DOMAIN \
    SENDGRID_API_KEY \
    SENDGRID_SENDER_EMAIL \
    SENDGRID_SENDER_NAME \
    COOKIE_NAME \
    COOKIE_SALT \
    COOKIE_SECRET \
    DATABASE_URL \
    SEGMENT_KEY \
    APP_USER_ID \
    ENABLE_REQUEST_LOGGING

ENV NODE_ENV=${NODE_ENV} \
    PORT=${PORT} \
    APP_URL=${APP_URL} \
    COOKIE_DOMAIN=${COOKIE_DOMAIN} \
    SENDGRID_API_KEY=${SENDGRID_API_KEY} \
    SENDGRID_SENDER_EMAIL=${SENDGRID_SENDER_EMAIL} \
    SENDGRID_SENDER_NAME=${SENDGRID_SENDER_NAME} \
    COOKIE_NAME=${COOKIE_NAME} \
    COOKIE_SALT=${COOKIE_SALT} \
    COOKIE_SECRET=${COOKIE_SECRET} \
    DATABASE_URL=${DATABASE_URL} \
    SEGMENT_KEY=${SEGMENT_KEY} \
    APP_USER_ID=${APP_USER_ID} \
    ENABLE_REQUEST_LOGGING=${ENABLE_REQUEST_LOGGING}

# Install bun and wget
RUN apt-get update && apt-get install -y curl unzip wget

# Install bun
RUN curl -fsSL https://bun.sh/install | bash

# Add bun to PATH
ENV PATH="/root/.bun/bin:${PATH}"

FROM base AS install
WORKDIR /app
# Add bun to PATH in this stage too
ENV PATH="/root/.bun/bin:${PATH}"

# Copy source code from parent directory
COPY .. .

# Install dependencies
RUN bun install

# Build the application
RUN bun run build

# Production stage
FROM base AS release
WORKDIR /app
# Add bun to PATH in this stage too
ENV PATH="/root/.bun/bin:${PATH}"

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --gid 1001 nodejs && \
    adduser --uid 1001 --gid 1001 hominem

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
