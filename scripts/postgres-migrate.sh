#!/bin/bash
# PostgreSQL 15 to 17 Migration Script
# This script performs an in-place upgrade using pg_upgrade

set -e

echo "Starting PostgreSQL 15 to 17 migration..."

# Stop both PostgreSQL services if running
echo "Stopping PostgreSQL services..."
pg_ctl -D /var/lib/postgresql/15/data -m fast stop || true
pg_ctl -D /var/lib/postgresql/17/data -m fast stop || true

# Create new data directory for PostgreSQL 17
echo "Initializing PostgreSQL 17 data directory..."
mkdir -p /var/lib/postgresql/17/data
chown postgres:postgres /var/lib/postgresql/17/data
chmod 700 /var/lib/postgresql/17/data

# Initialize the new cluster
sudo -u postgres /usr/lib/postgresql/17/bin/initdb -D /var/lib/postgresql/17/data

# Run pg_upgrade
echo "Running pg_upgrade..."
sudo -u postgres /usr/lib/postgresql/17/bin/pg_upgrade \
  --old-datadir=/var/lib/postgresql/15/data \
  --new-datadir=/var/lib/postgresql/17/data \
  --old-bindir=/usr/lib/postgresql/15/bin \
  --new-bindir=/usr/lib/postgresql/17/bin \
  --check

# If check passes, run the actual upgrade
sudo -u postgres /usr/lib/postgresql/17/bin/pg_upgrade \
  --old-datadir=/var/lib/postgresql/15/data \
  --new-datadir=/var/lib/postgresql/17/data \
  --old-bindir=/usr/lib/postgresql/15/bin \
  --new-bindir=/usr/lib/postgresql/17/bin

# Start PostgreSQL 17
echo "Starting PostgreSQL 17..."
sudo -u postgres pg_ctl -D /var/lib/postgresql/17/data start

echo "Migration complete! Don't forget to:"
echo "1. Update your connection strings"
echo "2. Run the generated update scripts"
echo "3. Test your applications"
echo "4. Remove old data directory when satisfied"
