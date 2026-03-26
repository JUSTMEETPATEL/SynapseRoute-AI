#!/bin/bash
# Build and start production environment

set -e

echo "🏭 Starting SynapseRoute AI Production Environment..."

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ .env.production file not found."
    echo "   Copy .env.production.example to .env.production and configure it."
    exit 1
fi

# Load production environment
export $(cat .env.production | grep -v '^#' | xargs)

# Build images
echo "🔨 Building production images..."
docker-compose -f docker-compose.prod.yml build

# Start services
echo "🚀 Starting production containers..."
docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "✅ Production environment started!"
echo ""
echo "Services are running. Check with: docker-compose -f docker-compose.prod.yml ps"
echo "View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo ""
