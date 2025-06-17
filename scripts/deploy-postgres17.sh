#!/bin/bash
# Deploy PostgreSQL 17 to Railway

set -e

echo "🚀 Deploying PostgreSQL 17 to Railway..."
echo "======================================"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Check if logged in to Railway
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please run 'railway login' first."
    exit 1
fi

echo "📦 Step 1: Building and pushing Docker image..."

# Build the Docker image
docker build -f docker/postgres.dockerfile -t ghcr.io/charlesponti/hominem/postgres:17 .

# Push to GitHub Container Registry
echo "🔐 Please ensure you're logged in to GHCR:"
echo "echo \$GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin"
docker push ghcr.io/charlesponti/hominem/postgres:17

echo "🛠️ Step 2: Creating Railway service..."

# Create new service for PostgreSQL 17
railway service create postgres-17

echo "🔧 Step 3: Setting environment variables..."

# Set environment variables
railway variables set POSTGRES_DB=hominem
railway variables set POSTGRES_USER=postgres

# Generate a secure password if not provided
if [ -z "$POSTGRES_PASSWORD" ]; then
    POSTGRES_PASSWORD=$(openssl rand -base64 32)
    echo "🔑 Generated password: $POSTGRES_PASSWORD"
fi

railway variables set POSTGRES_PASSWORD="$POSTGRES_PASSWORD"
railway variables set PGDATA="/var/lib/postgresql/data"

echo "🚀 Step 4: Deploying service..."

# Deploy using our custom Docker image
railway deploy --service postgres-17

echo "⏳ Step 5: Waiting for deployment to complete..."

# Wait for deployment
sleep 30

echo "🔍 Step 6: Getting connection details..."

# Get the connection URL
echo "📋 Getting connection information..."
railway info --service postgres-17

echo "✅ PostgreSQL 17 deployment completed!"
echo ""
echo "📋 Next steps:"
echo "1. Note down the connection URL from Railway dashboard"
echo "2. Test the connection with: railway connect --service postgres-17"
echo "3. Run the migration script to transfer data from PostgreSQL 15"
echo "4. Update your application environment variables"
echo ""
echo "🔗 Connection details available in Railway dashboard:"
echo "https://railway.app/dashboard"
