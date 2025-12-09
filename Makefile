# Makefile for Node.js, Docker, Fastify, and Drizzle project

# Variables
DOCKER_COMPOSE = docker compose
NODE_ENV ?= development

# Phony targets
.PHONY: install start dev build test lint format clean docker-up docker-down check reset all test-db-start test-db-stop test-db-restart test-db-status

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
	find . -name "bun.lock" -exec rm -rf {}

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

# Default target
all: install build
