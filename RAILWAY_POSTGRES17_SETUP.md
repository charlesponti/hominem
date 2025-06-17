# Railway PostgreSQL 17 Deployment Guide

## Option 1: Using GitHub Container Registry (Recommended)

### Prerequisites
1. Docker installed locally
2. Railway CLI installed: `npm install -g @railway/cli`
3. Logged in to Railway: `railway login`
4. GitHub Container Registry access

### Steps

1. **Trigger Docker Image Build**
   ```bash
   # The GitHub Action will automatically build when you push changes
   git add docker/postgres.dockerfile
   git commit -m "Update PostgreSQL to version 17"
   git push
   ```

2. **Deploy to Railway using pre-built image**
   ```bash
   # Create new service
   railway service create postgres-17
   
   # Set environment variables
   railway variables set POSTGRES_DB=hominem
   railway variables set POSTGRES_USER=postgres
   railway variables set POSTGRES_PASSWORD="your-secure-password"
   railway variables set PGDATA=/var/lib/postgresql/data
   
   # Deploy using our published image
   railway deploy --service postgres-17 --image ghcr.io/charlesponti/hominem/pontistudios-postgres:latest
   ```

## Option 2: Direct Docker Deployment

If you prefer to build and deploy directly:

```bash
# Run the deployment script
./scripts/deploy-postgres17.sh
```

## Option 3: Railway GUI Deployment

1. **Go to Railway Dashboard**: https://railway.app/dashboard
2. **Create New Service**: Click "New Service" → "Docker Image"
3. **Use Image**: `ghcr.io/charlesponti/hominem/pontistudios-postgres:latest`
4. **Set Environment Variables**:
   - `POSTGRES_DB=hominem`
   - `POSTGRES_USER=postgres`
   - `POSTGRES_PASSWORD=your-secure-password`
   - `PGDATA=/var/lib/postgresql/data`
5. **Add Volume**: Mount `/var/lib/postgresql/data` for persistence
6. **Deploy**: Click deploy

## Post-Deployment Steps

1. **Get Connection URL**:
   ```bash
   railway info --service postgres-17
   ```

2. **Test Connection**:
   ```bash
   railway connect --service postgres-17
   ```

3. **Verify pgvector Extension**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   SELECT * FROM pg_extension WHERE extname = 'vector';
   ```

## Migration Ready

Once PostgreSQL 17 is deployed and running:

1. **Export from old database**:
   ```bash
   export OLD_DATABASE_URL="postgresql://user:pass@old-host:5432/db"
   export NEW_DATABASE_URL="postgresql://user:pass@new-host:5432/db"
   ```

2. **Run migration**:
   ```bash
   ./scripts/railway-migrate.sh
   ```

## Troubleshooting

- **Image not found**: Wait for GitHub Action to complete building the image
- **Connection refused**: Check if the service is fully deployed and healthy
- **Extension errors**: Verify the pgvector extension is properly installed in the image
