# Hominem PostgreSQL 18 with pgvector and PostGIS
FROM pgvector/pgvector:pg18

# Install PostGIS and pgrouting
RUN apt-get update && apt-get install -y \
    postgresql-18-postgis-3 \
    postgresql-18-pgrouting \
    && rm -rf /var/lib/apt/lists/*

# Add init script for local/dev convenience so pulled images are turnkey
COPY infra/docker/images/postgres/init-extensions.sh /docker-entrypoint-initdb.d/init-extensions.sh
RUN chmod +x /docker-entrypoint-initdb.d/init-extensions.sh
