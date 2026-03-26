# SynapseRoute ML Service

This directory contains the ML inference service for delivery failure prediction using XGBoost.

## Structure

```
ml-service/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry point
│   ├── models/              # ML model definitions
│   ├── services/            # Business logic
│   └── api/                 # API routes
├── models/                  # Trained model files (.pkl)
├── tests/                   # Unit tests
├── requirements.txt         # Python dependencies
├── Dockerfile              # Production Docker image
└── Dockerfile.dev          # Development Docker image
```

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --port 8001
```

## API Endpoints

- `POST /predict` - Predict delivery failure probability
- `GET /health` - Health check endpoint
- `GET /metrics` - Prometheus metrics
