"""
Pydantic schemas for the Routing ML API.
"""

from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


# ─── Request Models ───


class StopInput(BaseModel):
    """A delivery stop with coordinates and zone assignment."""
    order_id: str
    lat: float
    lng: float
    zone_id: str = "default"
    risk_score: float = Field(default=0.0, ge=0.0, le=1.0)


class DepotInput(BaseModel):
    """Depot (starting) location."""
    lat: float
    lng: float


class OptimizeRequest(BaseModel):
    """Request to optimize routes for a batch of orders across drivers."""
    stops: List[StopInput] = Field(..., min_length=1)
    depot: DepotInput
    driver_ids: List[str] = Field(..., min_length=1)
    cluster_weights: List[float] = Field(default=[0.25, 0.25, 0.25, 0.25])


class TrainRequest(BaseModel):
    """Request to train the PPM model from zone sequences."""
    zone_sequences: List[List[str]] = Field(..., min_length=1)
    nb_orders: int = Field(default=5, ge=1, le=10)


# ─── Response Models ───


class OptimizedStop(BaseModel):
    """A stop in the optimized route sequence."""
    order_id: str
    sequence: int
    lat: float
    lng: float
    zone_id: str
    risk_score: float
    eta: str  # ISO datetime string


class OptimizedRoute(BaseModel):
    """An optimized route for a single driver."""
    driver_id: str
    stops: List[OptimizedStop]
    total_distance_km: float
    total_duration_min: int
    confidence_score: float = Field(ge=0.0, le=1.0)


class OptimizeResponse(BaseModel):
    """Response from route optimization."""
    routes: List[OptimizedRoute]
    model_used: str
    computation_time_ms: float


class TrainResponse(BaseModel):
    """Response from model training."""
    status: str
    sequences_trained: int
    vocab_size: int
    training_duration_ms: float
    model_file: str


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    model_loaded: bool
    model_vocab_size: Optional[int] = None
    model_nb_order: Optional[int] = None
    last_trained: Optional[str] = None
