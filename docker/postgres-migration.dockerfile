# PostgreSQL Migration Dockerfile - handles upgrade from 15 to 17
FROM postgres:17

# Install PostgreSQL 15 for migration
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    && wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - \
    && echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get install -y postgresql-15 postgresql-client-15 \
    && rm -rf /var/lib/apt/lists/*

# Install build dependencies and pgvector for both versions
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    postgresql-server-dev-15 \
    postgresql-server-dev-17 \
    && rm -rf /var/lib/apt/lists/*

# Install pgvector extension for both PostgreSQL versions
RUN cd /tmp && \
    git clone --branch v0.7.4 https://github.com/pgvector/pgvector.git && \
    cd pgvector && \
    # Install for PostgreSQL 15
    make clean && \
    make OPTFLAGS="" PG_CONFIG=/usr/lib/postgresql/15/bin/pg_config && \
    make install PG_CONFIG=/usr/lib/postgresql/15/bin/pg_config && \
    # Install for PostgreSQL 17
    make clean && \
    make OPTFLAGS="" PG_CONFIG=/usr/lib/postgresql/17/bin/pg_config && \
    make install PG_CONFIG=/usr/lib/postgresql/17/bin/pg_config && \
    rm -rf /tmp/pgvector

# Install other PostgreSQL extensions for both versions
RUN apt-get update && apt-get install -y \
    postgresql-15-pgrouting \
    postgresql-15-postgis-3 \
    postgresql-15-postgis-3-scripts \
    postgresql-17-pgrouting \
    postgresql-17-postgis-3 \
    postgresql-17-postgis-3-scripts \
    postgis \
    gdal-bin \
    osm2pgsql \
    && rm -rf /var/lib/apt/lists/*

# Copy migration script
COPY scripts/postgres-migrate.sh /usr/local/bin/postgres-migrate.sh
RUN chmod +x /usr/local/bin/postgres-migrate.sh

# Copy initialization script
COPY docker/init-extensions.sql /docker-entrypoint-initdb.d/
