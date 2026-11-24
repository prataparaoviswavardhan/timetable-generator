"""Comprehensive tests for the independent timetable verifier."""

import json
from pathlib import Path
from typing import List
import pytest

from solver.app.models import GenerateRequest, TimetableSlot, UnavailableSlot
from solver.app.verify import verify_timetable

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def load_config(rel_path: str) -> GenerateRequest:
    with open(FIXTURES_DIR / rel_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return GenerateRequest.model_validate(data)


def load_timetable(rel_path: str) -> List[TimetableSlot]:
    with open(FIXTURES_DIR / rel_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return [TimetableSlot.model_validate(s) for s in data]


def test_valid_minimal_timetable_passes_independent_verification():
    cfg = load_config("valid_minimal_config.json")
    timetable = load_timetable("valid_minimal_timetable.json")
    errors = verify_timetable(cfg, timetable)
    assert len(errors) == 0, f"Expected valid timetable to pass verification, got: {errors}"


def test_verify_section_double_booked():
    cfg = load_config("valid_minimal_config.json")
    timetable = load_timetable("invalid_timetables/section_double_booked.json")
    errors = verify_timetable(cfg, timetable)
    codes = [e.code for e in errors]
    assert "SECTION_DOUBLE_BOOKED" in codes
    assert any("simultaneous classes on day 1, period 1" in e.message for e in errors)


def test_verify_faculty_double_booked():
    cfg = load_config("valid_minimal_config.json")
    timetable = load_timetable("invalid_timetables/faculty_double_booked.json")
    errors = verify_timetable(cfg, timetable)
    codes = [e.code for e in errors]
    assert "FACULTY_DOUBLE_BOOKED" in codes
    assert any("is double-booked across 2 sections on day 1, period 1" in e.message for e in errors)


def test_verify_room_double_booked():
    cfg = load_config("valid_minimal_config.json")
    timetable = load_timetable("invalid_timetables/room_double_booked.json")
    errors = verify_timetable(cfg, timetable)
    codes = [e.code for e in errors]
    assert "ROOM_DOUBLE_BOOKED" in codes
    assert any("is double-booked across 2 classes on day 1, period 1" in e.message for e in errors)


def test_verify_practical_crosses_break():
    cfg = load_config("valid_minimal_config.json")
    # Break is after period 3. Scheduled practical at periods 3 and 4
    timetable = load_timetable("invalid_timetables/practical_crosses_break.json")
    errors = verify_timetable(cfg, timetable)
    codes = [e.code for e in errors]
    assert "PRACTICAL_CROSSES_BREAK" in codes
    assert any("crosses break after period 3" in e.message for e in errors)


def test_verify_practical_not_contiguous():
    cfg = load_config("valid_minimal_config.json")
    timetable = load_timetable("valid_minimal_timetable.json")
    # Change slot 10 from period 2 to period 4 on day 5 (leaving gap: periods 1 and 4)
    timetable[-1].period = 4
    errors = verify_timetable(cfg, timetable)
    codes = [e.code for e in errors]
    assert "PRACTICAL_NOT_CONTIGUOUS" in codes
    assert any("non-consecutive periods [1, 4]" in e.message for e in errors)


def test_verify_faculty_unavailable_slot():
    cfg = load_config("valid_minimal_config.json")
    # Mark Day 1, Period 1 as unavailable for fac-at
    cfg.faculty[0].unavailable_slots = [UnavailableSlot(day=1, period=1)]
    timetable = load_timetable("valid_minimal_timetable.json")
    errors = verify_timetable(cfg, timetable)
    codes = [e.code for e in errors]
    assert "FACULTY_UNAVAILABLE_SLOT_VIOLATED" in codes
    assert any("which is in their unavailable slots" in e.message for e in errors)


def test_verify_period_count_mismatch():
    cfg = load_config("valid_minimal_config.json")
    timetable = load_timetable("invalid_timetables/period_count_mismatch.json")
    errors = verify_timetable(cfg, timetable)
    codes = [e.code for e in errors]
    assert "PERIOD_COUNT_MISMATCH" in codes
    assert any("exactly 4 are required" in e.message for e in errors)


def test_verify_unqualified_faculty_in_slot():
    cfg = load_config("valid_minimal_config.json")
    timetable = load_timetable("valid_minimal_timetable.json")
    # Slot 1 is sub-ds. Swap faculty from fac-at to fac-al (who is not qualified for sub-ds)
    timetable[0].faculty_id = "fac-al"
    errors = verify_timetable(cfg, timetable)
    codes = [e.code for e in errors]
    assert "UNQUALIFIED_FACULTY_IN_SLOT" in codes


def test_verify_practical_in_non_lab_room():
    cfg = load_config("valid_minimal_config.json")
    timetable = load_timetable("valid_minimal_timetable.json")
    # Slot 9 & 10 are algo-lab. Set room to classroom room-101
    timetable[8].room_id = "room-101"
    timetable[9].room_id = "room-101"
    errors = verify_timetable(cfg, timetable)
    codes = [e.code for e in errors]
    assert "PRACTICAL_IN_NON_LAB" in codes


def test_verify_faculty_daily_cap_exceeded():
    cfg = load_config("valid_minimal_config.json")
    # Set maxPeriodsPerDay = 1 for fac-at. On day 5, fac-at has 2 lab periods.
    cfg.faculty[0].max_periods_per_day = 1
    timetable = load_timetable("valid_minimal_timetable.json")
    errors = verify_timetable(cfg, timetable)
    codes = [e.code for e in errors]
    assert "FACULTY_EXCEEDS_DAILY_CAP" in codes
    assert any("exceeding daily cap of 1" in e.message for e in errors)


def test_verify_outside_working_days():
    cfg = load_config("valid_minimal_config.json")
    timetable = load_timetable("valid_minimal_timetable.json")
    # Set day to 7 (Sunday)
    timetable[0].day = 7
    errors = verify_timetable(cfg, timetable)
    codes = [e.code for e in errors]
    assert "SLOT_OUTSIDE_WORKING_DAYS" in codes
