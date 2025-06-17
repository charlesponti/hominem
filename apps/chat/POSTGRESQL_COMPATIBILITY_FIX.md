# PostgreSQL Version Compatibility Fix for Railway

## Issue
Railway shows error: "The data directory was initialized by PostgreSQL version 15, which is not compatible with this version 17.3"

## Root Cause
- Railway has persistent volume with PostgreSQL 15 data
- Docker image was using `postgres:latest` (PostgreSQL 17)
- PostgreSQL doesn't support downgrade migrations

## Solution Applied
Updated [`docker/postgres.dockerfile`](../docker/postgres.dockerfile) to use PostgreSQL 15:
```dockerfile
FROM postgres:15
```

## Next Steps

### 1. Wait for Docker Image Rebuild
The GitHub Action will automatically rebuild and publish the image with PostgreSQL 15.

### 2. Update Railway Service
In Railway, you may need to:
1. Delete the current PostgreSQL service (this will delete existing data)
2. Create a new service using the updated Docker image: `ghcr.io/charlesponti/hominem/pontistudios-postgres:latest`

### 3. Alternative: Data Migration (if you have important data)
If you need to preserve existing data:

1. **Export data from PostgreSQL 15:**
   ```bash
   pg_dump -h your-old-host -U username -d database_name > backup.sql
   ```

2. **Create new PostgreSQL 15 service with pgvector**

3. **Import data:**
   ```bash
   psql -h new-host -U username -d database_name < backup.sql
   ```

### 4. Run Migrations
After the new PostgreSQL service is running:

```bash
cd packages/utils
pnpm exec drizzle-kit migrate
```

This will:
- Enable the pgvector extension
- Create the vector_documents table
- Apply all other migrations

### 5. Verify Setup
Test the vector functionality:
```bash
# Connect to your database
psql -h your-host -U username -d database_name

# Check if pgvector is installed
\dx vector

# Check if vector_documents table exists
\dt vector_documents
```

## Environment Variables
Make sure these are set in Railway:
```
DATABASE_URL=postgresql://username:password@host:port/database
POSTGRES_DB=your_db_name
POSTGRES_USER=your_username
POSTGRES_PASSWORD=your_password
```

## Files Changed
- [`docker/postgres.dockerfile`](../docker/postgres.dockerfile) - Updated base image to PostgreSQL 15
- Docker image will be rebuilt automatically via GitHub Actions

## Prevention
To avoid this in the future:
- Pin PostgreSQL versions in Docker images
- Use specific version tags instead of `latest`
- Test version compatibility before deploying
