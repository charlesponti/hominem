#!/bin/bash

# Test Database Setup Script
# This script manages the test PostgreSQL database for running tests

set -e

DB_NAME="hominem-test-postgres"
DB_PORT="4433"
DB_IMAGE="ghcr.io/charlesponti/hominem/pontistudios-postgres:latest"

case "${1:-}" in
  "start")
    echo "Starting test database..."
    if docker ps -q -f name=$DB_NAME | grep -q .; then
      echo "Test database is already running"
    else
      docker run --name $DB_NAME \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD=postgres \
        -e POSTGRES_DB=hominem-test \
        -p $DB_PORT:5432 \
        -d $DB_IMAGE
      
      echo "Waiting for database to be ready..."
      sleep 5
      
      echo "Running migrations..."
      cd packages/data
      DATABASE_URL="postgres://postgres:postgres@localhost:$DB_PORT/hominem-test" npm run migrate
      cd ../..
      
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
    if docker ps -q -f name=$DB_NAME | grep -q .; then
      echo "Test database is running on port $DB_PORT"
    else
      echo "Test database is not running"
      exit 1
    fi
    ;;
  "logs")
    docker logs $DB_NAME
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
