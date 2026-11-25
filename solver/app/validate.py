"""Pure domain validation functions for timetable configuration.

Checks:
- Duplicate IDs
- Reference integrity
- Qualification checks
- Section period limits vs available day slots
- Faculty availability and workload caps
- Practical consecutive period block feasibility with respect to breaks
- Lab and classroom availability and type compatibility
"""

from typing import List, Dict, Set, Tuple
from collections import defaultdict

from app.models import (
    GenerateRequest,
    ValidationErrorDetail,
    Section,
    Subject,
    Faculty,
    Room,
    SectionSubjectAssignment,
    BreakSlot,
)


def validate_config(request: GenerateRequest) -> List[ValidationErrorDetail]:
    """Execute all pre-solve feasibility checks and data integrity validations.
    
    Returns a list of ValidationErrorDetail objects. Empty list means the configuration
    passes all pre-solve checks.
    """
    errors: List[ValidationErrorDetail] = []

    # 1. Check duplicate IDs within entity collections
    _check_duplicate_ids("department", [d.id for d in request.departments], errors)
    _check_duplicate_ids("section", [s.id for s in request.sections], errors)
    _check_duplicate_ids("subject", [sub.id for sub in request.subjects], errors)
    _check_duplicate_ids("faculty", [f.id for f in request.faculty], errors)
    _check_duplicate_ids("room", [r.id for r in request.rooms], errors)
    _check_duplicate_ids("assignment", [a.id for a in request.assignments], errors)
    _check_duplicate_ids("break", [b.id for b in request.break_slots], errors)

    dept_map = {d.id: d for d in request.departments}
    sec_map = {s.id: s for s in request.sections}
    sub_map = {s.id: s for s in request.subjects}
    fac_map = {f.id: f for f in request.faculty}
    room_map = {r.id: r for r in request.rooms}

    # 2. Reference integrity
    for sec in request.sections:
        if sec.department_id not in dept_map:
            errors.append(ValidationErrorDetail(
                code="INVALID_DEPARTMENT_REF",
                message=f"Section '{sec.name}' references non-existent department ID '{sec.department_id}'.",
                entity_type="section",
                entity_id=sec.id
            ))

    for sub in request.subjects:
        if sub.department_id not in dept_map:
            errors.append(ValidationErrorDetail(
                code="INVALID_DEPARTMENT_REF",
                message=f"Subject '{sub.name}' ({sub.code}) references non-existent department ID '{sub.department_id}'.",
                entity_type="subject",
                entity_id=sub.id
            ))

    for fac in request.faculty:
        if fac.department_id not in dept_map:
            errors.append(ValidationErrorDetail(
                code="INVALID_DEPARTMENT_REF",
                message=f"Faculty '{fac.name}' references non-existent department ID '{fac.department_id}'.",
                entity_type="faculty",
                entity_id=fac.id
            ))
        for q_sub_id in fac.qualified_subject_ids:
            if q_sub_id not in sub_map:
                errors.append(ValidationErrorDetail(
                    code="INVALID_SUBJECT_REF",
                    message=f"Faculty '{fac.name}' references non-existent qualified subject ID '{q_sub_id}'.",
                    entity_type="faculty",
                    entity_id=fac.id
                ))

    for room in request.rooms:
        if room.supported_subject_ids:
            for s_id in room.supported_subject_ids:
                if s_id not in sub_map:
                    errors.append(ValidationErrorDetail(
                        code="INVALID_SUBJECT_REF",
                        message=f"Room '{room.name}' references non-existent supported subject ID '{s_id}'.",
                        entity_type="room",
                        entity_id=room.id
                    ))

    # 3. Assignment integrity & qualification checks
    seen_sec_sub_pairs: Set[Tuple[str, str]] = set()

    for assign in request.assignments:
        if assign.section_id not in sec_map:
            errors.append(ValidationErrorDetail(
                code="INVALID_SECTION_REF",
                message=f"Assignment '{assign.id}' references non-existent section ID '{assign.section_id}'.",
                entity_type="assignment",
                entity_id=assign.id
            ))
            continue

        if assign.subject_id not in sub_map:
            errors.append(ValidationErrorDetail(
                code="INVALID_SUBJECT_REF",
                message=f"Assignment '{assign.id}' references non-existent subject ID '{assign.subject_id}'.",
                entity_type="assignment",
                entity_id=assign.id
            ))
            continue

        sec = sec_map[assign.section_id]
        sub = sub_map[assign.subject_id]

        pair = (assign.section_id, assign.subject_id)
        if pair in seen_sec_sub_pairs:
            errors.append(ValidationErrorDetail(
                code="DUPLICATE_ASSIGNMENT",
                message=f"Duplicate assignment for section '{sec.name}' and subject '{sub.name}'.",
                entity_type="assignment",
                entity_id=assign.id
            ))
        seen_sec_sub_pairs.add(pair)

        # Faculty qualification check
        for fac_id in assign.faculty_ids:
            if fac_id not in fac_map:
                errors.append(ValidationErrorDetail(
                    code="INVALID_FACULTY_REF",
                    message=f"Assignment for section '{sec.name}' references non-existent faculty ID '{fac_id}'.",
                    entity_type="assignment",
                    entity_id=assign.id
                ))
            else:
                fac = fac_map[fac_id]
                if sub.id not in fac.qualified_subject_ids:
                    errors.append(ValidationErrorDetail(
                        code="UNQUALIFIED_FACULTY",
                        message=f"Faculty '{fac.name}' is assigned to teach '{sub.name}' for section '{sec.name}' but is not qualified for it.",
                        entity_type="faculty",
                        entity_id=fac.id
                    ))

        # Room preference check
        if assign.preferred_room_id:
            if assign.preferred_room_id not in room_map:
                errors.append(ValidationErrorDetail(
                    code="INVALID_ROOM_REF",
                    message=f"Assignment references non-existent preferred room ID '{assign.preferred_room_id}'.",
                    entity_type="assignment",
                    entity_id=assign.id
                ))
            else:
                room = room_map[assign.preferred_room_id]
                if sub.type == "practical" and room.type != "lab":
                    errors.append(ValidationErrorDetail(
                        code="ROOM_TYPE_MISMATCH",
                        message=f"Practical subject '{sub.name}' cannot use non-lab room '{room.name}'.",
                        entity_type="room",
                        entity_id=room.id
                    ))

    # 4. Working days & Break slot feasibility
    cfg = request.college_config
    working_days_set = set(cfg.working_days)
    total_slots_per_day = cfg.periods_per_day
    total_week_slots = len(cfg.working_days) * total_slots_per_day

    # Check break slots
    day_breaks: Dict[int, List[int]] = defaultdict(list)
    for b in request.break_slots:
        if b.period_after >= total_slots_per_day:
            errors.append(ValidationErrorDetail(
                code="INVALID_BREAK_PERIOD",
                message=f"Break '{b.name}' has periodAfter={b.period_after}, which is not less than total periods per day ({total_slots_per_day}).",
                entity_type="config",
                entity_id=b.id
            ))
        target_days = b.applies_to_days if b.applies_to_days else cfg.working_days
        for d in target_days:
            if d not in working_days_set:
                errors.append(ValidationErrorDetail(
                    code="BREAK_INVALID_DAY",
                    message=f"Break '{b.name}' applies to day {d}, which is not in working days {cfg.working_days}.",
                    entity_type="config",
                    entity_id=b.id
                ))
            else:
                day_breaks[d].append(b.period_after)

    # 5. Section load feasibility
    section_assigned_periods: Dict[str, int] = defaultdict(int)
    for assign in request.assignments:
        if assign.subject_id in sub_map and assign.section_id in sec_map:
            sub = sub_map[assign.subject_id]
            section_assigned_periods[assign.section_id] += sub.weekly_periods

    for sec_id, total_periods in section_assigned_periods.items():
        if total_periods > total_week_slots:
            sec = sec_map[sec_id]
            errors.append(ValidationErrorDetail(
                code="SECTION_OVERLOADED",
                message=f"Section '{sec.name}' requires {total_periods} periods per week, which exceeds total available slots ({total_week_slots}).",
                entity_type="section",
                entity_id=sec_id
            ))

    # 6. Faculty availability & workload caps
    faculty_assigned_periods: Dict[str, int] = defaultdict(int)
    for assign in request.assignments:
        if assign.subject_id in sub_map:
            sub = sub_map[assign.subject_id]
            for fac_id in assign.faculty_ids:
                faculty_assigned_periods[fac_id] += sub.weekly_periods

    for fac in request.faculty:
        assigned = faculty_assigned_periods[fac.id]
        
        # Check unavailable slots bounds
        unavailable_valid_count = 0
        seen_unavail = set()
        for unavail in fac.unavailable_slots:
            if unavail.day not in working_days_set or unavail.period < 1 or unavail.period > total_slots_per_day:
                errors.append(ValidationErrorDetail(
                    code="INVALID_UNAVAILABLE_SLOT",
                    message=f"Faculty '{fac.name}' has invalid unavailable slot (day={unavail.day}, period={unavail.period}).",
                    entity_type="faculty",
                    entity_id=fac.id
                ))
            else:
                slot_key = (unavail.day, unavail.period)
                if slot_key not in seen_unavail:
                    seen_unavail.add(slot_key)
                    unavailable_valid_count += 1

        available_slots = total_week_slots - unavailable_valid_count

        if assigned > available_slots:
            errors.append(ValidationErrorDetail(
                code="FACULTY_OVERLOADED_AVAILABILITY",
                message=f"Faculty '{fac.name}' is assigned {assigned} periods per week but only has {available_slots} available slots.",
                entity_type="faculty",
                entity_id=fac.id
            ))

        if fac.max_periods_per_week is not None and assigned > fac.max_periods_per_week:
            errors.append(ValidationErrorDetail(
                code="FACULTY_EXCEEDS_WEEKLY_MAX",
                message=f"Faculty '{fac.name}' is assigned {assigned} periods per week, exceeding the weekly maximum of {fac.max_periods_per_week}.",
                entity_type="faculty",
                entity_id=fac.id
            ))

        if fac.max_periods_per_day is not None:
            max_possible_weekly = fac.max_periods_per_day * len(cfg.working_days)
            if assigned > max_possible_weekly:
                errors.append(ValidationErrorDetail(
                    code="FACULTY_EXCEEDS_DAILY_CAP_PRODUCT",
                    message=f"Faculty '{fac.name}' is assigned {assigned} periods per week, which is impossible with a daily cap of {fac.max_periods_per_day} across {len(cfg.working_days)} working days.",
                    entity_type="faculty",
                    entity_id=fac.id
                ))

    # 7. Practical consecutive block feasibility with breaks
    # For each day, breaks divide the day into uninterrupted blocks of periods.
    # A practical block of length N must fit into at least one uninterrupted block.
    max_continuous_block_per_day: Dict[int, int] = {}
    for d in cfg.working_days:
        breaks = sorted(day_breaks[d])
        # Periods are 1..total_slots_per_day.
        # Breaks occur after specified periods.
        # e.g., breaks=[4] -> Block 1: 1..4 (len 4), Block 2: 5..7 (len 3)
        block_lengths = []
        start_p = 1
        for b_after in breaks:
            block_lengths.append(b_after - start_p + 1)
            start_p = b_after + 1
        block_lengths.append(total_slots_per_day - start_p + 1)
        max_continuous_block_per_day[d] = max(block_lengths) if block_lengths else total_slots_per_day

    max_continuous_block_overall = max(max_continuous_block_per_day.values()) if max_continuous_block_per_day else 0

    for sub in request.subjects:
        if sub.type == "practical":
            if sub.consecutive_periods < 2:
                errors.append(ValidationErrorDetail(
                    code="PRACTICAL_INVALID_CONSECUTIVE",
                    message=f"Practical subject '{sub.name}' must have consecutivePeriods >= 2 (got {sub.consecutive_periods}).",
                    entity_type="subject",
                    entity_id=sub.id
                ))
            elif sub.consecutive_periods > total_slots_per_day:
                errors.append(ValidationErrorDetail(
                    code="PRACTICAL_EXCEEDS_DAY_PERIODS",
                    message=f"Practical subject '{sub.name}' requires {sub.consecutive_periods} consecutive periods, which exceeds periods per day ({total_slots_per_day}).",
                    entity_type="subject",
                    entity_id=sub.id
                ))
            elif sub.consecutive_periods > max_continuous_block_overall:
                errors.append(ValidationErrorDetail(
                    code="PRACTICAL_BLOCKED_BY_BREAKS",
                    message=f"Practical subject '{sub.name}' requires {sub.consecutive_periods} consecutive periods, but no continuous block of this size exists on any working day due to breaks (largest block is {max_continuous_block_overall}).",
                    entity_type="subject",
                    entity_id=sub.id
                ))

            if sub.weekly_periods % sub.consecutive_periods != 0:
                errors.append(ValidationErrorDetail(
                    code="PRACTICAL_PERIODS_NOT_MULTIPLE",
                    message=f"Practical subject '{sub.name}' weekly periods ({sub.weekly_periods}) must be divisible by consecutive periods ({sub.consecutive_periods}).",
                    entity_type="subject",
                    entity_id=sub.id
                ))

    # 8. Lab room availability check
    labs = [r for r in request.rooms if r.type == "lab"]
    for assign in request.assignments:
        if assign.subject_id in sub_map:
            sub = sub_map[assign.subject_id]
            if sub.type == "practical":
                # Find if any lab is compatible
                matching_labs = []
                for lab in labs:
                    if sub.required_lab_type and lab.lab_type != sub.required_lab_type:
                        continue
                    if lab.supported_subject_ids and sub.id not in lab.supported_subject_ids:
                        continue
                    matching_labs.append(lab)

                if not matching_labs:
                    req_type = sub.required_lab_type or "general"
                    errors.append(ValidationErrorDetail(
                        code="NO_COMPATIBLE_LAB",
                        message=f"Practical subject '{sub.name}' requires a compatible lab (type: '{req_type}'), but no matching lab room exists.",
                        entity_type="subject",
                        entity_id=sub.id
                    ))

    return errors


def _check_duplicate_ids(entity_name: str, ids: List[str], errors: List[ValidationErrorDetail]) -> None:
    seen = set()
    for item_id in ids:
        if item_id in seen:
            errors.append(ValidationErrorDetail(
                code=f"DUPLICATE_{entity_name.upper()}_ID",
                message=f"Duplicate {entity_name} ID detected: '{item_id}'.",
                entity_type=entity_name if entity_name in ["section", "faculty", "subject", "room", "assignment", "config"] else "config",  # type: ignore
                entity_id=item_id
            ))
        seen.add(item_id)
