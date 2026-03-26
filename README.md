# SynapseRoute AI

[![Status](https://img.shields.io/badge/status-planning-yellow)](https://github.com/JUSTMEETPATEL/SynapseRoute-AI)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://www.docker.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**Predictive, adaptive last-mile delivery intelligence platform**

SynapseRoute AI combines route optimization (Dijkstra/A*), ML-based delivery failure prediction (XGBoost), and real-time re-routing into a unified operations dashboard — purpose-built for modern logistics at scale.

## 📖 Documentation

- [Product Requirements Document (PRD)](docs/PRD.md) - Comprehensive product specification
- [CLAUDE.md](CLAUDE.md) - Development guidelines for Claude Code

## 🏗️ Architecture

SynapseRoute AI is built as a microservices architecture with the following components:

- **Frontend**: Next.js 14 + Tailwind CSS + Leaflet.js
- **Backend**: Phoenix (Elixir) with Phoenix Channels for real-time updates
- **ML Service**: Python FastAPI service for failure prediction (XGBoost)
- **Routing ML Service**: Python FastAPI service for advanced route optimization (based on AWS Amazon Routing Challenge Solution)
- **Database**: PostgreSQL with PostGIS extension
- **Cache & Pub/Sub**: Redis
- **Observability**: Prometheus + Grafana + OpenTelemetry

## 🚀 Quick Start

### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 8GB+ RAM recommended
- 20GB+ disk space

### Development Environment

1. **Clone the repository**
   ```bash
   git clone https://github.com/JUSTMEETPATEL/SynapseRoute-AI.git
   cd SynapseRoute-AI
   ```

2. **Initialize the project**
   ```bash
   ./infrastructure/scripts/init.sh
   ```
   This will:
   - Check Docker installation
   - Create `.env` file from template
   - Create necessary directories
   - Pull base Docker images
   - Set up Prometheus and Grafana configs

3. **Configure environment variables**
   ```bash
   # Edit .env file with your settings
   nano .env
   ```
   The default values are suitable for development.

4. **Start the development environment**
   ```bash
   ./infrastructure/scripts/dev-start.sh
   ```
   This will start all services in Docker containers.

5. **Access the services**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000
   - ML Service: http://localhost:8001
   - Routing ML Service: http://localhost:8002
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379
   - Prometheus: http://localhost:9090
   - Grafana: http://localhost:3001 (admin/admin)

6. **View logs**
   ```bash
   docker-compose -f docker-compose.dev.yml logs -f
   ```

7. **Stop the environment**
   ```bash
   ./infrastructure/scripts/dev-stop.sh
   ```

### Production Deployment

1. **Copy production environment template**
   ```bash
   cp .env.production.example .env.production
   ```

2. **Configure production environment**
   ```bash
   nano .env.production
   ```
   Update all values, especially:
   - Database passwords
   - Secret keys
   - API URLs
   - Grafana credentials

3. **Start production environment**
   ```bash
   ./infrastructure/scripts/prod-start.sh
   ```

## 📁 Project Structure

```
SynapseRoute-AI/
├── frontend/                    # Next.js frontend application
│   ├── Dockerfile              # Production Dockerfile
│   └── Dockerfile.dev          # Development Dockerfile
├── backend/                     # Phoenix (Elixir) backend
│   ├── Dockerfile              # Production Dockerfile
│   └── Dockerfile.dev          # Development Dockerfile
├── ml-service/                  # ML inference service (XGBoost)
│   ├── app/                    # FastAPI application
│   ├── models/                 # Trained models
│   ├── requirements.txt        # Python dependencies
│   ├── Dockerfile              # Production Dockerfile
│   └── Dockerfile.dev          # Development Dockerfile
├── routing-ml-service/          # Advanced routing engine
│   ├── app/                    # FastAPI application
│   ├── models/                 # Trained models
│   ├── requirements.txt        # Python dependencies
│   ├── Dockerfile              # Production Dockerfile
│   └── Dockerfile.dev          # Development Dockerfile
├── infrastructure/
│   ├── docker/                 # Docker configuration files
│   │   ├── postgres/          # PostgreSQL init scripts
│   │   ├── prometheus/        # Prometheus configs
│   │   ├── grafana/           # Grafana provisioning
│   │   └── nginx/             # NGINX configs (production)
│   └── scripts/               # Utility scripts
│       ├── init.sh            # Project initialization
│       ├── dev-start.sh       # Start dev environment
│       ├── dev-stop.sh        # Stop dev environment
│       └── prod-start.sh      # Start prod environment
├── docs/
│   └── PRD.md                 # Product Requirements Document
├── docker-compose.dev.yml      # Development compose file
├── docker-compose.prod.yml     # Production compose file
├── .env.example               # Development env template
├── .env.production.example    # Production env template
├── .gitignore                 # Git ignore rules
├── CLAUDE.md                  # Claude Code guidelines
└── README.md                  # This file
```

## 🛠️ Development

### Local Development (without Docker)

Each service can be run locally for development:

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Backend (requires Elixir 1.16+)
```bash
cd backend
mix deps.get
mix phx.server
```

#### ML Services (requires Python 3.11+)
```bash
# ML Service
cd ml-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001

# Routing ML Service
cd routing-ml-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8002
```

## 🧪 Testing

```bash
# Frontend tests
cd frontend && npm test

# Backend tests
cd backend && mix test

# ML Service tests
cd ml-service && pytest

# Routing ML Service tests
cd routing-ml-service && pytest
```

## 📊 Monitoring

The platform includes comprehensive observability:

- **Prometheus**: Metrics collection at http://localhost:9090
- **Grafana**: Dashboards and visualization at http://localhost:3001
- **Structured Logging**: JSON logs with correlation IDs
- **Health Checks**: All services expose `/health` endpoints

## 🔒 Security

- All production services run as non-root users
- Secrets managed via environment variables
- HTTPS/TLS support via NGINX reverse proxy
- Database credentials rotation supported
- Resource limits enforced via Docker

## 🌍 Environment Variables

### Required for Production

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_PASSWORD` | PostgreSQL password | Strong password |
| `SECRET_KEY_BASE` | Phoenix secret key | Generate with `mix phx.gen.secret` |
| `NEXT_PUBLIC_API_URL` | Backend API URL | https://api.your-domain.com |
| `GRAFANA_PASSWORD` | Grafana admin password | Strong password |

See `.env.production.example` for complete list.

## 📦 Docker Images

### Development Images
- Built with hot-reload enabled
- Source code mounted as volumes
- Includes dev dependencies

### Production Images
- Multi-stage builds for minimal size
- No dev dependencies
- Optimized for performance
- Health checks included

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## 📝 Status

**Current Phase**: Planning & Infrastructure Setup

The application code is not yet implemented. This repository contains:
- ✅ Complete Docker infrastructure (dev & prod)
- ✅ Service architecture and specifications
- ✅ Comprehensive PRD
- ⏳ Application code (coming soon)

## 📄 License

MIT License - see LICENSE file for details

## 👥 Authors

- Meet Patel - [@JUSTMEETPATEL](https://github.com/JUSTMEETPATEL)

## 🔗 Resources

- [AWS Amazon Routing Challenge Solution](https://github.com/aws-samples/amazon-sagemaker-amazon-routing-challenge-sol) - ML routing inspiration
- [Phoenix Framework](https://www.phoenixframework.org/)
- [Next.js](https://nextjs.org/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [OR-Tools](https://developers.google.com/optimization)

---

**Note**: This project is in active development. Star the repository to follow updates!
