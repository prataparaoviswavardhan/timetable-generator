"""Solver execution, status mapping, and independent verification orchestration."""

import time
import uuid
from typing import List
from ortools.sat.python import cp_model

from solver.app.models import (
    GenerateRequest,
    GenerateResponse,
    TimetableSlot,
    ValidationErrorDetail,
    SolverWeights,
)
from solver.app.validate import validate_config
from solver.app.build_model import build_model
from solver.app.objective import apply_objective
from solver.app.verify import verify_timetable


def solve_timetable(request: GenerateRequest) -> GenerateResponse:
    """End-to-end timetable generation workflow:
    1. Pre-solve validation
    2. CP-SAT mathematical model construction
    3. Soft objective weighting
    4. Solver execution with time limit and multi-core search
    5. Independent output verification
    6. Structured response mapping
    """
    start_time = time.perf_counter()

    # Step 1: Pre-solve feasibility checks
    pre_errors = validate_config(request)
    if pre_errors:
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        return GenerateResponse(
            status="PRE_CHECK_FAILED",
            execution_time_ms=round(elapsed_ms, 2),
            timetable=[],
            errors=pre_errors,
            warnings=["Pre-solve feasibility validation failed. Please address the errors above."],
        )

    # Step 2: Build mathematical model
    data = build_model(request)

    # Step 3: Apply soft objectives
    weights = request.weights if request.weights else SolverWeights()
    apply_objective(data, weights)

    # Step 4: Configure and run CP-SAT solver
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = float(request.time_limit_seconds)
    solver.parameters.num_search_workers = 4
    solver.parameters.log_search_progress = False

    raw_status = solver.Solve(data.model)
    elapsed_ms = (time.perf_counter() - start_time) * 1000

    # Step 5: Map solver status
    if raw_status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        timetable = _extract_timetable(data, solver)
        objective_val = solver.ObjectiveValue() if raw_status == cp_model.OPTIMAL else None
        status_label = "OPTIMAL" if raw_status == cp_model.OPTIMAL else "FEASIBLE"

        # Step 6: INDEPENDENT VERIFICATION LAYER
        # Validates that the generated timetable strictly satisfies all 11 hard constraints
        verification_errors = verify_timetable(request, timetable)
        if verification_errors:
            # Independent verifier caught a discrepancy
            return GenerateResponse(
                status="INFEASIBLE",
                execution_time_ms=round(elapsed_ms, 2),
                timetable=[],
                errors=verification_errors,
                warnings=["The solver produced a timetable, but independent verification detected contract violations."],
            )

        return GenerateResponse(
            status=status_label,
            execution_time_ms=round(elapsed_ms, 2),
            objective_value=objective_val,
            timetable=timetable,
            errors=[],
            warnings=[],
        )

    elif raw_status == cp_model.INFEASIBLE:
        return GenerateResponse(
            status="INFEASIBLE",
            execution_time_ms=round(elapsed_ms, 2),
            timetable=[],
            errors=[
                ValidationErrorDetail(
                    code="SOLVER_INFEASIBLE",
                    message="The scheduling engine mathematically proved that no conflict-free timetable exists satisfying all constraints simultaneously. Try relaxing faculty unavailable slots, increasing available periods, or reducing weekly requirements.",
                    entity_type="config",
                )
            ],
            warnings=[
                "Tip: Check if multiple sections require the same faculty or specialized lab in overlapping slots."
            ],
        )

    else:  # UNKNOWN or MODEL_INVALID
        return GenerateResponse(
            status="UNKNOWN",
            execution_time_ms=round(elapsed_ms, 2),
            timetable=[],
            errors=[
                ValidationErrorDetail(
                    code="SOLVER_TIMEOUT",
                    message=f"The solver reached the time limit of {request.time_limit_seconds} seconds without discovering a complete feasible solution. You may increase the time limit or simplify constraints.",
                    entity_type="config",
                )
            ],
            warnings=[],
        )


def _extract_timetable(data, solver: cp_model.CpSolver) -> List[TimetableSlot]:
    slots: List[TimetableSlot] = []
    # Sort for deterministic output
    sorted_keys = sorted(data.x.keys(), key=lambda k: (k[4], k[5], k[0], k[1]))

    for key in sorted_keys:
        if solver.Value(data.x[key]) == 1:
            sec_id, sub_id, fac_id, room_id, day, period = key
            slots.append(
                TimetableSlot(
                    id=f"slot-{uuid.uuid4().hex[:8]}",
                    section_id=sec_id,
                    day=day,
                    period=period,
                    subject_id=sub_id,
                    faculty_id=fac_id,
                    room_id=room_id,
                )
            )

    return slots
