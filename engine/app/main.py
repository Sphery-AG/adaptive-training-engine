"""FastAPI surface for the engine.

Endpoints match the architecture in CLAUDE.md.

- GET  /estimate/{user_id}      real fitness estimate from export history.
- POST /generate-plan           the primary endpoint: full 8-week plan.
- POST /update-plan             folds a completed session back in (adapt.py).
- GET  /generate-plan/{user_id} kiosk CreateTrainingRequest. Still the step-1
                                path: it copies a reference Darmstadt circle
                                and places the member in it rather than
                                exporting their generated plan. Shape correct,
                                content not theirs. See docs/limitations.md.

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

from .adapt import UpdatePlanRequest, apply_update
from .contract import CreateTrainingRequest
from .estimate import estimate_for_member
from .generate import generate_for_member
from .plangen import GeneratePlanRequest, generate_plan as generate_plan_full
from .series import series_for_member

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


@app.post("/generate-plan")
def generate_plan_post(req: GeneratePlanRequest) -> dict:
    """Full plan generation: estimate (real or cold start) + rules -> 8-week
    plan resolved onto the gym sent in the request. The web app's primary
    endpoint when running against the local engine."""
    return generate_plan_full(req)


@app.get("/estimate/{user_id}")
def estimate(user_id: int) -> dict:
    """Fitness estimate from real export history, with rationale."""
    return estimate_for_member(user_id).to_dict()


@app.get("/progress-series/{user_id}")
def progress_series(user_id: int, range: str = "month") -> dict:
    """Training history over time, for the progress chart.

    range=session (last 24 workouts), day (30 days), week (12 weeks) or month
    (12 months) — the zoom levels of a stock chart. Periods with no training
    come back with sessions=0 and null metrics, so the chart can draw the gap
    instead of a line through it.
    """
    try:
        return series_for_member(user_id, range)  # type: ignore[arg-type]
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/update-plan")
def update_plan(req: UpdatePlanRequest) -> dict:
    """Fold a completed session back into the plan and explain what changed."""
    return apply_update(req)
