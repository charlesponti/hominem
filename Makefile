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
	yarn install

# Start the application in production mode
start:
	yarn start

# Start the application in development mode
dev:
	@echo "Starting development server..."
	pm2 start yarn --name="hominem" -- dev

# Run tests
test:
	yarn test

# Build the application
build:
	yarn turbo run lint --force --parallel
	yarn turbo run build --force

# Run linter
lint:
	yarn turbo run lint --force --parallel

# Format code
format:
	yarn format

# Clean build artifacts and dependencies
clean:
	find . -type d -name "node_modules" -exec rm -rf {} +
	find . -type d -name "dist" -exec rm -rf {} +
	find . -type d -name "build" -exec rm -rf {} +
	find . -type d -name "coverage" -exec rm -rf {} +
	find . -type d -name ".next" -exec rm -rf {} +
	find . -type d -name ".turbo" -exec rm -rf {} +
	find . -type d -name "yarn.lock" -exec rm -rf {} +

# Stop Docker containers
docker-down:
	$(DOCKER_COMPOSE) down

# Run all tests and linting
check: test lint

# Full cleanup and reinstall
reset: clean install

# Default target
all: install build
