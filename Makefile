# Makefile for Node.js, Docker, Fastify, and Drizzle project

# Variables
APP_DB_URL=postgresql://admin:password@localhost:5432/hominem
TEST_DB_URL=postgresql://postgres:postgres@localhost:5433/hominem_test
DOCKER_COMPOSE = docker compose
NODE_ENV ?= development

# Phony targets
.PHONY: install start dev build test lint format clean docker-up docker-down check reset all

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
	bunx turbo run lint --force --parallel
	bunx turbo run build --force

# Run linter
lint:
	bunx turbo run lint --force --parallel

# Clean build artifacts and dependencies
clean:
	find . -type d -name "node_modules" -exec rm -rf {} +
	find . -type d -name "dist" -exec rm -rf {} +
	find . -type d -name "build" -exec rm -rf {} +
	find . -type d -name "coverage" -exec rm -rf {} +
	find . -type d -name ".next" -exec rm -rf {} +
	find . -type d -name ".turbo" -exec rm -rf {} +
	find . -name "bun.lock" -exec rm -rf {} +

# Stop Docker containers
docker-down:
	$(DOCKER_COMPOSE) down

# Run all tests and linting
check: test lint

# Full cleanup and reinstall
reset: clean install

# Default target
all: install build
