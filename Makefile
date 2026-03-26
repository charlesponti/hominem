SHELL := /bin/bash

# Load root environment variables when present.
ifneq (,$(wildcard .env))
include .env
export
endif

DOCKER_COMPOSE := docker compose
DOCKER_LOCAL := $(DOCKER_COMPOSE) -f infra/docker/compose/base.yml -f infra/docker/compose/dev.yml
DEV_DATABASE_URL ?= postgres://postgres:postgres@localhost:5434/hominem
TEST_DATABASE_URL ?= postgres://postgres:postgres@localhost:4433/hominem-test
APP_VARIANT ?= preview
CHANNEL ?= preview
ROLLOUT ?= 10

DB_TYPEGEN_FILE := ./src/types/database.ts
UNUSED_TS_PACKAGES := apps/web services/api packages/auth packages/chat packages/db packages/finance packages/notes packages/rpc packages/ui packages/utils services/workers tools/cli

.PHONY: help install build test lint clean reset all
.PHONY: dev dev-setup dev-up dev-down dev-reset dev-status
.PHONY: infra-up infra-down infra-reset infra-status
.PHONY: docker-up docker-up-observability docker-up-full docker-down
.PHONY: db-migrate db-migrate-test db-migrate-all db-rollback db-rollback-test db-rollback-all db-status db-status-test db-status-all db-generate-types db-verify-types db-migrate-sync db-rollback-sync db-new-migration help-db
.PHONY: goose-up goose-down goose-status
.PHONY: storybook storybook-test
.PHONY: auth-test-up auth-test-down auth-test-status
.PHONY: mobile-dev mobile-test mobile-build-local mobile-preview mobile-preview-local-archive mobile-preview-auto mobile-update mobile-rollback mobile-release mobile-build-dev mobile-build-e2e mobile-help

help:
	@echo ""
	@echo "Core:"
	@echo "  make install | build | test | lint | clean | reset"
	@echo ""
	@echo "Infra:"
	@echo "  make dev-up | dev-down | dev-reset | dev-status"
	@echo ""
	@echo "Database:"
	@echo "  make db-migrate-all | db-rollback-all | db-status-all"
	@echo "  make db-generate-types | db-verify-types | db-new-migration NAME=foo"
	@echo ""
	@echo "Mobile:"
	@echo "  make mobile-help"

# Install dependencies
install:
	bun install

# Full local development setup (deps + infra + migrations)
dev-setup: install dev-up db-migrate-all dev-status
	@echo "Full dev setup complete"

# Start required local infrastructure (redis + dev db + test db)
dev-up:
	$(DOCKER_LOCAL) up -d redis db test-db

# Stop local development infrastructure and remove containers
dev-down:
	$(DOCKER_LOCAL) down

# Reset local development infrastructure including volumes, then recreate + migrate
dev-reset:
	$(DOCKER_LOCAL) down -v
	$(MAKE) dev-up
	$(MAKE) db-migrate-all

# Show local infrastructure status
dev-status:
	$(DOCKER_LOCAL) ps

infra-up: dev-up
infra-down: dev-down
infra-reset: dev-reset
infra-status: dev-status

# Docker compose targets
docker-up:
	$(MAKE) dev-up

docker-up-observability:
	$(DOCKER_COMPOSE) -f infra/docker/compose/base.yml -f infra/docker/compose/observability.yml up -d

docker-up-full:
	$(DOCKER_COMPOSE) -f infra/docker/compose/base.yml -f infra/docker/compose/dev.yml -f infra/docker/compose/observability.yml up -d

docker-down:
	$(DOCKER_COMPOSE) -f infra/docker/compose/base.yml -f infra/docker/compose/dev.yml -f infra/docker/compose/observability.yml down -v

define wait_for_db
	@echo "Waiting for $(1) database to be ready..."
	@until docker exec $(2) pg_isready -U postgres > /dev/null 2>&1; do sleep 1; done
endef

