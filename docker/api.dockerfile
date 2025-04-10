# Build stage
FROM node:23-bookworm-slim AS base
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
ARG REDIS_URL
ARG OPENAI_API_KEY
ARG CHROMA_URL

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
ENV REDIS_URL=${REDIS_URL}
ENV OPENAI_API_KEY=${OPENAI_API_KEY}
ENV CHROMA_URL=${CHROMA_URL}

# Install wget and other dependencies
RUN apt-get update && apt-get install -y wget

FROM base AS install
WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/utils/package.json ./packages/utils/
COPY packages/tsconfig/package.json ./packages/tsconfig/

# Copy source code from parent directory
COPY . .

# Install dependencies
RUN npm ci

# Build the utils package first
RUN npm run build --workspace=@hominem/utils

# Build API
RUN npm run build --workspace=@hominem/api

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

# Copy only the necessary files from builder
COPY --from=install --chown=hominem:nodejs /app/node_modules ./node_modules
COPY --from=install --chown=hominem:nodejs /app/packages/utils/dist ./packages/utils/dist
COPY --from=install --chown=hominem:nodejs /app/packages/utils/package.json ./packages/utils/
COPY --from=install --chown=hominem:nodejs /app/apps/api/build ./apps/api/build
COPY --from=install --chown=hominem:nodejs /app/apps/api/package.json ./apps/api/

# Security: Run as non-root user
USER hominem

# Expose port
EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Start the application
ENTRYPOINT ["node", "apps/api/build/index.js"]
CMD []
