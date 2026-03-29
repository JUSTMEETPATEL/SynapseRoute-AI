from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="SynapseRoute Failure Predictor", version="0.1.0")


class PredictPayload(BaseModel):
    orderId: str | None = None
    features: dict


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "failure-predictor"}


@app.post("/predict")
def predict(payload: PredictPayload) -> dict:
    hour = int(payload.features.get("hour", 12))
    zone_failure_rate = float(payload.features.get("zone_failure_rate", 0.15))
    weather = str(payload.features.get("weather", "clear")).lower()

    risk = min(0.95, 0.1 + (0.02 * max(hour - 18, 0)) + zone_failure_rate)
    if weather in {"rain", "storm"}:
        risk = min(0.98, risk + 0.12)

    tier = "LOW"
    if risk >= 0.65:
        tier = "HIGH"
    elif risk >= 0.30:
        tier = "MEDIUM"

    return {
        "orderId": payload.orderId,
        "probability": round(risk, 4),
        "tier": tier,
        "modelVersion": "xgb-placeholder-v0",
    }
