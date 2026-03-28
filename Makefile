SHELL := /bin/bash

ifneq (,$(wildcard .env))
include .env
export
endif

DOCKER_COMPOSE := docker compose
DOCKER_DEV := $(DOCKER_COMPOSE) -f infra/docker/compose/base.yml -f infra/docker/compose/dev.yml
DOCKER_OBSERVABILITY := $(DOCKER_COMPOSE) -f infra/docker/compose/base.yml -f infra/docker/compose/observability.yml
DOCKER_FULL := $(DOCKER_COMPOSE) -f infra/docker/compose/base.yml -f infra/docker/compose/dev.yml -f infra/docker/compose/observability.yml

DEV_DATABASE_URL ?= postgres://postgres:postgres@localhost:5434/hominem
TEST_DATABASE_URL ?= postgres://postgres:postgres@localhost:4433/hominem-test
GOOSE_MIGRATIONS_DIR ?= $(CURDIR)/packages/db/migrations

.PHONY: help install dev build test lint format duplication typecheck-native
.PHONY: infra-up infra-down infra-reset infra-status
.PHONY: docker-up docker-up-observability docker-up-full docker-down
.PHONY: db-up db-up-test db-down db-down-test db-status db-status-test
.PHONY: db-reset-dev db-reset-test db-verify-fresh
.PHONY: db-v1-verify-fresh db-v1-verify-relational db-v1-verify-registry db-v1-verify-rls
.PHONY: db-v1-verify-tags db-v1-verify-rollback db-v1-verify-reset db-v1-verify-tag-performance db-v1-verify-all

help:
	@echo ""
	@echo "Core:"
	@echo "  make install | dev | build | test | lint | format | duplication"
	@echo ""
	@echo "Infra:"
	@echo "  make infra-up | infra-down | infra-reset | infra-status"
	@echo "  make docker-up-observability | docker-up-full | docker-down"
	@echo ""
	@echo "Database:"
	@echo "  make db-up | db-up-test | db-down | db-down-test | db-status | db-status-test"
	@echo "  make db-reset-dev | db-reset-test | db-verify-fresh | db-v1-verify-all"

install:
	bun install

dev:
	bun run dev

build:
	bun run build

test:
	bun run test

format:
	bun run format

duplication:
	bun run ./scripts/check-duplication.ts

typecheck-native:
	bun run typecheck:native

lint:
	bunx turbo run lint
	bun run typecheck:native
	bun run ./scripts/check-duplication.ts

infra-up:
	$(DOCKER_DEV) up -d redis db test-db

infra-down:
	$(DOCKER_DEV) down

infra-reset:
	$(DOCKER_DEV) down -v
	$(MAKE) infra-up

infra-status:
	$(DOCKER_DEV) ps

docker-up: infra-up

docker-up-observability:
	$(DOCKER_OBSERVABILITY) up -d

docker-up-full:
	$(DOCKER_FULL) up -d

docker-down:
	$(DOCKER_FULL) down -v

db-up:
	DATABASE_URL="$(DEV_DATABASE_URL)" bash ./scripts/run-goose.sh up

db-up-test:
	DATABASE_URL="$(TEST_DATABASE_URL)" bash ./scripts/run-goose.sh up

db-down:
	DATABASE_URL="$(DEV_DATABASE_URL)" bash ./scripts/run-goose.sh down

db-down-test:
	DATABASE_URL="$(TEST_DATABASE_URL)" bash ./scripts/run-goose.sh down

db-status:
	DATABASE_URL="$(DEV_DATABASE_URL)" bash ./scripts/run-goose.sh status

db-status-test:
	DATABASE_URL="$(TEST_DATABASE_URL)" bash ./scripts/run-goose.sh status

db-reset-dev:
	DATABASE_URL="$(DEV_DATABASE_URL)" bash ./scripts/reset-database.sh
	DATABASE_URL="$(DEV_DATABASE_URL)" bash ./scripts/run-goose.sh up

db-reset-test:
	DATABASE_URL="$(TEST_DATABASE_URL)" bash ./scripts/reset-database.sh
	DATABASE_URL="$(TEST_DATABASE_URL)" bash ./scripts/run-goose.sh up

db-verify-fresh:
	TEST_DATABASE_URL="$(TEST_DATABASE_URL)" GOOSE_MIGRATIONS_DIR="$(GOOSE_MIGRATIONS_DIR)" bash ./scripts/verify-goose-fresh-db.sh

db-v1-verify-fresh:
	TEST_DATABASE_URL="$(TEST_DATABASE_URL)" GOOSE_MIGRATIONS_DIR="$(GOOSE_MIGRATIONS_DIR)" bash ./scripts/verify-goose-fresh-db.sh

db-v1-verify-relational:
	TEST_DATABASE_URL="$(TEST_DATABASE_URL)" GOOSE_MIGRATIONS_DIR="$(GOOSE_MIGRATIONS_DIR)" bash ./scripts/verify-v1-relational.sh

db-v1-verify-registry:
	TEST_DATABASE_URL="$(TEST_DATABASE_URL)" GOOSE_MIGRATIONS_DIR="$(GOOSE_MIGRATIONS_DIR)" bash ./scripts/verify-v1-registry.sh

db-v1-verify-rls:
	TEST_DATABASE_URL="$(TEST_DATABASE_URL)" GOOSE_MIGRATIONS_DIR="$(GOOSE_MIGRATIONS_DIR)" bash ./scripts/verify-v1-rls.sh

db-v1-verify-tags:
	TEST_DATABASE_URL="$(TEST_DATABASE_URL)" GOOSE_MIGRATIONS_DIR="$(GOOSE_MIGRATIONS_DIR)" bash ./scripts/verify-v1-tags.sh

db-v1-verify-rollback:
	TEST_DATABASE_URL="$(TEST_DATABASE_URL)" GOOSE_MIGRATIONS_DIR="$(GOOSE_MIGRATIONS_DIR)" bash ./scripts/verify-v1-rollback.sh

db-v1-verify-reset:
	TEST_DATABASE_URL="$(TEST_DATABASE_URL)" GOOSE_MIGRATIONS_DIR="$(GOOSE_MIGRATIONS_DIR)" bash ./scripts/verify-v1-reset.sh

db-v1-verify-tag-performance:
	TEST_DATABASE_URL="$(TEST_DATABASE_URL)" GOOSE_MIGRATIONS_DIR="$(GOOSE_MIGRATIONS_DIR)" bash ./scripts/verify-v1-tag-performance.sh

db-v1-verify-all: db-v1-verify-fresh db-v1-verify-relational db-v1-verify-registry db-v1-verify-rls db-v1-verify-tags db-v1-verify-rollback db-v1-verify-reset db-v1-verify-tag-performance
