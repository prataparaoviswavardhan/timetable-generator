"""Comprehensive tests for pre-solve validation rules and feasibility checks."""

import json
from pathlib import Path
import pytest

from app.models import GenerateRequest, BreakSlot
from app.validate import validate_config

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def load_fixture(rel_path: str) -> GenerateRequest:
    with open(FIXTURES_DIR / rel_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return GenerateRequest.model_validate(data)


def test_valid_minimal_config_passes_validation():
    req = load_fixture("valid_minimal_config.json")
    errors = validate_config(req)
    assert len(errors) == 0, f"Expected 0 errors, got: {errors}"


def test_valid_medium_config_passes_validation():
    req = load_fixture("valid_medium_config.json")
    errors = validate_config(req)
    assert len(errors) == 0, f"Expected 0 errors, got: {errors}"


def test_invalid_duplicate_ids():
    req = load_fixture("invalid_configs/duplicate_ids.json")
    errors = validate_config(req)
    codes = [e.code for e in errors]
    assert "DUPLICATE_SECTION_ID" in codes
    assert any("Duplicate section ID detected: 'sec-dup'" in e.message for e in errors)


def test_invalid_faculty_overloaded():
    req = load_fixture("invalid_configs/faculty_overloaded.json")
    errors = validate_config(req)
    codes = [e.code for e in errors]
    assert "FACULTY_EXCEEDS_WEEKLY_MAX" in codes
    msg = next(e.message for e in errors if e.code == "FACULTY_EXCEEDS_WEEKLY_MAX")
    assert "exceeding the weekly maximum of 8" in msg


def test_invalid_section_overloaded():
    req = load_fixture("invalid_configs/section_overloaded.json")
    errors = validate_config(req)
    codes = [e.code for e in errors]
    assert "SECTION_OVERLOADED" in codes
    msg = next(e.message for e in errors if e.code == "SECTION_OVERLOADED")
    assert "Section '1A' requires 32 periods per week, which exceeds total available slots (30)" in msg


def test_invalid_practical_blocked_by_breaks():
    req = load_fixture("invalid_configs/practical_blocked_by_breaks.json")
    errors = validate_config(req)
    codes = [e.code for e in errors]
    assert "PRACTICAL_BLOCKED_BY_BREAKS" in codes
    msg = next(e.message for e in errors if e.code == "PRACTICAL_BLOCKED_BY_BREAKS")
    assert "largest block is 2" in msg


def test_invalid_unqualified_faculty():
    req = load_fixture("invalid_configs/unqualified_faculty.json")
    errors = validate_config(req)
    codes = [e.code for e in errors]
    assert "UNQUALIFIED_FACULTY" in codes
    msg = next(e.message for e in errors if e.code == "UNQUALIFIED_FACULTY")
    assert "Faculty 'Dr. Historian' is assigned to teach 'Quantum Computing' for section '1A' but is not qualified for it." in msg


def test_invalid_no_compatible_lab():
    req = load_fixture("invalid_configs/no_compatible_lab.json")
    errors = validate_config(req)
    codes = [e.code for e in errors]
    assert "NO_COMPATIBLE_LAB" in codes
    msg = next(e.message for e in errors if e.code == "NO_COMPATIBLE_LAB")
    assert "requires a compatible lab (type: 'robotics-bay')" in msg


def test_reference_integrity_missing_department():
    req = load_fixture("valid_minimal_config.json")
    req.sections[0].department_id = "non-existent-dept"
    errors = validate_config(req)
    codes = [e.code for e in errors]
    assert "INVALID_DEPARTMENT_REF" in codes


def test_practical_non_multiple_periods():
    req = load_fixture("valid_minimal_config.json")
    # sub-algo-lab has consecutivePeriods=2, set weeklyPeriods=3 (not divisible)
    req.subjects[2].weekly_periods = 3
    errors = validate_config(req)
    codes = [e.code for e in errors]
    assert "PRACTICAL_PERIODS_NOT_MULTIPLE" in codes


def test_practical_consecutive_less_than_two():
    req = load_fixture("valid_minimal_config.json")
    req.subjects[2].consecutive_periods = 1
    errors = validate_config(req)
    codes = [e.code for e in errors]
    assert "PRACTICAL_INVALID_CONSECUTIVE" in codes


def test_break_after_exceeds_periods():
    req = load_fixture("valid_minimal_config.json")
    req.break_slots.append(
        BreakSlot(
            id="bad-break",
            name="Late Break",
            period_after=6,  # periods_per_day is 6, so period_after cannot be >= 6
            duration_minutes=15,
            applies_to_days=[1],
        )
    )
    errors = validate_config(req)
    codes = [e.code for e in errors]
    assert "INVALID_BREAK_PERIOD" in codes


def test_duplicate_section_subject_assignment():
    req = load_fixture("valid_minimal_config.json")
    # Duplicate assign-1
    req.assignments.append(req.assignments[0].model_copy(update={"id": "assign-dup"}))
    errors = validate_config(req)
    codes = [e.code for e in errors]
    assert "DUPLICATE_ASSIGNMENT" in codes
