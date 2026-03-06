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
CLOUDFLARED ?= cloudflared
DEV_DATABASE_URL ?= postgres://postgres:postgres@localhost:5434/hominem
TEST_DATABASE_URL ?= postgres://postgres:postgres@localhost:4433/hominem-test

# Phony targets
.PHONY: install start dev build test lint format clean docker-up docker-up-full docker-down docker-start docker-stop docker-test-up docker-test-down check reset all test-db-start test-db-stop test-db-restart test-db-status apple-client-secret auth-e2e auth-e2e-live auth-e2e-live-local mobile-test-e2e-preflight mobile-build-dev-ios dev-setup dev-up dev-down dev-reset dev-status db-migrate db-migrate-test db-migrate-all db-migration-generate db-migration-apply db-schema-update help-db auth-test-up auth-test-down auth-test-status

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

# Full local development setup (deps + infra + migrations)
dev-setup: install dev-up db-migrate-all dev-status
	@echo "Full dev setup complete"

# Start required local infrastructure (redis + dev db + test db)
dev-up:
	cd docker && $(DOCKER_COMPOSE) -f compose/base.yml -f compose/dev.yml up -d redis db test-db

# Stop local development infrastructure and remove containers
dev-down:
	cd docker && $(DOCKER_COMPOSE) -f compose/base.yml -f compose/dev.yml down

# Reset local development infrastructure including volumes, then recreate + migrate
dev-reset:
	cd docker && $(DOCKER_COMPOSE) -f compose/base.yml -f compose/dev.yml down -v
	$(MAKE) dev-up
	$(MAKE) db-migrate-all

# Show local infrastructure status
dev-status:
	cd docker && $(DOCKER_COMPOSE) -f compose/base.yml -f compose/dev.yml ps

# Run migrations against the local development database
db-migrate:
	@echo "Waiting for dev database to be ready..."
	@until docker exec hominem-postgres pg_isready -U postgres > /dev/null 2>&1; do sleep 1; done
	@cd packages/db && DATABASE_URL="$(DEV_DATABASE_URL)" bun run db:migrate

# Run migrations against the local test database
db-migrate-test:
	@echo "Waiting for test database to be ready..."
	@until docker exec hominem-test-postgres pg_isready -U postgres > /dev/null 2>&1; do sleep 1; done
	@cd packages/db && DATABASE_URL="$(TEST_DATABASE_URL)" bun run db:migrate

# Run all local database migrations required for development
db-migrate-all: db-migrate db-migrate-test

# Database schema workflow targets
# Step 1: Generate migration files from packages/db/src/migrations/schema.ts
db-migration-generate:
	@echo "Generating migration files..."
	@cd packages/db && bun db:generate
	@echo "✓ Migration files generated at packages/db/src/migrations/*.sql"

# Step 2: Apply generated migrations to databases
db-migration-apply: db-migrate-all

# Full workflow: add new table to migrations/schema.ts, then run this
# Example: make db-schema-update
db-schema-update: db-migration-generate db-migration-apply
	@echo "✓ Database schema updated and migrations applied"
	@echo "Remember to commit: git add packages/db/src/migrations/"

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
	@./scripts/clean.sh

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

auth-test-up:
	$(MAKE) dev-up
	$(MAKE) db-migrate-test
	@echo "Auth test infra ready (db + test-db + redis)"

auth-test-down:
	cd docker && $(DOCKER_COMPOSE) -f compose/base.yml -f compose/dev.yml stop redis db test-db
	@echo "Auth test infra stopped"

auth-test-status:
	cd docker && $(DOCKER_COMPOSE) -f compose/base.yml -f compose/dev.yml ps redis db test-db

mobile-test-e2e-preflight:
	@bun run --filter @hominem/mobile test:e2e:preflight

mobile-build-dev-ios:
	@bun run --filter @hominem/mobile build:dev:ios

blt:
	@echo "Running lint..."
	@bun run lint --force > /dev/null && echo "Lint passed" || echo "Lint failed"
	@echo "Running build..."
	@bun run build --force > /dev/null && echo "Build passed" || echo "Build failed"
	@echo "Running typecheck..."
	@bun run typecheck --force > /dev/null && echo "Typecheck passed" || echo "Typecheck failed"

# Database Operations Help
help-db:
	@echo ""
	@echo "Database Schema Workflow (SIMPLIFIED):"
	@echo "======================================"
	@echo ""
	@echo "To add a new table:"
	@echo "  1. Edit packages/db/src/migrations/schema.ts"
	@echo "  2. Run: make db-schema-update"
	@echo ""
	@echo "Individual Steps:"
	@echo "  make db-migration-generate # Generate migration SQL from schema.ts"
	@echo "  make db-migration-apply    # Apply migrations to dev + test databases"
	@echo ""
	@echo "Why simplified?"
	@echo "  - Domain schema slices in packages/db/src/schema/ are now simple"
	@echo "    re-exports from migrations/schema.ts"
	@echo "  - No generated artifacts to maintain"
	@echo "  - TypeScript server imports just re-export needed tables"
	@echo ""

# Docker compose targets
docker-start: docker-up

docker-stop: docker-down

docker-up:
	cd docker && $(DOCKER_COMPOSE) -f compose/base.yml -f compose/dev.yml up -d

docker-up-full:
	cd docker && $(DOCKER_COMPOSE) -f compose/base.yml -f compose/dev.yml -f compose/monitoring.yml up -d

docker-down:
	cd docker && $(DOCKER_COMPOSE) -f compose/base.yml -f compose/dev.yml down -v

docker-test-up:
	cd docker && $(DOCKER_COMPOSE) -f compose/base.yml -f compose/dev.yml up -d test-db
	@echo "Waiting for test database to be ready..."
	@sleep 3
	@cd packages/db && DATABASE_URL="postgres://postgres:postgres@localhost:4433/hominem-test" bun run db:migrate
	@echo "Test database ready on port 4433"

docker-test-down:
	cd docker && $(DOCKER_COMPOSE) -f compose/base.yml -f compose/dev.yml stop test-db

# Default target
all: install build
