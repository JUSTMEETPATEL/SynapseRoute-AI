#!/bin/bash
# Initialization script for SynapseRoute AI development environment

set -e

echo "🚀 Initializing SynapseRoute AI Development Environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env file created. Please update it with your configuration."
else
    echo "✅ .env file already exists."
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p infrastructure/docker/{postgres/init-scripts,prometheus,grafana/provisioning,nginx}

# Create placeholder Prometheus config
echo "📊 Creating Prometheus configuration..."
cat > infrastructure/docker/prometheus/prometheus.dev.yml <<EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'backend'
    static_configs:
      - targets: ['backend:4000']

  - job_name: 'ml-service'
    static_configs:
      - targets: ['ml-service:8001']

  - job_name: 'routing-ml-service'
    static_configs:
      - targets: ['routing-ml-service:8002']
EOF

echo "✅ Prometheus configuration created."

# Create Grafana provisioning
echo "📈 Creating Grafana provisioning..."
mkdir -p infrastructure/docker/grafana/provisioning/{datasources,dashboards}

cat > infrastructure/docker/grafana/provisioning/datasources/prometheus.yml <<EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF

echo "✅ Grafana provisioning created."

# Pull base images
echo "🐳 Pulling base Docker images..."
docker pull postgres:16-alpine
docker pull redis:7-alpine
docker pull node:20-alpine
docker pull python:3.11-slim
docker pull prom/prometheus:latest
docker pull grafana/grafana:latest

echo ""
echo "✨ Initialization complete!"
echo ""
echo "Next steps:"
echo "  1. Review and update .env file with your configuration"
echo "  2. Start development environment: ./scripts/dev-start.sh"
echo "  3. View logs: docker-compose -f docker-compose.dev.yml logs -f"
echo ""
