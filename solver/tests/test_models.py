"""Tests for Pydantic domain models and JSON schema compliance."""

import json
from pathlib import Path
import pytest
from pydantic import ValidationError

from app.models import (
    GenerateRequest,
    GenerateResponse,
    CollegeConfig,
    Department,
    Section,
    Subject,
    Faculty,
    Room,
    SectionSubjectAssignment,
    TimetableSlot,
)

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_college_config_validation():
    # Valid config
    cfg = CollegeConfig(
        college_name="Engineering College",
        working_days=[1, 2, 3, 4, 5],
        periods_per_day=7,
        day_start_time="09:00",
        period_duration_minutes=50,
    )
    assert cfg.college_name == "Engineering College"
    assert cfg.periods_per_day == 7

    # CamelCase dump
    dumped = cfg.model_dump(by_alias=True)
    assert "collegeName" in dumped
    assert "periodsPerDay" in dumped
    assert dumped["periodsPerDay"] == 7

    # Invalid day start time format
    with pytest.raises(ValidationError):
        CollegeConfig(
            college_name="College",
            working_days=[1],
            periods_per_day=5,
            day_start_time="25:99",
            period_duration_minutes=50,
        )

    # Invalid negative periods
    with pytest.raises(ValidationError):
        CollegeConfig(
            college_name="College",
            working_days=[1],
            periods_per_day=0,
            day_start_time="09:00",
            period_duration_minutes=50,
        )


def test_extra_fields_forbidden():
    with pytest.raises(ValidationError):
        Department.model_validate({"id": "d1", "name": "Dept", "code": "D", "unknownField": 123})


def test_valid_minimal_config_fixture_deserialization():
    fixture_path = FIXTURES_DIR / "valid_minimal_config.json"
    with open(fixture_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    req = GenerateRequest.model_validate(data)
    assert req.college_config.college_name == "St. Jude Engineering College"
    assert len(req.sections) == 1
    assert len(req.subjects) == 3
    assert len(req.faculty) == 2
    assert len(req.rooms) == 2
    assert len(req.assignments) == 3


def test_valid_medium_config_fixture_deserialization():
    fixture_path = FIXTURES_DIR / "valid_medium_config.json"
    with open(fixture_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    req = GenerateRequest.model_validate(data)
    assert len(req.departments) == 4
    assert len(req.sections) == 12
    assert len(req.rooms) == 10
    assert len(req.assignments) == 25


def test_timetable_slot_and_response_serialization():
    slot = TimetableSlot(
        id="slot-1",
        section_id="sec-1",
        day=1,
        period=1,
        subject_id="sub-1",
        faculty_id="fac-1",
        room_id="room-1",
    )
    dumped = slot.model_dump(by_alias=True)
    assert dumped["sectionId"] == "sec-1"
    assert dumped["facultyId"] == "fac-1"
    assert dumped["roomId"] == "room-1"

    resp = GenerateResponse(
        status="OPTIMAL",
        execution_time_ms=124.5,
        objective_value=15.0,
        timetable=[slot],
        errors=[],
        warnings=[],
    )
    resp_dumped = resp.model_dump(by_alias=True)
    assert resp_dumped["status"] == "OPTIMAL"
    assert resp_dumped["executionTimeMs"] == 124.5
    assert len(resp_dumped["timetable"]) == 1
