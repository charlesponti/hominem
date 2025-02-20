# Build stage
FROM node:22-alpine AS base
WORKDIR /app



FROM base AS prune
WORKDIR /app
# Copy package files from parent directory
COPY ../package*.json yarn.lock /app/

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code from parent directory
COPY .. .

# Prune monorepo to only include the api and related packages
RUN yarn turbo prune @hominem/api



FROM base AS install
WORKDIR /app

# Copy pruned directory
COPY --from=prune /app/out /app

# Install the pruned dependencies
RUN yarn install

# Build the application
RUN yarn run build



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
ENTRYPOINT ["node", "build/src/index.js"]
CMD []