# Run migrations against the local development database
db-migrate:
	$(call wait_for_db,dev,hominem-postgres)
	DATABASE_URL="$(DEV_DATABASE_URL)" bun run --filter @hominem/db goose:up

# Run migrations against the local test database
db-migrate-test:
	$(call wait_for_db,test,hominem-test-postgres)
	DATABASE_URL="$(TEST_DATABASE_URL)" bun run --filter @hominem/db goose:up

# Run all local database migrations required for development
db-migrate-all: db-migrate db-migrate-test

# Roll back the latest migration on the local development database
db-rollback:
	$(call wait_for_db,dev,hominem-postgres)
	DATABASE_URL="$(DEV_DATABASE_URL)" bun run --filter @hominem/db goose:down

# Roll back the latest migration on the local test database
db-rollback-test:
	$(call wait_for_db,test,hominem-test-postgres)
	DATABASE_URL="$(TEST_DATABASE_URL)" bun run --filter @hominem/db goose:down

# Roll back the latest migration on both local databases
db-rollback-all: db-rollback db-rollback-test

# Check migration status on local databases
db-status:
	$(call wait_for_db,dev,hominem-postgres)
	DATABASE_URL="$(DEV_DATABASE_URL)" bun run --filter @hominem/db goose:status

db-status-test:
	$(call wait_for_db,test,hominem-test-postgres)
	DATABASE_URL="$(TEST_DATABASE_URL)" bun run --filter @hominem/db goose:status

db-status-all: db-status db-status-test

# Refresh generated Kysely database types from the development database schema
db-generate-types:
	@echo "Refreshing generated Kysely database types..."
	DATABASE_URL="$(DEV_DATABASE_URL)" bun run --filter @hominem/db kysely-codegen -- --out-file $(DB_TYPEGEN_FILE)

# Verify generated Kysely database types are up to date
db-verify-types:
	@echo "Verifying generated Kysely database types..."
	DATABASE_URL="$(DEV_DATABASE_URL)" bun run --filter @hominem/db kysely-codegen -- --verify --out-file $(DB_TYPEGEN_FILE)

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

