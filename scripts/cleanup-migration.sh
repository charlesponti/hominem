#!/bin/bash
# Cleanup script for PostgreSQL migration files and old services

set -e

echo "🧹 Cleaning up PostgreSQL migration files and old services"
echo "=========================================================="

# Remove backup files
echo "📦 Removing migration backup files..."
if [ -f "railway_migration_backup.sql" ]; then
    rm railway_migration_backup.sql
    echo "✅ Removed railway_migration_backup.sql"
fi

if [ -f "clean_migration_backup.sql" ]; then
    rm clean_migration_backup.sql
    echo "✅ Removed clean_migration_backup.sql"
fi

if [ -f "final_migration_backup.sql" ]; then
    rm final_migration_backup.sql
    echo "✅ Removed final_migration_backup.sql"
fi

echo "🔄 Installing dependencies without Chroma..."
pnpm install

echo "✅ Cleanup completed!"
echo ""
echo "📋 Next steps to complete Chroma removal:"
echo "1. Update your Railway applications to use the new PostgreSQL 17 database:"
echo "   postgresql://postgres:oI7UiOOcwUXhtZ3wFRKK7v7dp45dXTuktfBDiD@crossover.proxy.rlwy.net:50724/hominem"
echo "2. Remove old PostgreSQL 15 service (hominem-db) from Railway"
echo "3. Remove old PostgreSQL 17 service (pontistudios-postgres) from Railway"
echo "4. Remove any Chroma service from Railway if it exists"
echo "5. Test your applications thoroughly" 
