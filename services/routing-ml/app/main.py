from typing import List, Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="SynapseRoute Routing ML", version="0.1.0")


class Stop(BaseModel):
    orderId: Optional[str] = None
    lat: float
    lng: float
    riskScore: float = Field(default=0.0, ge=0.0, le=1.0)


class OptimizePayload(BaseModel):
    driverId: str
    stops: List[Stop]


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "routing-ml"}


@app.post("/api/route/optimize")
def optimize(payload: OptimizePayload) -> dict:
    # Placeholder: deterministic sort by risk then latitude for predictable test output.
    ranked = sorted(payload.stops, key=lambda stop: (-stop.riskScore, stop.lat, stop.lng))
    return {
        "driverId": payload.driverId,
        "route": [stop.model_dump() for stop in ranked],
        "model": "routing-ml-placeholder-v0",
        "confidence": 0.82,
    }
