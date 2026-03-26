#!/bin/bash
# Start development environment

set -e

echo "🚀 Starting SynapseRoute AI Development Environment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Run ./infrastructure/scripts/init.sh first."
    exit 1
fi

# Start services
echo "🐳 Starting Docker containers..."
docker-compose -f docker-compose.dev.yml up -d

echo ""
echo "✅ Development environment started!"
echo ""
echo "Services:"
echo "  Frontend:              http://localhost:3000"
echo "  Backend API:           http://localhost:4000"
echo "  ML Service:            http://localhost:8001"
echo "  Routing ML Service:    http://localhost:8002"
echo "  PostgreSQL:            localhost:5432"
echo "  Redis:                 localhost:6379"
echo "  Prometheus:            http://localhost:9090"
echo "  Grafana:               http://localhost:3001"
echo ""
echo "View logs: docker-compose -f docker-compose.dev.yml logs -f"
echo "Stop: docker-compose -f docker-compose.dev.yml down"
echo ""
