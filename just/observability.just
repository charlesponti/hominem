set dotenv-load := false

OBSERVABILITY_COMPOSE := justfile_directory() / 'infra/observability/docker-compose.yml'

up:
    docker compose -f {{OBSERVABILITY_COMPOSE}} up -d

down:
    docker compose -f {{OBSERVABILITY_COMPOSE}} down

logs:
    docker compose -f {{OBSERVABILITY_COMPOSE}} logs -f otel-collector

status:
    docker compose -f {{OBSERVABILITY_COMPOSE}} ps

railway-logs service='api' lines='200':
    RAILWAY_LOG_LINES={{lines}} {{justfile_directory()}}/scripts/railway-logs.sh {{service}}
