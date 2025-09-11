# Makefile for Node.js, Docker, Fastify, and Drizzle project

# Variables
DOCKER_COMPOSE = docker compose
NODE_ENV ?= development

# Phony targets
.PHONY: install start dev build test lint format clean docker-up docker-down check reset all

# Install dependencies
install:
	pnpm install

# Start the application in production mode
start:
	pnpm start

# Start the application in development mode
dev:
	@echo "Starting development server..."
	pm2 start pnpm --name="hominem" -- run dev

run-redis:
	@echo "Starting Redis..."
	pm2 start pnpm --name="hominem-redis" -- run redis

# Run tests
test:
	pnpm run test

# Build the application
build:
	pnpm turbo run lint --force --parallel
	pnpm turbo run build --force

# Run linter
lint:
	pnpm turbo run lint --force --parallel

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
	find . -name "pnpm-lock.yaml" -exec rm -rf {} +

# Stop Docker containers
docker-down:
	$(DOCKER_COMPOSE) down

# Run all tests and linting
check: test lint

# Full cleanup and reinstall
reset: clean install

# Default target
all: install build
