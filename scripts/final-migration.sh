#!/bin/bash
# Final PostgreSQL 15 to 17 Migration Script
# Migration to new database instance with proper volume configuration

set -e

echo "🚀 PostgreSQL 15 → 17 Migration (Final)"
echo "========================================"

# Database URLs
OLD_DATABASE_URL="postgresql://postgres:2D3Fd6a3cFg3C466gAedfeCdGeC153f5@viaduct.proxy.rlwy.net:39513/railway"
NEW_DATABASE_URL="postgresql://postgres:oI7UiOOcwUXhtZ3wFRKK7v7dp45dXTuktfBDiD@crossover.proxy.rlwy.net:50724/hominem"

# Set PostgreSQL path
export PATH="/usr/local/opt/postgresql@15/bin:$PATH"

echo "📦 Step 1: Creating backup from PostgreSQL 15..."
pg_dump "$OLD_DATABASE_URL" \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    --exclude-schema="_timescaledb*" \
    --exclude-schema="timescaledb*" \
    --verbose \
    > final_migration_backup.sql

echo "✅ Backup created: final_migration_backup.sql"

echo "🔧 Step 2: Importing to PostgreSQL 17 (with volume)..."
psql "$NEW_DATABASE_URL" < final_migration_backup.sql

echo "🧪 Step 3: Testing new database connection..."
psql "$NEW_DATABASE_URL" -c "SELECT version();"

echo "📊 Step 4: Verifying data migration..."
psql "$NEW_DATABASE_URL" -c "\dt" | head -20

echo "🔢 Step 5: Checking data counts..."
psql "$NEW_DATABASE_URL" -c "
    SELECT 'users' as table_name, COUNT(*) as count FROM users
    UNION ALL
    SELECT 'transactions', COUNT(*) FROM transactions  
    UNION ALL
    SELECT 'chat_message', COUNT(*) FROM chat_message
    UNION ALL
    SELECT 'finance_accounts', COUNT(*) FROM finance_accounts;
"

echo "🔍 Step 6: Installing pgvector extension..."
psql "$NEW_DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS vector;"
psql "$NEW_DATABASE_URL" -c "SELECT * FROM pg_extension WHERE extname = 'vector';"

echo "✅ Migration completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update your Railway applications to use NEW_DATABASE_URL:"
echo "   $NEW_DATABASE_URL"
echo "2. Test your applications thoroughly"
echo "3. Remove old PostgreSQL 15 service (hominem-db) when satisfied"
echo "4. Remove old PostgreSQL 17 service (pontistudios-postgres) when satisfied"
echo "5. Delete backup file when no longer needed" 
