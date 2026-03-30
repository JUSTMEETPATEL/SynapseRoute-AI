# SynapseRoute AI

SynapseRoute AI is a predictive, adaptive last-mile delivery intelligence platform.

This repository now contains a full MVP scaffold with separate Docker workflows for local development and production-like execution.

## Service Layout

- `services/frontend`: Next.js 14 dashboard shell
- `services/backend`: Fastify + TypeScript API (MVP endpoints)
- `services/routing-ml`: FastAPI service for route optimization
- `services/failure-predictor`: FastAPI service for risk prediction
- `shared/contracts`: cross-service JSON schema contracts
- `ops/prometheus`: Prometheus scrape config
- `ops/grafana`: Grafana provisioning and starter dashboard

## Implemented API Surface (Backend)

- `POST /api/orders`
- `GET /api/orders`
- `POST /api/geocode`
- `POST /api/predict`
- `POST /api/route/optimize`
- `GET /api/simulate/tick`
- `POST /api/route/reroute`
- `GET /api/track`
- `GET /api/analytics/summary`
- `GET /api/health`

## Docker Workflows

### Development stack

```bash
docker compose -f docker-compose.dev.yml up --build
```

Exposed ports:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- Routing ML: `http://localhost:8000`
- Failure Predictor: `http://localhost:8001`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3002`

### Production-like stack

```bash
docker compose -f docker-compose.prod.yml up --build
```

This uses production Dockerfiles (no bind mounts, production process entrypoints).

## Environment Variables

Copy `.env.example` and adjust values as needed.

## Next Suggested Implementation Steps

1. Add a shared OpenAPI spec and generate types for frontend/backend.
2. Replace placeholder ML logic with model artifact loading (`joblib` + versioned models).
3. Add Redis pub/sub integration and real-time channel broadcasting from backend.
4. Add endpoint-level tests and container smoke tests in CI.
