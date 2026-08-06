"""FastAPI surface for the engine.

Endpoints match the architecture in CLAUDE.md. /generate-plan emits a valid
CreateTrainingRequest for a member (step 1); /estimate returns a real fitness
estimate computed from the member's export history (step 3, Aug 6).
/update-plan remains a placeholder.

    uvicorn app.main:app --reload
    GET http://localhost:8000/estimate/535
    GET http://localhost:8000/generate-plan/82

CORS is locked to the web app's origin: set WEB_ORIGIN to override the
localhost default. The engine and DB stay local; this is not a public API.
"""

from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .contract import CreateTrainingRequest
from .estimate import estimate_for_member
from .generate import generate_for_member

app = FastAPI(title="Adaptive Training Engine", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("WEB_ORIGIN", "http://localhost:3000")],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


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
    """Fitness estimate from real export history, with rationale."""
    return estimate_for_member(user_id).to_dict()


@app.post("/update-plan")
def update_plan() -> dict:
    # step 4: fold ExerciseLogs + HR zones back in and adapt.
    raise HTTPException(status_code=501, detail="adaptation not implemented yet")
