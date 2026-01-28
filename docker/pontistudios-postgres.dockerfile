# Updated for PostgreSQL 17 with pgvector support
FROM postgres:17

# Install build dependencies and pgvector
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    postgresql-server-dev-${PG_MAJOR} \
    && rm -rf /var/lib/apt/lists/*

# Install pgvector extension
RUN cd /tmp && \
    git clone --branch v0.7.4 https://github.com/pgvector/pgvector.git && \
    cd pgvector && \
    make clean && \
    make OPTFLAGS="" && \
    make install && \
    rm -rf /tmp/pgvector


# Install other PostgreSQL extensions
RUN apt-get update && apt-get install -y \
    postgresql-${PG_MAJOR}-pgrouting \
    postgresql-${PG_MAJOR}-postgis-3 \
    postgresql-${PG_MAJOR}-postgis-3-scripts \
    postgis \
    gdal-bin \
    osm2pgsql \
    && rm -rf /var/lib/apt/lists/*

# Add init script to enable all required extensions on startup
COPY docker/init-extensions.sh /docker-entrypoint-initdb.d/init-extensions.sh
RUN chmod +x /docker-entrypoint-initdb.d/init-extensions.sh
