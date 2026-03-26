#!/bin/bash
# Stop development environment

set -e

echo "🛑 Stopping SynapseRoute AI Development Environment..."

docker-compose -f docker-compose.dev.yml down

echo "✅ Development environment stopped."
echo ""
echo "To remove volumes (data will be lost): docker-compose -f docker-compose.dev.yml down -v"
echo ""
