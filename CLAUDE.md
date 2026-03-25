# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SynapseRoute AI is a predictive, adaptive last-mile delivery intelligence platform. It combines route optimization (Dijkstra/A*), ML-based delivery failure prediction (XGBoost), real-time re-routing, and a unified operations dashboard. The full product requirements are in `docs/PRD.md`.

**Status:** Planning phase — no application code has been written yet.

## Planned Tech Stack

- **Frontend:** Next.js 14 + Tailwind CSS, Leaflet.js for maps
- **Backend:** FastAPI (Python 3.11)
- **Route Engine:** Custom Dijkstra/A* (pure Python)
- **ML:** scikit-learn / XGBoost, serialized with joblib
- **Real-Time:** Redis pub/sub (or in-memory mock for MVP)
- **Geocoding:** OpenStreetMap Nominatim
- **State (MVP):** In-memory Python dicts; PostgreSQL + SQLAlchemy planned for v2
- **Deployment:** Vercel (frontend) + Railway/Render (backend)

## Architecture

Six-layer design (Input → Processing → Intelligence → Decision → Execution → Feedback). The frontend communicates with the FastAPI backend via REST and WebSocket. The XGBoost model (`.pkl`) is loaded at FastAPI startup.

### Core Modules

1. **Order Ingestion** — create/manage delivery orders
2. **Address Intelligence** — geocoding, normalization, zone tagging
3. **Simulation Engine** — driver position simulation with tick-based advancement
4. **Failure Predictor** — XGBoost classifier (features: hour, day, location type, zone failure rate, distance, weather, is_evening, is_weekend; target AUC-ROC ≥ 0.75)
5. **Route Optimization** — Dijkstra/A* with risk-weighted edges
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
