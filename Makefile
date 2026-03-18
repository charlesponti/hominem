# Makefile for local development, Docker, and database operations

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
.PHONY: install build test lint typecheck check clean reset all dev-setup dev-up dev-down dev-reset dev-status db-migrate db-migrate-test db-migrate-all help-db test-db-start test-db-stop test-db-restart test-db-status docker-up docker-up-full docker-down docker-test-up docker-test-down apple-client-secret auth-test-up auth-test-down auth-test-status storybook

# Install dependencies
install:
	bun install

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
	@cd packages/db && DATABASE_URL="$(DEV_DATABASE_URL)" bun run goose:up

# Run migrations against the local test database
db-migrate-test:
	@echo "Waiting for test database to be ready..."
	@until docker exec hominem-test-postgres pg_isready -U postgres > /dev/null 2>&1; do sleep 1; done
	@cd packages/db && DATABASE_URL="$(TEST_DATABASE_URL)" bun run goose:up

# Run all local database migrations required for development
db-migrate-all: db-migrate db-migrate-test

# Run tests
test:
	bun run test

# Build the application
build:
	bun turbo run build --force

# Run all linting: CSS, DB migrations, workspace code quality
lint:
	bunx stylelint "{apps,packages,services}/**/*.css" --config packages/ui/tools/stylelint-config-void.cjs
	cd packages/db && bunx squawk-cli migrations/*.sql
	bun turbo run lint --no-cache

# Typecheck the entire monorepo
typecheck:
	NODE_OPTIONS="--max-old-space-size=4096" bun turbo run typecheck --concurrency=4 --continue --no-cache

# Full pre-merge check: lint + typecheck
check: lint typecheck

# Clean build artifacts and dependencies
clean:
	bun turbo run clean
	find . -name '*.tsbuildinfo' -not -path '*/node_modules/*' -delete

# Test database management
test-db-start:
	cd docker && $(DOCKER_COMPOSE) -f compose/base.yml -f compose/dev.yml up -d test-db
	@until docker exec hominem-test-postgres pg_isready -U postgres > /dev/null 2>&1; do sleep 1; done
	@cd packages/db && DATABASE_URL="$(TEST_DATABASE_URL)" bun run goose:up

test-db-stop:
	cd docker && $(DOCKER_COMPOSE) -f compose/base.yml -f compose/dev.yml stop test-db

test-db-restart:
	$(MAKE) test-db-stop
	$(MAKE) test-db-start

test-db-status:
	cd docker && $(DOCKER_COMPOSE) -f compose/base.yml -f compose/dev.yml ps test-db

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

auth-test-up:
	$(MAKE) dev-up
	$(MAKE) db-migrate-test
	@echo "Auth test infra ready (db + test-db + redis)"

auth-test-down:
	cd docker && $(DOCKER_COMPOSE) -f compose/base.yml -f compose/dev.yml stop redis db test-db
	@echo "Auth test infra stopped"

auth-test-status:
	cd docker && $(DOCKER_COMPOSE) -f compose/base.yml -f compose/dev.yml ps redis db test-db


# Database Operations Help
help-db:
	@echo ""
	@echo "Database Migration Workflow (Goose):"
	@echo "======================================"
	@echo ""
	@echo "To add a schema change:"
	@echo "  1. Create a new SQL file in packages/db/migrations/"
	@echo "  2. Use UTC timestamp prefix (YYYYMMDDHHMMSS_description.sql)"
	@echo "  3. Add -- +goose Up and -- +goose Down blocks"
	@echo "  4. Run: make db-migrate-all"
	@echo ""
	@echo "Individual Steps:"
	@echo "  make db-migrate-all    # Apply migrations to dev + test databases"
	@echo ""
	@echo "Safety rules:"
	@echo "  - Expand -> Backfill -> Contract"
	@echo "  - Avoid DROP COLUMN/TABLE in normal migrations"
	@echo "  - Contract changes only after backfill cutover"
	@echo ""

# Docker compose targets
docker-up:
	cd docker && $(DOCKER_COMPOSE) -f compose/base.yml -f compose/dev.yml up -d

docker-up-full:
	cd docker && $(DOCKER_COMPOSE) -f compose/base.yml -f compose/dev.yml up -d

docker-down:
	cd docker && $(DOCKER_COMPOSE) -f compose/base.yml -f compose/dev.yml down -v

docker-test-up: test-db-start

docker-test-down: test-db-stop

# Run all Storybooks in parallel (ui:6006, places:6007, lists:6008, invites:6009, finance:6010)
storybook:
	bun run --filter @hominem/ui storybook & \
	bun run --filter @hominem/places-react storybook & \
	bun run --filter @hominem/lists-react storybook & \
	bun run --filter @hominem/invites-react storybook & \
	bun run --filter @hominem/finance-react storybook & \
	wait

all: install build

