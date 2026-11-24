"""End-to-end integration tests for the CP-SAT scheduler and FastAPI endpoints."""

import json
from pathlib import Path
from fastapi.testclient import TestClient
import pytest

from solver.app.main import app
from solver.app.models import GenerateRequest, UnavailableSlot
from solver.app.solve import solve_timetable
from solver.app.verify import verify_timetable

FIXTURES_DIR = Path(__file__).parent / "fixtures"
client = TestClient(app)


def load_fixture(rel_path: str) -> GenerateRequest:
    with open(FIXTURES_DIR / rel_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return GenerateRequest.model_validate(data)


def test_api_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["engine"] == "Google OR-Tools CP-SAT"


def test_api_validate_endpoint():
    req = load_fixture("valid_minimal_config.json")
    response = client.post("/validate", json=req.model_dump(by_alias=True))
    assert response.status_code == 200
    assert response.json() == []


def test_solve_minimal_fixture():
    req = load_fixture("valid_minimal_config.json")
    response = solve_timetable(req)

    assert response.status in ("OPTIMAL", "FEASIBLE")
    assert response.execution_time_ms > 0
    assert len(response.timetable) == 10  # 4 DS + 4 OS + 2 Lab = 10 periods

    # Run independent verifier directly on the output
    verify_errors = verify_timetable(req, response.timetable)
    assert len(verify_errors) == 0, f"Independent verifier failed: {verify_errors}"


def test_solve_medium_fixture_multi_section():
    """Tests realistic 12-section college schedule with shared faculty and labs."""
    req = load_fixture("valid_medium_config.json")
    response = solve_timetable(req)

    assert response.status in ("OPTIMAL", "FEASIBLE")
    assert len(response.timetable) > 0

    # Ensure independent verifier passes on the generated timetable
    verify_errors = verify_timetable(req, response.timetable)
    assert len(verify_errors) == 0, f"Verification failed on medium schedule: {verify_errors}"


def test_solve_pre_check_failure():
    req = load_fixture("invalid_configs/faculty_overloaded.json")
    response = solve_timetable(req)

    assert response.status == "PRE_CHECK_FAILED"
    assert len(response.errors) > 0
    assert any(e.code == "FACULTY_EXCEEDS_WEEKLY_MAX" for e in response.errors)
    assert len(response.timetable) == 0


def test_solve_impossible_constraints_returns_infeasible():
    """A single room with 2 slots, but total required periods across two sections is 3 (2 + 1).
    Passes individual pre-solve checks, but solver proves room contention is infeasible."""
    req = load_fixture("valid_minimal_config.json")
    req.college_config.working_days = [1]
    req.college_config.periods_per_day = 2
    req.break_slots = []
    req.rooms = [req.rooms[0]]  # Only room-101 (classroom)
    
    # Sec 1 needs 2 periods, Sec 2 needs 1 period (both assigned to room-101)
    req.subjects = [
        req.subjects[0].model_copy(update={"weekly_periods": 2, "consecutive_periods": 1}),
        req.subjects[1].model_copy(update={"weekly_periods": 1, "consecutive_periods": 1}),
    ]
    req.sections = [
        req.sections[0],
        req.sections[0].model_copy(update={"id": "sec-cse-3b", "name": "CSE-3B"}),
    ]
    req.faculty[0].qualified_subject_ids = [req.subjects[0].id]
    req.faculty[1].qualified_subject_ids = [req.subjects[1].id]
    req.assignments = [
        req.assignments[0].model_copy(update={"id": "a-1", "section_id": "sec-cse-3a", "subject_id": req.subjects[0].id, "faculty_ids": ["fac-at"], "preferred_room_id": "room-101"}),
        req.assignments[1].model_copy(update={"id": "a-2", "section_id": "sec-cse-3b", "subject_id": req.subjects[1].id, "faculty_ids": ["fac-al"], "preferred_room_id": "room-101"}),
    ]

    response = solve_timetable(req)
    assert response.status == "INFEASIBLE"
    assert len(response.errors) > 0
    assert response.errors[0].code == "SOLVER_INFEASIBLE"


def test_api_generate_endpoint_e2e():
    req = load_fixture("valid_minimal_config.json")
    response = client.post("/generate", json=req.model_dump(by_alias=True))
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("OPTIMAL", "FEASIBLE")
    assert len(data["timetable"]) == 10
