# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SynapseRoute AI is a predictive, adaptive last-mile delivery intelligence platform. It combines route optimization (Dijkstra/A*), ML-based delivery failure prediction (XGBoost), real-time re-routing, and a unified operations dashboard. The full product requirements are in `docs/PRD.md`.

**Status:** Planning phase — no application code has been written yet.

## Planned Tech Stack

- **Frontend:** Next.js 14 + Tailwind CSS, Leaflet.js for maps
- **Backend:** Phoenix (Elixir)
- **Route Engine:** Custom Dijkstra/A* (Elixir)
- **ML:** Python sidecar service (scikit-learn / XGBoost, serialized with joblib), called from Phoenix over HTTP
- **Routing ML Microservice:** Python (FastAPI) — core inference logic extracted from the [AWS Amazon Routing Challenge Solution](https://github.com/aws-samples/amazon-sagemaker-amazon-routing-challenge-sol) (Markov-based driver behavior model, rollout algorithm for sequence generation, OR-Tools TSP solver for intra-zone optimization), wrapped as an API service. The original repo is an offline research pipeline — we extract only the inference/route-generation logic and serve it behind `POST /api/route/optimize`.
- **Real-Time:** Phoenix Channels + Phoenix PubSub
- **Geocoding:** OpenStreetMap Nominatim
- **State (MVP):** ETS / Agent (in-memory Elixir); PostgreSQL + Ecto planned for v2
- **Observability:** OpenTelemetry + Prometheus + Grafana; Phoenix LiveDashboard for dev
- **Deployment:** Vercel (frontend) + Fly.io / Railway (backend)

## Architecture

Six-layer design (Input → Processing → Intelligence → Decision → Execution → Feedback). The frontend communicates with the Phoenix backend via REST and Phoenix Channels (WebSocket). ML inference runs in a Python sidecar service; Phoenix calls it over HTTP. A dedicated Routing ML Microservice (Python/FastAPI) wraps the core route-generation logic from the [AWS Amazon Routing Challenge Solution](https://github.com/aws-samples/amazon-sagemaker-amazon-routing-challenge-sol) — a hybrid ML + optimization pipeline combining a Markov-based driver behavior model, rollout policy search, and OR-Tools TSP solver. The original repo is an offline research pipeline (not API-ready, not real-time); we extract only the inference logic (`inference_job.py` / route generation), strip SageMaker-specific code, and serve it as a FastAPI microservice. Real-time re-routing remains in the lightweight Elixir A* engine. Observability is built on `:telemetry`, OpenTelemetry, and Phoenix LiveDashboard.

### Core Modules

1. **Order Ingestion** — create/manage delivery orders
2. **Address Intelligence** — geocoding, normalization, zone tagging
3. **Simulation Engine** — driver position simulation with tick-based advancement
4. **Failure Predictor** — XGBoost classifier (features: hour, day, location type, zone failure rate, distance, weather, is_evening, is_weekend; target AUC-ROC ≥ 0.75)
5. **Route Optimization** — Dijkstra/A* with risk-weighted edges
5.1. **Advanced Routing Engine** — Core route-generation logic extracted from the [AWS Amazon Routing Challenge Solution](https://github.com/aws-samples/amazon-sagemaker-amazon-routing-challenge-sol). Hybrid ML + optimization: Markov model (driver behavior), rollout algorithm (policy search for sequence generation), OR-Tools TSP solver (intra-zone stop ordering). Wrapped as a FastAPI microservice; the original repo is an offline research pipeline — we use only the inference path, not training/SageMaker infrastructure.
6. **Re-optimization Engine** — real-time re-routing during execution
7. **Notification System** — alerts for high-risk deliveries
8. **Analytics Engine** — dashboard summary stats

### Risk Tiers

- **LOW** (green): failure probability < 0.30
- **MEDIUM** (yellow): 0.30–0.65
- **HIGH** (red): ≥ 0.65

## API Surface

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/orders` | Create delivery order |
| GET | `/api/orders` | List all orders |
| POST | `/api/geocode` | Geocode address |
| POST | `/api/predict` | Get failure probability |
| POST | `/api/route/optimize` | Run route optimization |
| GET | `/api/simulate/tick` | Advance driver simulation |
| POST | `/api/route/reroute` | Trigger re-optimization |
| GET | `/api/track` | Get driver positions |
| GET | `/api/analytics/summary` | Dashboard summary stats |
