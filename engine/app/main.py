"""FastAPI surface for the engine.

Endpoints match the architecture in CLAUDE.md. Only /generate-plan is real
today, and only its step-1 behavior (emit a valid CreateTrainingRequest for a
member). /estimate and /update-plan are placeholders so the shape is visible.

    uvicorn app.main:app --reload
    GET http://localhost:8000/generate-plan/82
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException

from .contract import CreateTrainingRequest
from .generate import generate_for_member

app = FastAPI(title="Adaptive Training Engine", version="0.1.0")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/generate-plan/{user_id}", response_model=CreateTrainingRequest)
def generate_plan(user_id: int) -> CreateTrainingRequest:
    """Return a kiosk-ready circle for a member from the static DB."""
    try:
        return generate_for_member(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/estimate/{user_id}")
def estimate(user_id: int) -> dict:
    # step 3: fitness estimate from history.
    raise HTTPException(status_code=501, detail="fitness estimate not implemented yet")


@app.post("/update-plan")
def update_plan() -> dict:
    # step 4: fold ExerciseLogs + HR zones back in and adapt.
    raise HTTPException(status_code=501, detail="adaptation not implemented yet")
