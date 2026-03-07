# Developer Setup Guide

This guide covers setting up the development environment and deploying to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Running the Application](#running-the-application)
- [Database Management](#database-management)
- [Testing](#testing)
- [Production Deployment](#production-deployment)

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Bun | ≥1.1.0 | JavaScript runtime |
| Docker | Latest | For local databases |
| Docker Compose | Latest | For orchestrating services |
| PostgreSQL Client | 18+ | For connecting to DB |

### Install Prerequisites

```bash
# Bun
curl -fsSL https://bun.sh/install | bash

# Docker Desktop (macOS/Windows)
# Download from https://www.docker.com/products/docker-desktop

# Verify installations
bun --version
docker --version
docker-compose --version
```

## Local Development

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/charlesponti/hominem.git
cd hominem

# Install dependencies
bun install
```

### 2. Start Local Infrastructure

The project uses Docker Compose for local databases and services.

```bash
# Start all services (database, redis, test DB, monitoring)
cd docker
docker-compose -f compose/base.yml -f compose/dev.yml -f compose/monitoring.yml up -d
```

This starts:
| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5432 | Main database |
| Test DB | 4433 | Ephemeral test database |
| Grafana DB | 5433 | Grafana's database |
| Redis | 6379 | Cache and sessions |
| Prometheus | 9090 | Metrics collection |
| Grafana | 3000 | Dashboards |

### 3. Environment Variables

Create a `.env` file in the project root:

```bash
# Copy the example
cp .env.example .env

# Edit with your values
DATABASE_URL="postgres://postgres:postgres@localhost:5432/hominem"
REDIS_URL="redis://localhost:6379"
# ... other variables
```

### 4. Run Database Migrations

```bash
# Generate and push migrations
bun run db:generate
bun run db:push

# Or run migrations
bun run db:migrate
```

### 5. Start the Development Server

```bash
# From project root
bun run dev
```

This starts all apps in watch mode with hot reload.

## Running the Application

### All Apps

```bash
bun run dev
```

### Individual Apps

```bash
# API server
bun run dev --filter @hominem/api

# Notes app
bun run dev --filter @hominem/notes

# Finance app
bun run dev --filter @hominem/finance
```

### Turbo Filter Syntax

```bash
# Run specific package and its dependencies
bun run dev --filter=@hominem/notes...

# Run multiple packages
bun run dev --filter=@hominem/api --filter=@hominem/notes
```

## Database Management

### Creating Migrations

```bash
# Generate migration from schema changes
bun run db:generate

# Push schema changes to database
bun run db:push

# Apply pending migrations
bun run db:migrate
```

### Database GUI

Connect your preferred DB client (TablePlus, DBeaver, pgAdmin) to:

```
Host: localhost
Port: 5432
User: postgres
Password: postgres
Database: hominem
```

### Reset Local Database

```bash
# Stop and remove volumes (WARNING: deletes all data)
cd docker
docker-compose -f compose/base.yml -f compose/dev.yml down -v

# Restart with fresh database
docker-compose -f compose/base.yml -f compose/dev.yml up -d
```

### Create Extensions Manually

If migrations fail due to missing extensions:

```bash
docker exec hominem-postgres psql -U postgres -d hominem -c "
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgrouting;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS hstore;
CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS intarray;
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;
"
```

## Testing

### Run All Tests

```bash
bun run test
```

### Run Tests for Specific Package

```bash
bun run test --filter @hominem/api
```

### Run Tests with Coverage

```bash
bun run test:coverage
```

### Lint and Typecheck

```bash
# Check everything
bun run check

# Or run individually
bun run lint
bun run typecheck
bun run format
```

## Production Deployment

### Railway Deployment

The project deploys to Railway. Each app has its own `railway.json` configuration.

#### Prerequisites

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login to Railway:
```bash
railway login
```

3. Link to project:
```bash
railway init
```

#### Database Setup on Railway

1. **Create PostgreSQL service:**
```bash
railway add -c postgresql
```

2. **Add PostgreSQL plugin:**
```bash
# Via Railway dashboard:
# Project → Add Plugin → PostgreSQL → Select plan
```

3. **Get connection string:**
```bash
railway variables get DATABASE_URL
# Or from Railway dashboard: Service → Variables
```

#### Environment Variables

Set the following in Railway dashboard (Project → Variables):

| Variable | Description | Example |
|----------|-------------|---------|
| NODE_ENV | Environment | production |
| DATABASE_URL | PostgreSQL connection | postgres://... |
| REDIS_URL | Redis connection | redis://... |
| AUTH_SECRET | Auth encryption key | (generate with `openssl rand -base64 32`) |

#### Deploy All Services

```bash
# Deploy from root (each service deploys independently via railway.json)
railway up

# Or deploy specific service
cd services/api
railway up

cd apps/notes
railway up
```

#### Railway Deployment Flow

```
┌─────────────────────────────────────────────────────────┐
│                   Railway Dashboard                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐          │
│  │   API   │   │  Notes   │   │ Finance  │          │
│  │ Service │   │ Service  │   │ Service  │          │
│  └────┬────┘   └────┬────┘   └────┬────┘          │
│       │             │             │                  │
│       └─────────────┼─────────────┘                  │
│                     │                                │
│              ┌──────┴──────┐                         │
│              │ PostgreSQL  │                         │
│              │   Plugin   │                         │
│              └────────────┘                         │
│                                                         │
│              ┌────────────┐                         │
│              │   Redis    │                         │
│              │   Plugin   │                         │
│              └────────────┘                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Deployment Checklist

Before deploying:

- [ ] Run tests locally: `bun run test`
- [ ] Run typecheck: `bun run typecheck`
- [ ] Run lint: `bun run lint`
- [ ] Verify migrations work: `bun run db:push`
- [ ] Set environment variables in Railway
- [ ] Verify database extensions are created

#### Troubleshooting Railway

**Database connection errors:**
- Verify `DATABASE_URL` is set in Railway variables
- Check that PostgreSQL plugin is added to the project

**Build failures:**
- Check build logs in Railway dashboard
- Ensure all dependencies are in `package.json`

**Migration failures:**
- Run migrations locally first to test
- Check that database user has proper permissions

## Common Issues

### "Old PostgreSQL data" error

PostgreSQL 18 changed volume mount location. Fix:
```bash
docker-compose down -v
docker-compose up -d
```

### Port already in use

Check what's using the port:
```bash
lsof -i :5432
```

Kill the process or change the port in `docker/compose/dev.yml`.

### Extension not found

Create extensions manually (see above) or ensure migrations run on startup.

## Scripts Reference

| Script | Purpose |
|--------|---------|
| `bun run dev` | Start all apps in dev mode |
| `bun run build` | Build all packages |
| `bun run test` | Run all tests |
| `bun run check` | Run lint, typecheck, tests |
| `bun run db:generate` | Generate migrations |
| `bun run db:push` | Push schema to DB |
| `bun run db:migrate` | Run migrations |
| `bun run lint` | Run linter |
| `bun run format` | Format code |
| `bun run typecheck` | Type check |
