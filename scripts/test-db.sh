#!/usr/bin/env bash
set -euo pipefail

DB_NAME="hominem-test-postgres"
DB_PORT="4433"
DB_IMAGE="ghcr.io/hackefeller/postgres:latest"
DB_URL="postgres://postgres:postgres@localhost:${DB_PORT}/hominem-test"

wait_for_db() {
  echo "Waiting for database to be ready..."
  until docker exec "$DB_NAME" pg_isready -h localhost -p 5432 -U postgres >/dev/null 2>&1; do
    sleep 1
  done
}

case "${1:-}" in
  "start")
    echo "Starting test database..."
    if docker ps -q -f "name=^${DB_NAME}$" | grep -q .; then
      echo "Test database is already running"
    else
      docker run --name "$DB_NAME" \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD=postgres \
        -e POSTGRES_DB=hominem-test \
        -p "${DB_PORT}:5432" \
        -d "$DB_IMAGE"

      wait_for_db

      echo "Running migrations..."
      DATABASE_URL="$DB_URL" bun run --filter @hominem/db goose:up

      echo "Test database is ready on port $DB_PORT"
    fi
    ;;
  "stop")
    echo "Stopping test database..."
    docker stop $DB_NAME 2>/dev/null || echo "Database was not running"
    docker rm $DB_NAME 2>/dev/null || echo "Database container did not exist"
    echo "Test database stopped"
    ;;
  "restart")
    echo "Restarting test database..."
    $0 stop
    $0 start
    ;;
  "status")
    if docker ps -q -f "name=^${DB_NAME}$" | grep -q .; then
      echo "Test database is running on port $DB_PORT"
    else
      echo "Test database is not running"
      exit 1
    fi
    ;;
  "logs")
    docker logs "$DB_NAME"
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status|logs}"
    echo ""
    echo "Commands:"
    echo "  start   - Start the test database and run migrations"
    echo "  stop    - Stop and remove the test database"
    echo "  restart - Stop and start the test database"
    echo "  status  - Check if the test database is running"
    echo "  logs    - Show test database logs"
    exit 1
    ;;
esac
