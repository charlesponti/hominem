# PostgreSQL with pgvector Setup for Railway

This guide explains how to deploy a custom PostgreSQL instance with pgvector support on Railway.

## Current Setup

The project includes:

1. **Custom PostgreSQL Docker Image**: `docker/postgres.dockerfile`
   - Based on `postgres:latest`
   - Includes pgvector extension v0.7.4
   - Includes PostGIS and other extensions
   - Published to: `ghcr.io/charlesponti/hominem/pontistudios-postgres:latest`

2. **Extension Initialization**: `docker/init-extensions.sql`
   - Automatically enables pgvector and other extensions
   - Runs when database starts

3. **GitHub Actions Workflow**: `.github/workflows/docker-publish-postgres.yml`
   - Automatically builds and publishes Docker image on changes
   - Triggers on changes to postgres.dockerfile or init-extensions.sql

## Railway Deployment Options

### Option 1: Use Published Docker Image (Recommended)

1. **Create new Railway service from Docker image**:
   ```bash
   railway service create postgres-hominem
   railway service connect postgres-hominem
   ```

2. **Deploy using published image**:
   ```bash
   # Set the service to use our custom image
   railway variables set RAILWAY_DOCKERFILE_PATH=docker/postgres.dockerfile
   railway up --config config/postgres-railway.json
   ```

3. **Set required environment variables**:
   ```bash
   railway variables set POSTGRES_DB=hominem
   railway variables set POSTGRES_USER=postgres  
   railway variables set POSTGRES_PASSWORD=<your-secure-password>
   railway variables set PGDATA=/var/lib/postgresql/data/pgdata
   ```

4. **Get connection details**:
   ```bash
   railway variables
   # Look for DATABASE_URL or connection details
   ```

### Option 2: Manual Railway Setup

1. **Go to Railway Dashboard**
2. **Create New Project** → **Deploy from GitHub repo**
3. **Select this repository**
4. **Create Service** → **Settings** → **Source**
5. **Set Dockerfile path**: `docker/postgres.dockerfile`
6. **Add Environment Variables**:
   - `POSTGRES_DB=hominem`
   - `POSTGRES_USER=postgres`
   - `POSTGRES_PASSWORD=<secure-password>`
   - `PGDATA=/var/lib/postgresql/data/pgdata`

### Option 3: Use Railway's Managed PostgreSQL + pgvector

Railway's managed PostgreSQL may support pgvector. Check if it's available:

1. **Create Managed PostgreSQL service**
2. **Connect to database**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. **If successful**, you can use the managed service
4. **If not**, use Option 1 or 2

## Updating Your Application

Once PostgreSQL with pgvector is deployed:

1. **Update DATABASE_URL** in your application's Railway environment variables
2. **Run migrations**:
   ```bash
   pnpm run migrate
   ```
3. **Test vector functionality**:
   ```bash
   # Test the vector search API
   curl "https://your-app.railway.app/api/vector-search?query=test"
   ```

## Database Migrations

The project includes migrations for vector documents:

1. **Enable pgvector extension** (custom migration)
2. **Create vector_documents table** (generated from schema)

To run migrations:
```bash
# From packages/utils directory
pnpm exec drizzle-kit migrate
```

## Troubleshooting

### "extension vector does not exist"
- Ensure the custom PostgreSQL image is being used
- Check that init-extensions.sql is being executed
- Verify pgvector was built correctly in the Docker image

### "vector type does not exist"
- Run the pgvector extension migration first
- Ensure migrations run in correct order

### Performance Issues
- Monitor vector search performance
- Consider adjusting HNSW index parameters
- Use appropriate similarity thresholds

## Monitoring

Railway provides monitoring for:
- Database connections
- Query performance
- Storage usage
- Memory consumption

Monitor these metrics when using vector search extensively.

## Security

- Use strong passwords for POSTGRES_PASSWORD
- Enable SSL connections in production
- Restrict database access to application services only
- Regularly update the PostgreSQL base image

## Cost Considerations

Custom PostgreSQL deployment on Railway:
- Compute costs based on CPU/memory usage
- Storage costs for vector embeddings (~6KB per document)
- Network costs for data transfer

Consider managed PostgreSQL if vector functionality becomes available.