# Backward-compatible aliases for package/db makefile commands
goose-up: db-migrate-all
goose-down: db-rollback
goose-status: db-status

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
	npx --yes squawk-cli --no-error-on-unmatched-pattern --exclude-path '*schema_baseline.sql' packages/db/migrations/*.sql
	bun turbo run lint --no-cache
	$(MAKE) db-verify-types
	@echo "── tsc: standard typecheck across all workspaces ────────────────"
	NODE_OPTIONS="--max-old-space-size=4096" bun turbo run typecheck --concurrency=4 --continue --no-cache
	@echo "── knip: unused files / exports / dependencies ──────────────────"
	bun run knip
	@echo "── tsc --noUnusedLocals across all workspaces ───────────────────"
	@for package in $(UNUSED_TS_PACKAGES); do \
		echo "Checking $$package"; \
		bun --cwd $$package x tsc --noEmit --noUnusedLocals --noUnusedParameters || exit 1; \
	done

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
	$(DOCKER_COMPOSE) -f infra/docker/compose/base.yml -f infra/docker/compose/dev.yml stop redis db test-db
	@echo "Auth test infra stopped"

auth-test-status:
	$(DOCKER_COMPOSE) -f infra/docker/compose/base.yml -f infra/docker/compose/dev.yml ps redis db test-db


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


# Run unified Storybook (all components at port 6006)
storybook:
	bun run --filter @hominem/ui storybook

# Run story-based tests with Vitest + Playwright
storybook-test:
	bun --cwd packages/ui x vitest --config vitest.stories.ts

# Mobile release and CI commands (single source, wrapped by apps/mobile/Makefile)
mobile-dev:
	bash apps/mobile/scripts/ensure-ios-variant.sh dev
	bash apps/mobile/scripts/run-variant.sh dev bun --cwd apps/mobile x expo run:ios

mobile-build-local:
	bash apps/mobile/scripts/ensure-ios-variant.sh dev
	xcodebuild -workspace apps/mobile/ios/HakumiDev.xcworkspace -scheme HakumiDev -configuration Debug -destination 'generic/platform=iOS Simulator' -quiet build

mobile-test:
	bun --cwd apps/mobile x vitest run --config vitest.config.ts \
		tests/auth-state-machine.test.ts \
		tests/auth-provider-utils.test.ts \
		tests/auth-route-guard.test.ts \
		tests/startup-metrics.test.ts \
		tests/auth-validation.test.ts \
		tests/auth-boot.test.ts \
		tests/integration/auth-contract.integration.test.ts \
		tests/integration/auth-flow.integration.test.ts

mobile-preview:
	APP_VARIANT=preview EXPO_NO_DOTENV=1 bun --cwd apps/mobile x eas build --profile preview --platform ios --auto-submit

mobile-preview-local-archive:
	bash apps/mobile/scripts/preflight.sh preview
	bun --cwd apps/mobile x eas env:exec preview 'APP_VARIANT=preview EXPO_NO_DOTENV=1 bun x expo prebuild --platform ios --clean'
	xcodebuild -workspace apps/mobile/ios/HakumiPreview.xcworkspace -scheme HakumiPreview -configuration Release -destination 'generic/platform=iOS' -archivePath apps/mobile/ios/build/HakumiPreview.xcarchive -allowProvisioningUpdates archive

mobile-preview-auto:
	bash apps/mobile/scripts/preflight.sh preview
ifeq ($(SIM),1)
	APP_VARIANT=preview EXPO_NO_DOTENV=1 bun --cwd apps/mobile x eas build --profile preview-simulator --platform ios --non-interactive
else
	APP_VARIANT=preview EXPO_NO_DOTENV=1 bun --cwd apps/mobile x eas build --profile preview --platform ios --non-interactive --auto-submit
endif

mobile-update:
	bash apps/mobile/scripts/preflight.sh $(CHANNEL)
	APP_VARIANT=$(CHANNEL) EXPO_NO_DOTENV=1 bun --cwd apps/mobile x eas update \
		--platform ios --branch $(CHANNEL) --clear-cache \
		--environment $(CHANNEL) --rollout-percentage $(ROLLOUT)

mobile-rollback:
	APP_VARIANT=preview EXPO_NO_DOTENV=1 bun --cwd apps/mobile x eas update:revert-update-rollout --branch preview

mobile-release:
	bash apps/mobile/scripts/preflight.sh production
	APP_VARIANT=production EXPO_NO_DOTENV=1 bun --cwd apps/mobile x eas build --profile production --platform ios --non-interactive --auto-submit

mobile-build-dev:
	bash apps/mobile/scripts/preflight.sh dev
	bun --cwd apps/mobile x eas build --profile development --platform ios --non-interactive

mobile-build-e2e:
	bash apps/mobile/scripts/preflight.sh dev
	bun --cwd apps/mobile x eas build --profile e2e --platform ios --non-interactive

mobile-help:
	@echo ""
	@echo "Mobile commands:"
	@echo "  make mobile-dev"
	@echo "  make mobile-test"
	@echo "  make mobile-build-local"
	@echo "  make mobile-preview"
	@echo "  make mobile-preview-local-archive"
	@echo "  make mobile-preview-auto [SIM=1]"
	@echo "  make mobile-update [CHANNEL=preview|production] [ROLLOUT=10..100]"
	@echo "  make mobile-rollback"
	@echo "  make mobile-release"
	@echo "  make mobile-build-dev"
	@echo "  make mobile-build-e2e"

# Backward-compatible aliases
dev: mobile-dev
test-mobile: mobile-test
preview: mobile-preview
preview-local-archive: mobile-preview-local-archive
preview-auto: mobile-preview-auto
update: mobile-update
rollback: mobile-rollback
release: mobile-release

all: install build
