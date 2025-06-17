#!/bin/bash
# Quick Railway PostgreSQL 15 to 17 Migration Script

set -e

echo "🚀 Railway PostgreSQL Migration (15 → 17)"
echo "=========================================="

# Check if required environment variables are set
if [ -z "$OLD_DATABASE_URL" ] || [ -z "$NEW_DATABASE_URL" ]; then
    echo "❌ Error: Please set OLD_DATABASE_URL and NEW_DATABASE_URL environment variables"
    echo "Example:"
    echo "export OLD_DATABASE_URL='postgresql://user:pass@old-host:5432/db'"
    echo "export NEW_DATABASE_URL='postgresql://user:pass@new-host:5432/db'"
    exit 1
fi

echo "📦 Step 1: Creating backup from PostgreSQL 15..."
pg_dump "$OLD_DATABASE_URL" \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    --verbose \
    > railway_migration_backup.sql

echo "✅ Backup created: railway_migration_backup.sql"

echo "🔧 Step 2: Importing to PostgreSQL 17..."
psql "$NEW_DATABASE_URL" < railway_migration_backup.sql

echo "🧪 Step 3: Testing connection to new database..."
psql "$NEW_DATABASE_URL" -c "SELECT version();"

echo "🔍 Step 4: Verifying pgvector extension..."
psql "$NEW_DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS vector;"
psql "$NEW_DATABASE_URL" -c "SELECT * FROM pg_extension WHERE extname = 'vector';"

echo "✅ Migration completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update your Railway environment variables to use NEW_DATABASE_URL"
echo "2. Test your application thoroughly"
echo "3. Remove the old PostgreSQL 15 service when satisfied"
echo "4. Delete railway_migration_backup.sql when no longer needed"
