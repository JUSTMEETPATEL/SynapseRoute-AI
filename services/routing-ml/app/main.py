"""
SynapseRoute Routing ML Microservice.

Integrates the AWS Amazon Routing Challenge solution:
  - PPM (Prediction by Partial Matching) Markov model
  - Rollout policy search for zone sequencing
  - OR-Tools TSP solver for intra-zone stop ordering
  - Haversine distance matrices from live coordinates

Endpoints:
  POST /api/route/optimize  — Optimize delivery routes
  POST /api/model/train     — Train PPM model from zone sequences
  GET  /health              — Health check with model status
"""

import json
import logging
import os
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import numpy as np
from fastapi import FastAPI, HTTPException

from app.schemas import (
    OptimizeRequest,
    OptimizeResponse,
    OptimizedRoute,
    OptimizedStop,
    TrainRequest,
    TrainResponse,
    HealthResponse,
)
from app.ml.ppm import PPM, build_ppm_model
from app.ml.zone_utils import zone_based_tsp
from app.ml.ortools_helper import run_ortools
from app.ml.distance import build_distance_matrix, total_route_distance_km, estimate_travel_time_min

# ─── Config ───

MODEL_DIR = Path(os.getenv("MODEL_DIR", "models"))
MODEL_FILE = MODEL_DIR / "ppm_model.json"
LOG_LEVEL = os.getenv("LOG_LEVEL", "info").upper()

logging.basicConfig(level=LOG_LEVEL)
logger = logging.getLogger("routing-ml")

# ─── App State ───

app = FastAPI(
    title="SynapseRoute Routing ML",
    version="1.0.0",
    description="ML-powered route optimization using PPM + OR-Tools",
)

# Global model state
_ppm_model: Optional[PPM] = None
_last_trained: Optional[str] = None


def load_model():
    """Load the PPM model from disk if available."""
    global _ppm_model, _last_trained
    if MODEL_FILE.exists():
        try:
            with open(MODEL_FILE, "r") as f:
                data = json.load(f)
            _ppm_model = PPM.from_dict(data)
            _last_trained = data.get("trained_at", None)
            logger.info(f"PPM model loaded: order={_ppm_model.nb_order}, vocab={_ppm_model.vocab_size}")
        except Exception as e:
            logger.error(f"Failed to load PPM model: {e}")
            _ppm_model = None
    else:
        logger.warning(f"No PPM model found at {MODEL_FILE}. Running in fallback (TSP-only) mode.")


@app.on_event("startup")
async def startup():
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    load_model()


# ─── Health ───


@app.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(
        status="ok",
        service="routing-ml",
        model_loaded=_ppm_model is not None,
        model_vocab_size=_ppm_model.vocab_size if _ppm_model else None,
        model_nb_order=_ppm_model.nb_order if _ppm_model else None,
        last_trained=_last_trained,
    )


# ─── Route Optimization ───


@app.post("/api/route/optimize", response_model=OptimizeResponse)
def optimize(req: OptimizeRequest):
    """
    Optimize delivery routes.

    Pipeline:
      1. Build haversine distance matrix from stop coordinates
      2. Build zone list from stop zone_ids
      3. If PPM model → zone_based_tsp (ML-guided)
      4. Else → plain TSP via OR-Tools (fallback)
      5. Split stops across drivers by round-robin zone clusters
      6. Compute ETAs, distances, confidence scores
    """
    t_start = time.time()
    n_stops = len(req.stops)
    n_drivers = len(req.driver_ids)

    if n_stops == 0:
        raise HTTPException(400, "No stops provided")

    # ── Step 1: Build coordinate list (depot at index 0) ──
    coords = [(req.depot.lat, req.depot.lng)]
    zone_list = ["stz"]  # depot zone
    stop_data = []

    for s in req.stops:
        coords.append((s.lat, s.lng))
        zone_list.append(s.zone_id)
        stop_data.append(s)

    # ── Step 2: Build distance matrix ──
    dist_matrix = build_distance_matrix(coords)

    # ── Step 3: Optimize stop ordering ──
    model_used = "tsp-only"

    if _ppm_model is not None and n_stops >= 2:
        try:
            optimized_order = zone_based_tsp(
                dist_matrix,
                zone_list,
                _ppm_model,
                cluster_weights=req.cluster_weights,
            )
            model_used = "ppm-rollout-tsp"
            logger.info(f"PPM-guided optimization for {n_stops} stops")
        except Exception as e:
            logger.warning(f"PPM optimization failed, falling back to TSP: {e}")
            optimized_order = _fallback_tsp(dist_matrix, n_stops)
            model_used = "tsp-fallback"
    elif n_stops >= 2:
        optimized_order = _fallback_tsp(dist_matrix, n_stops)
    else:
        optimized_order = np.array([0, 1], dtype=np.int32)

    # ── Step 4: Remove depot from tour, map back to stops ──
    stop_indices = [idx for idx in optimized_order if idx > 0]  # exclude depot (0)

    # Fill in any stops not in the tour (edge case)
    all_stop_indices = set(range(1, n_stops + 1))
    missing = all_stop_indices - set(stop_indices)
    stop_indices.extend(sorted(missing))

    # ── Step 5: Split across drivers ──
    routes = _split_and_build_routes(
        stop_indices, stop_data, coords, req.driver_ids, model_used
    )

    computation_ms = (time.time() - t_start) * 1000
    logger.info(f"Optimization complete: {n_stops} stops, {n_drivers} drivers, {computation_ms:.1f}ms")

    return OptimizeResponse(
        routes=routes,
        model_used=model_used,
        computation_time_ms=round(computation_ms, 1),
    )


