"""Smart College Timetable Generator - Domain Models and API Schemas."""

from typing import List, Optional, Literal
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Base model with camelCase serialization and population by field name or alias."""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
    )


class CollegeConfig(CamelModel):
    college_name: str = Field(..., min_length=1, description="College name")
    working_days: List[int] = Field(..., min_length=1, description="Days of week: 1=Monday...7=Sunday")
    periods_per_day: int = Field(..., ge=1, le=15, description="Number of instruction periods per day")
    day_start_time: str = Field(..., pattern=r"^([01]\d|2[0-3]):[0-5]\d$", description="Day start time in HH:MM format")
    period_duration_minutes: int = Field(..., ge=15, le=120, description="Duration of each period in minutes")


class BreakSlot(CamelModel):
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    period_after: int = Field(..., ge=1, description="Period after which the break takes place")
    duration_minutes: int = Field(..., ge=5, le=120)
    applies_to_days: List[int] = Field(default_factory=list, description="Days this break applies to. Empty = all working days")


class Department(CamelModel):
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    code: str = Field(..., min_length=1)


class Section(CamelModel):
    id: str = Field(..., min_length=1)
    department_id: str = Field(..., min_length=1)
    year: int = Field(..., ge=1)
    semester: int = Field(..., ge=1)
    name: str = Field(..., min_length=1)
    student_count: Optional[int] = Field(None, ge=0)


class Subject(CamelModel):
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    code: str = Field(..., min_length=1)
    department_id: str = Field(..., min_length=1)
    type: Literal["theory", "practical"]
    weekly_periods: int = Field(..., ge=1)
    consecutive_periods: int = Field(..., ge=1)
    preferred_room_type: Optional[Literal["classroom", "lab"]] = None
    required_lab_type: Optional[str] = None


class UnavailableSlot(CamelModel):
    day: int = Field(..., ge=1, le=7)
    period: int = Field(..., ge=1)


class Faculty(CamelModel):
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    short_name: str = Field(..., min_length=1)
    department_id: str = Field(..., min_length=1)
    qualified_subject_ids: List[str] = Field(default_factory=list)
    unavailable_slots: List[UnavailableSlot] = Field(default_factory=list)
    max_periods_per_day: Optional[int] = Field(None, ge=1)
    max_periods_per_week: Optional[int] = Field(None, ge=1)


class Room(CamelModel):
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    type: Literal["classroom", "lab"]
    capacity: Optional[int] = Field(None, ge=1)
    lab_type: Optional[str] = None
    supported_subject_ids: Optional[List[str]] = None


class SectionSubjectAssignment(CamelModel):
    id: str = Field(..., min_length=1)
    section_id: str = Field(..., min_length=1)
    subject_id: str = Field(..., min_length=1)
    faculty_ids: List[str] = Field(..., min_length=1)
    preferred_room_id: Optional[str] = None


class SolverWeights(CamelModel):
    spread_subjects_across_week: int = Field(10, ge=0)
    max_consecutive_theory: int = Field(2, ge=1)
    consecutive_theory_penalty: int = Field(5, ge=0)
    minimize_faculty_gaps: int = Field(8, ge=0)
    balance_faculty_workload: int = Field(4, ge=0)
    distribute_practicals: int = Field(10, ge=0)
    diverse_first_periods: int = Field(2, ge=0)


class GenerateRequest(CamelModel):
    college_config: CollegeConfig
    break_slots: List[BreakSlot] = Field(default_factory=list)
    departments: List[Department] = Field(..., min_length=1)
    sections: List[Section] = Field(..., min_length=1)
    subjects: List[Subject] = Field(..., min_length=1)
    faculty: List[Faculty] = Field(..., min_length=1)
    rooms: List[Room] = Field(..., min_length=1)
    assignments: List[SectionSubjectAssignment] = Field(..., min_length=1)
    weights: Optional[SolverWeights] = None
    time_limit_seconds: int = Field(60, ge=5, le=300)


class TimetableSlot(CamelModel):
    id: str = Field(..., min_length=1)
    section_id: str = Field(..., min_length=1)
    day: int = Field(..., ge=1, le=7)
    period: int = Field(..., ge=1)
    subject_id: str = Field(..., min_length=1)
    faculty_id: str = Field(..., min_length=1)
    room_id: str = Field(..., min_length=1)
    batch_id: Optional[str] = None


class ValidationErrorDetail(CamelModel):
    code: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    entity_type: Literal["section", "faculty", "subject", "room", "assignment", "config"]
    entity_id: Optional[str] = None


SolverStatus = Literal["OPTIMAL", "FEASIBLE", "INFEASIBLE", "UNKNOWN", "PRE_CHECK_FAILED"]


class GenerateResponse(CamelModel):
    status: SolverStatus
    execution_time_ms: float = Field(..., ge=0.0)
    objective_value: Optional[float] = None
    timetable: List[TimetableSlot] = Field(default_factory=list)
    errors: List[ValidationErrorDetail] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
