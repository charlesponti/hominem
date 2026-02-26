# Makefile for Node.js, Docker, Fastify, and Drizzle project

# Load root environment variables when present.
ifneq (,$(wildcard .env))
include .env
export
endif

# Variables
DOCKER_COMPOSE = docker compose
NODE_ENV ?= development
APPLE_KEY_PATH ?= $(CURDIR)/.auth/AuthKey_2438T5MGLH.p8
APPLE_EXPIRES_DAYS ?= 150
APPLE_KEY_ID ?= 2438T5MGLH

# Phony targets
.PHONY: install start dev build test lint format clean docker-up docker-down check reset all test-db-start test-db-stop test-db-restart test-db-status apple-client-secret auth-e2e auth-e2e-live auth-e2e-live-local mobile-test-e2e-preflight mobile-build-dev-ios

# Install dependencies
install:
	bun install

# Start the application in production mode
start:
	bun start

# Start the application in development mode
dev:
	@echo "Starting development server..."
	pm2 start bun --name="hominem" -- run dev

run-redis:
	@echo "Starting Redis..."
	pm2 start bun --name="hominem-redis" -- run redis

# Run tests
test:
	bun run test

# Build the application
build:
	bun turbo run lint --force --parallel
	bun turbo run build --force

# Run linter
lint:
	bun turbo run lint --force --parallel

# Clean build artifacts and dependencies
clean:
	find . -type d -name "node_modules" -exec rm -rf {} +
	find . -type d -name "dist" -exec rm -rf {} +
	find . -type d -name "build" -exec rm -rf {} +
	find . -type d -name "logs" -exec rm -rf {} +
	find . -type d -name "coverage" -exec rm -rf {} +
	find . -type d -name ".next" -exec rm -rf {} +
	find . -type d -name ".turbo" -exec rm -rf {} +
	find . -name "bun.lock" -exec rm -rf {} +
	find . -name '*.tsbuildinfo' -type f -not -path './node_modules/*' -delete

# Stop Docker containers
docker-down:
	$(DOCKER_COMPOSE) down

# Run all tests and linting
check: test lint

# Test database management
test-db-start:
	./scripts/test-db.sh start

test-db-stop:
	./scripts/test-db.sh stop

test-db-restart:
	./scripts/test-db.sh restart

test-db-status:
	./scripts/test-db.sh status

# Run tests with test database
test-with-db: test-db-start
	bun test
	$(MAKE) test-db-stop

# Full cleanup and reinstall
reset: clean install

apple-client-secret:
	@if [ -z "$(APPLE_TEAM_ID)" ]; then \
		echo "ERROR: APPLE_TEAM_ID is required"; \
		echo "Usage: make apple-client-secret APPLE_TEAM_ID=<team_id> APPLE_CLIENT_ID=<services_id> [APPLE_KEY_ID=<key_id>] [APPLE_KEY_PATH=<path>] [APPLE_EXPIRES_DAYS=<days>]"; \
		exit 1; \
	fi
	@if [ -z "$(APPLE_CLIENT_ID)" ]; then \
		echo "ERROR: APPLE_CLIENT_ID is required"; \
		echo "Usage: make apple-client-secret APPLE_TEAM_ID=<team_id> APPLE_CLIENT_ID=<services_id> [APPLE_KEY_ID=<key_id>] [APPLE_KEY_PATH=<path>] [APPLE_EXPIRES_DAYS=<days>]"; \
		exit 1; \
	fi
	@bun run --filter @hominem/api auth:apple:client-secret -- \
		--key-path "$(APPLE_KEY_PATH)" \
		--team-id "$(APPLE_TEAM_ID)" \
		--client-id "$(APPLE_CLIENT_ID)" \
		--key-id "$(APPLE_KEY_ID)" \
		--expires-days "$(APPLE_EXPIRES_DAYS)"

auth-e2e:
	@bun run test:e2e:auth

auth-e2e-live:
	@bun run test:e2e:auth:live

auth-e2e-live-local:
	@bun run test:e2e:auth:live:local

mobile-test-e2e-preflight:
	@bun run --filter @hominem/mobile test:e2e:preflight

mobile-build-dev-ios:
	@bun run --filter @hominem/mobile build:dev:ios

lbt:
	@echo "Running lint..."
	@bun run lint --force > /dev/null && echo "Lint passed" || echo "Lint failed"
	@echo "Running build..."
	@bun run build --force > /dev/null && echo "Build passed" || echo "Build failed"
	@echo "Running typecheck..."
	@bun run typecheck --force > /dev/null && echo "Typecheck passed" || echo "Typecheck failed"

# Default target
all: install build
