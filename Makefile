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
	npm install

# Start the application in production mode
start:
	npm start

# Start the application in development mode
dev:
	@echo "Starting development server..."
	pm2 start npm --name="hominem" -- run dev

# Run tests
test:
	npm test

# Build the application
build:
	npm run lint
	npm run build

# Run linter
lint:
	npm run lint

# Format code
format:
	npm run format

# Clean build artifacts and dependencies
clean:
	find apps packages -type d -name "node_modules" -exec rm -rf {} +
	find apps packages -type d -name "dist" -exec rm -rf {} +
	find apps packages -type d -name "build" -exec rm -rf {} +
	

# Start Docker containers
docker-up:
	$(DOCKER_COMPOSE) up -d

# Stop Docker containers
docker-down:
	$(DOCKER_COMPOSE) down

# Run all tests and linting
check: test lint

# Full cleanup and reinstall
reset: clean install

# Default target
all: install build
