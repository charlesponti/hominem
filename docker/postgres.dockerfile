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
RUN apt-get update && apt-get install -y --no-install-recommends gnupg curl lsb-release &&     curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg &&     echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list &&     apt-get update

# postgis	Spatial database extension for geographic objects.
# pgrouting	Routing and network analysis on PostGIS.
# postgis_tiger_geocoder	Geocoding extension for address standardization.
# hstore	Key-value store within a single column.
# uuid-ossp	Generates universally unique identifiers (UUIDs).
# pgcrypto	Provides cryptographic functions.
# btree_gin	GIN indexing support for B-tree columns.
# btree_gist	GiST indexing for B-tree structures.
# fuzzystrmatch	String similarity matching (e.g., Levenshtein).
# unaccent	Removes accents from text (useful for searches).
# intarray	Optimized handling of integer arrays.
# cube	Multidimensional cube datatype support.
# earthdistance	Calculate great-circle distances between points.
RUN apt-get update && apt-get install -y \
    postgresql-${PG_MAJOR}-pgrouting \
    postgresql-${PG_MAJOR}-postgis-3 \
    postgresql-${PG_MAJOR}-postgis-3-scripts \
    postgresql-${PG_MAJOR}-cron \
    postgis \
    gdal-bin \
    osm2pgsql \
    && rm -rf /var/lib/apt/lists/*
