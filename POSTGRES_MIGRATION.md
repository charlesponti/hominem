# PostgreSQL Migration Guide for Railway

This guide helps you migrate from PostgreSQL 15 to 17 on Railway.

## Option 1: Data Export/Import (Safest)

### Step 1: Export your data from PostgreSQL 15
```bash
# Connect to your current Railway PostgreSQL 15 instance
railway connect

# Export your database
pg_dump -h your-host -U your-user -d your-database --no-owner --no-privileges > backup.sql
```

### Step 2: Create new PostgreSQL 17 service
1. Deploy a new PostgreSQL 17 service using our custom Docker image
2. Update your Railway config to use the new service
3. Import the data:
```bash
# Connect to the new PostgreSQL 17 service
psql -h new-host -U new-user -d new-database < backup.sql
```

### Step 3: Update connection strings
Update your application environment variables to point to the new database.

## Option 2: In-Place Migration (Advanced)

### Prerequisites
- Backup your data first!
- Ensure you have access to the Railway volume

### Steps
1. **Scale down your application** to prevent data corruption
2. **Create a backup** of your current data
3. **Deploy migration container** with both PostgreSQL 15 and 17
4. **Run pg_upgrade** using the migration script
5. **Update your application** to use PostgreSQL 17

## Option 3: Fresh Start (Data Loss)

If you can afford to lose existing data:

1. **Export any important data** you want to keep
2. **Delete the current PostgreSQL service** in Railway
3. **Deploy new PostgreSQL 17 service** using our Docker image
4. **Run your migrations** to recreate schema
5. **Import any saved data**

## Railway Deployment Commands

### Deploy new PostgreSQL service
```bash
# Build and push the Docker image
docker build -f docker/postgres.dockerfile -t your-registry/postgres:17 .
docker push your-registry/postgres:17

# Deploy to Railway
railway service create postgres-17
railway deploy --service postgres-17
```

### Environment Variables for Railway
```
POSTGRES_DB=your_database
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
PGDATA=/var/lib/postgresql/data
```

## Testing Migration

Before switching production:

1. **Test with a copy** of your data
2. **Verify all extensions** are working (especially pgvector)
3. **Run your application tests** against the new database
4. **Check performance** compared to PostgreSQL 15

## Rollback Plan

Always have a rollback plan:

1. Keep the PostgreSQL 15 service running during migration
2. Keep a fresh backup before starting
3. Document all configuration changes
4. Test rollback procedure in staging

## Post-Migration Checklist

- [ ] Verify all data migrated correctly
- [ ] Test pgvector functionality
- [ ] Update all connection strings
- [ ] Run ANALYZE to update statistics
- [ ] Monitor performance
- [ ] Remove old PostgreSQL 15 service (after confirming everything works)

## Troubleshooting

### Common Issues
- **Extension compatibility**: Ensure all extensions are available in PostgreSQL 17
- **Data type changes**: Some data types may need updating
- **Configuration differences**: PostgreSQL 17 has different default settings

### Recovery
If migration fails:
1. Stop PostgreSQL 17
2. Restart PostgreSQL 15 service
3. Restore from backup if needed
4. Investigate and fix issues before retrying
