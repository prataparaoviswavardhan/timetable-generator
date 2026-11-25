"""FastAPI service for Timetable Generator."""

from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.models import (
    GenerateRequest,
    GenerateResponse,
    ValidationErrorDetail,
)
from app.solve import solve_timetable
from app.validate import validate_config

app = FastAPI(
    title="Smart College Timetable Generator API",
    description="Stateless scheduling service powered by Google OR-Tools CP-SAT",
    version="1.0.0",
)

# CORS configuration. Add your deployed frontend URL here once it exists.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    """Health status endpoint."""
    return {
        "status": "healthy",
        "service": "timetable-solver",
        "engine": "Google OR-Tools CP-SAT",
        "version": "1.0.0",
    }


@app.post("/validate", response_model=List[ValidationErrorDetail])
def validate_endpoint(request: GenerateRequest) -> List[ValidationErrorDetail]:
    """Execute pre-solve feasibility checks without running the CP-SAT solver."""
    return validate_config(request)


@app.post("/generate", response_model=GenerateResponse)
def generate_endpoint(request: GenerateRequest) -> GenerateResponse:
    """End-to-end timetable generation endpoint."""
    try:
        return solve_timetable(request)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected solver error occurred: {str(exc)}",
 )