# SynapseRoute Routing ML Microservice

This directory contains the advanced routing engine based on the AWS Amazon Routing Challenge Solution.

## Overview

This service provides ML-enhanced route optimization using:
- Markov-based driver behavior model
- Rollout algorithm for policy search
- OR-Tools TSP solver for intra-zone optimization
- Simulation-based route evaluation

## Structure

```
routing-ml-service/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry point
│   ├── models/              # ML model definitions
│   ├── services/            # Route optimization logic
│   │   ├── markov_model.py  # Driver behavior model
│   │   ├── rollout.py       # Rollout algorithm
│   │   ├── tsp_solver.py    # OR-Tools integration
│   │   └── evaluator.py     # Route simulation
│   └── api/                 # API routes
├── models/                  # Trained model files
├── tests/                   # Unit tests
├── requirements.txt         # Python dependencies
├── Dockerfile              # Production Docker image
└── Dockerfile.dev          # Development Docker image
```

## Local Development

```bash
# Install dependencies (includes OR-Tools)
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --port 8002
```

## API Endpoints

- `POST /api/route/optimize` - Optimize route with ML
- `POST /api/route/evaluate` - Evaluate route quality
- `GET /health` - Health check endpoint
- `GET /metrics` - Prometheus metrics

## Based On

This service extracts and adapts the core inference logic from the [AWS Amazon Routing Challenge Solution](https://github.com/aws-samples/amazon-sagemaker-amazon-routing-challenge-sol).
