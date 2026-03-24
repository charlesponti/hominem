# Makefile for local development, Docker, and database operations

# Load root environment variables when present.
ifneq (,$(wildcard .env))
include .env
export
endif

# Variables
DOCKER_COMPOSE = docker compose
NODE_ENV ?= development
DEV_DATABASE_URL ?= postgres://postgres:postgres@localhost:5434/hominem
TEST_DATABASE_URL ?= postgres://postgres:postgres@localhost:4433/hominem-test

# Phony targets
.PHONY: install build test lint typecheck check clean reset all dev dev-setup dev-up dev-down dev-reset dev-status db-migrate db-migrate-test db-migrate-all db-rollback db-rollback-test db-rollback-all db-generate-types db-verify-types db-migrate-sync db-rollback-sync db-new-migration help-db test-db-restart test-db-status docker-up docker-up-full docker-down docker-test-up docker-test-down auth-test-up auth-test-down auth-test-status storybook storybook-test

# Start the mobile dev server (Expo dev client, dev variant)
dev:
	bun run --filter @hominem/mobile start

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

# Roll back the latest migration on the local development database
db-rollback:
	@echo "Waiting for dev database to be ready..."
	@until docker exec hominem-postgres pg_isready -U postgres > /dev/null 2>&1; do sleep 1; done
	@cd packages/db && DATABASE_URL="$(DEV_DATABASE_URL)" bun run goose:down

# Roll back the latest migration on the local test database
db-rollback-test:
	@echo "Waiting for test database to be ready..."
	@until docker exec hominem-test-postgres pg_isready -U postgres > /dev/null 2>&1; do sleep 1; done
	@cd packages/db && DATABASE_URL="$(TEST_DATABASE_URL)" bun run goose:down

# Roll back the latest migration on both local databases
db-rollback-all: db-rollback db-rollback-test

# Refresh generated Kysely database types from the development database schema
db-generate-types:
	@echo "Refreshing generated Kysely database types..."
	@cd packages/db && DATABASE_URL="$(DEV_DATABASE_URL)" bunx kysely-codegen --out-file ./src/types/database.ts

# Verify generated Kysely database types are up to date
db-verify-types:
	@echo "Verifying generated Kysely database types..."
	@cd packages/db && DATABASE_URL="$(DEV_DATABASE_URL)" bunx kysely-codegen --verify --out-file ./src/types/database.ts

# Apply local migrations and refresh generated Kysely database types
db-migrate-sync: db-migrate-all db-generate-types

# Roll back local migrations and refresh generated Kysely database types
db-rollback-sync: db-rollback-all db-generate-types

# Create a new Goose migration file with the standard template
db-new-migration:
	@if [ -z "$(NAME)" ]; then \
		echo "ERROR: NAME is required"; \
		echo "Usage: make db-new-migration NAME=add_users_table"; \
		exit 1; \
	fi
	@name="$$(printf '%s' "$(NAME)" | tr '[:upper:]' '[:lower:]' | tr ' -' '__' | tr -cd 'a-z0-9_')"; \
	if [ -z "$$name" ]; then \
		echo "ERROR: NAME must contain letters or numbers"; \
		exit 1; \
	fi; \
	timestamp="$$(date -u +"%Y%m%d%H%M%S")"; \
	file="packages/db/migrations/$${timestamp}_$${name}.sql"; \
	if [ -e "$$file" ]; then \
		echo "ERROR: Migration already exists: $$file"; \
		exit 1; \
	fi; \
	printf '%s\n' '-- +goose Up' '-- +goose StatementBegin' '-- TODO: add migration SQL here' '-- +goose StatementEnd' '' '-- +goose Down' '-- TODO: add rollback SQL here' > "$$file"; \
	echo "Created $$file"

# Run tests
test:
	bun run test

# Build the application
build:
	bun turbo run build --force

# Single quality gate: format, lint, DB/type verification, type quality
lint:
	bun run format
	bunx stylelint "{apps,packages,services}/**/*.css" --config packages/ui/tools/stylelint-config-void.cjs
	cd packages/db && npx --yes squawk-cli --no-error-on-unmatched-pattern --exclude-path '*schema_baseline.sql' migrations/*.sql
	bun turbo run lint --no-cache
	$(MAKE) db-verify-types
	@echo "── tsc: standard typecheck across all workspaces ────────────────"
	NODE_OPTIONS="--max-old-space-size=4096" bun turbo run typecheck --concurrency=4 --continue --no-cache
	@echo "── knip: unused files / exports / dependencies ──────────────────"
	bun run knip
	@echo "── tsc --noUnusedLocals across all workspaces ───────────────────"
	cd apps/web          && bunx tsc --noEmit --noUnusedLocals --noUnusedParameters
	cd services/api      && bunx tsc --noEmit --noUnusedLocals --noUnusedParameters
	cd packages/auth     && bunx tsc --noEmit --noUnusedLocals --noUnusedParameters
	cd packages/chat     && bunx tsc --noEmit --noUnusedLocals --noUnusedParameters
	cd packages/db       && bunx tsc --noEmit --noUnusedLocals --noUnusedParameters
	cd packages/finance  && bunx tsc --noEmit --noUnusedLocals --noUnusedParameters
	cd packages/notes    && bunx tsc --noEmit --noUnusedLocals --noUnusedParameters
	cd packages/rpc      && bunx tsc --noEmit --noUnusedLocals --noUnusedParameters
	cd packages/ui       && bunx tsc --noEmit --noUnusedLocals --noUnusedParameters
	cd packages/utils    && bunx tsc --noEmit --noUnusedLocals --noUnusedParameters
	cd services/workers  && bunx tsc --noEmit --noUnusedLocals --noUnusedParameters
	cd tools/cli         && bunx tsc --noEmit --noUnusedLocals --noUnusedParameters

# Clean build artifacts and dependencies
clean:
	bun turbo run clean
	find . -name '*.tsbuildinfo' -not -path '*/node_modules/*' -delete

# Full cleanup and reinstall
reset: clean install

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
	@echo "  1. Run: make db-new-migration NAME=add_example_table"
	@echo "  2. Use UTC timestamp prefix (YYYYMMDDHHMMSS_description.sql)"
	@echo "  3. Fill in the -- +goose Up and -- +goose Down blocks"
	@echo "  4. Run: make db-migrate-sync"
	@echo ""
	@echo "Individual Steps:"
	@echo "  make db-migrate-all    # Apply migrations to dev + test databases"
	@echo "  make db-rollback-all   # Roll back the latest migration on dev + test databases"
	@echo "  make db-generate-types # Refresh generated Kysely database types"
	@echo "  make db-verify-types   # Verify generated Kysely database types are current"
	@echo "  make db-migrate-sync   # Apply migrations and refresh generated Kysely types"
	@echo "  make db-rollback-sync  # Roll back migrations and refresh generated Kysely types"
	@echo "  make db-new-migration NAME=add_example_table # Scaffold a migration file"
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

# Run unified Storybook (all components at port 6006)
storybook:
	bun run --filter @hominem/ui storybook

# Run story-based tests with Vitest + Playwright
storybook-test:
	cd packages/ui && bunx vitest --config vitest.stories.ts

all: install build