def _fallback_tsp(dist_matrix: np.ndarray, n_stops: int) -> np.ndarray:
    """Plain OR-Tools TSP without PPM guidance."""
    try:
        return np.array(run_ortools(dist_matrix), dtype=np.int32)
    except RuntimeError:
        # Absolute fallback: sequential order
        return np.arange(n_stops + 1, dtype=np.int32)


def _split_and_build_routes(
    stop_indices: list,
    stop_data: list,
    coords: list,
    driver_ids: list,
    model_used: str,
) -> list:
    """Split optimized stops across drivers and build route responses."""
    n_drivers = len(driver_ids)
    n_stops = len(stop_indices)

    # Round-robin split preserving optimized order
    chunks = [[] for _ in range(n_drivers)]
    for i, idx in enumerate(stop_indices):
        chunks[i % n_drivers].append(idx)

    routes = []
    now = datetime.now(timezone.utc)

    for driver_idx, driver_id in enumerate(driver_ids):
        chunk = chunks[driver_idx]
        if not chunk:
            continue

        # Build route with ETAs
        optimized_stops = []
        cumulative_time_min = 0.0
        prev_coord = coords[0]  # start from depot

        for seq, global_idx in enumerate(chunk):
            stop = stop_data[global_idx - 1]  # -1 because index 0 is depot
            cur_coord = coords[global_idx]

            # Estimate travel time
            from app.ml.distance import haversine
            dist_m = haversine(prev_coord[0], prev_coord[1], cur_coord[0], cur_coord[1])
            travel_min = estimate_travel_time_min(dist_m)
            cumulative_time_min += travel_min + 3.0  # +3 min service time per stop

            eta = now + timedelta(minutes=cumulative_time_min)

            optimized_stops.append(OptimizedStop(
                order_id=stop.order_id,
                sequence=seq,
                lat=stop.lat,
                lng=stop.lng,
                zone_id=stop.zone_id,
                risk_score=stop.risk_score,
                eta=eta.isoformat(),
            ))
            prev_coord = cur_coord

        # Compute route distance
        route_coords = [coords[0]] + [coords[i] for i in chunk]
        route_order = list(range(len(route_coords)))
        distance_km = total_route_distance_km(route_coords, route_order)

        # Confidence based on model type + stop count
        base_confidence = 0.92 if "ppm" in model_used else 0.75
        confidence = min(1.0, base_confidence + (len(chunk) / 200))

        routes.append(OptimizedRoute(
            driver_id=driver_id,
            stops=optimized_stops,
            total_distance_km=round(distance_km, 2),
            total_duration_min=int(cumulative_time_min),
            confidence_score=round(confidence, 3),
        ))

    return routes


# ─── Model Training ───


@app.post("/api/model/train", response_model=TrainResponse)
def train_model(req: TrainRequest):
    """
    Train the PPM model from historical zone delivery sequences.
    Persists the model to disk for subsequent inference calls.
    """
    global _ppm_model, _last_trained

    t_start = time.time()

    try:
        model = build_ppm_model(
            req.zone_sequences,
            nb_orders=req.nb_orders,
            consider_hierarchy=True,
        )
    except Exception as e:
        raise HTTPException(500, f"Training failed: {e}")

    # Save to disk
    trained_at = datetime.now(timezone.utc).isoformat()
    model_data = model.to_dict()
    model_data["trained_at"] = trained_at

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    with open(MODEL_FILE, "w") as f:
        json.dump(model_data, f)

    _ppm_model = model
    _last_trained = trained_at

    duration_ms = (time.time() - t_start) * 1000
    logger.info(f"PPM model trained: {len(req.zone_sequences)} sequences, {duration_ms:.1f}ms")

    return TrainResponse(
        status="trained",
        sequences_trained=len(req.zone_sequences),
        vocab_size=model.vocab_size,
        training_duration_ms=round(duration_ms, 1),
        model_file=str(MODEL_FILE),
    )
