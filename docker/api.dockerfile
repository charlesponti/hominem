# Build stage
FROM node:23-bookworm AS base
WORKDIR /app

# Define build arguments
ARG NODE_ENV
ARG PORT
ARG APP_URL
ARG COOKIE_DOMAIN
ARG SENDGRID_API_KEY
ARG SENDGRID_SENDER_EMAIL
ARG SENDGRID_SENDER_NAME
ARG COOKIE_NAME
ARG COOKIE_SALT
ARG COOKIE_SECRET
ARG DATABASE_URL
ARG SEGMENT_KEY
ARG APP_USER_ID
ARG ENABLE_REQUEST_LOGGING

# Set environment variables
ENV NODE_ENV=${NODE_ENV}
ENV PORT=${PORT}
ENV APP_URL=${APP_URL}
ENV COOKIE_DOMAIN=${COOKIE_DOMAIN}
ENV SENDGRID_API_KEY=${SENDGRID_API_KEY}
ENV SENDGRID_SENDER_EMAIL=${SENDGRID_SENDER_EMAIL}
ENV SENDGRID_SENDER_NAME=${SENDGRID_SENDER_NAME}
ENV COOKIE_NAME=${COOKIE_NAME}
ENV COOKIE_SALT=${COOKIE_SALT}
ENV COOKIE_SECRET=${COOKIE_SECRET}
ENV DATABASE_URL=${DATABASE_URL}
ENV SEGMENT_KEY=${SEGMENT_KEY}
ENV APP_USER_ID=${APP_USER_ID}
ENV ENABLE_REQUEST_LOGGING=${ENABLE_REQUEST_LOGGING}

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

# Pass all environment variables to the install stage
ENV NODE_ENV=${NODE_ENV}
ENV PORT=${PORT}
ENV APP_URL=${APP_URL}
ENV COOKIE_DOMAIN=${COOKIE_DOMAIN}
ENV SENDGRID_API_KEY=${SENDGRID_API_KEY}
ENV SENDGRID_SENDER_EMAIL=${SENDGRID_SENDER_EMAIL}
ENV SENDGRID_SENDER_NAME=${SENDGRID_SENDER_NAME}
ENV COOKIE_NAME=${COOKIE_NAME}
ENV COOKIE_SALT=${COOKIE_SALT}
ENV COOKIE_SECRET=${COOKIE_SECRET}
ENV DATABASE_URL=${DATABASE_URL}
ENV SEGMENT_KEY=${SEGMENT_KEY}
ENV APP_USER_ID=${APP_USER_ID}
ENV ENABLE_REQUEST_LOGGING=${ENABLE_REQUEST_LOGGING}

# Copy source code from parent directory
COPY .. .

# Install dependencies
RUN bun install

# Build the application
# RUN bun run build

# Production stage
FROM base AS release
WORKDIR /app
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
