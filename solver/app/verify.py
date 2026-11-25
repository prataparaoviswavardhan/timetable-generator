"""Independent Timetable Verification Engine.

This module validates a generated timetable against all hard constraints and the JSON contract
defined in docs/data-model.md.

CRITICAL ARCHITECTURE INVARIANT:
This module contains ZERO imports or dependencies on the CP-SAT solver, OR-Tools,
or solver model-building code. It is an independent verifier that checks the output
solely against the configuration domain model.
"""

from typing import List, Dict, Set, Tuple
from collections import defaultdict

from app.models import (
    GenerateRequest,
    TimetableSlot,
    ValidationErrorDetail,
)


def verify_timetable(request: GenerateRequest, timetable: List[TimetableSlot]) -> List[ValidationErrorDetail]:
    """Verify that a timetable strictly satisfies all 11 hard constraints and the JSON contract.
    
    Returns a list of ValidationErrorDetail. An empty list indicates 100% contract compliance.
    """
    errors: List[ValidationErrorDetail] = []

    cfg = request.college_config
    working_days_set = set(cfg.working_days)
    sec_map = {s.id: s for s in request.sections}
    sub_map = {s.id: s for s in request.subjects}
    fac_map = {f.id: f for f in request.faculty}
    room_map = {r.id: r for r in request.rooms}
    assign_map = {(a.section_id, a.subject_id): a for a in request.assignments}

    # Map break slots: day -> set of period_after values
    breaks_by_day: Dict[int, Set[int]] = defaultdict(set)
    for b in request.break_slots:
        target_days = b.applies_to_days if b.applies_to_days else cfg.working_days
        for d in target_days:
            breaks_by_day[d].add(b.period_after)

    # 1. Basic slot validity and reference integrity
    for slot in timetable:
        if slot.section_id not in sec_map:
            errors.append(ValidationErrorDetail(
                code="INVALID_SECTION_IN_SLOT",
                message=f"Timetable slot '{slot.id}' references unknown section '{slot.section_id}'.",
                entity_type="section",
                entity_id=slot.section_id
            ))
        if slot.subject_id not in sub_map:
            errors.append(ValidationErrorDetail(
                code="INVALID_SUBJECT_IN_SLOT",
                message=f"Timetable slot '{slot.id}' references unknown subject '{slot.subject_id}'.",
                entity_type="subject",
                entity_id=slot.subject_id
            ))
        if slot.faculty_id not in fac_map:
            errors.append(ValidationErrorDetail(
                code="INVALID_FACULTY_IN_SLOT",
                message=f"Timetable slot '{slot.id}' references unknown faculty '{slot.faculty_id}'.",
                entity_type="faculty",
                entity_id=slot.faculty_id
            ))
        if slot.room_id not in room_map:
            errors.append(ValidationErrorDetail(
                code="INVALID_ROOM_IN_SLOT",
                message=f"Timetable slot '{slot.id}' references unknown room '{slot.room_id}'.",
                entity_type="room",
                entity_id=slot.room_id
            ))

        # Constraint 7: Working days and hours
        if slot.day not in working_days_set:
            errors.append(ValidationErrorDetail(
                code="SLOT_OUTSIDE_WORKING_DAYS",
                message=f"Slot '{slot.id}' scheduled on day {slot.day}, which is not a working day.",
                entity_type="config",
                entity_id=slot.id
            ))
        if slot.period < 1 or slot.period > cfg.periods_per_day:
            errors.append(ValidationErrorDetail(
                code="SLOT_OUTSIDE_WORKING_PERIODS",
                message=f"Slot '{slot.id}' scheduled at period {slot.period}, outside valid range (1..{cfg.periods_per_day}).",
                entity_type="config",
                entity_id=slot.id
            ))

        # Constraint 5: Faculty qualification
        if slot.faculty_id in fac_map and slot.subject_id in sub_map:
            fac = fac_map[slot.faculty_id]
            sub = sub_map[slot.subject_id]
            if sub.id not in fac.qualified_subject_ids:
                errors.append(ValidationErrorDetail(
                    code="UNQUALIFIED_FACULTY_IN_SLOT",
                    message=f"Faculty '{fac.name}' is scheduled to teach '{sub.name}' in slot '{slot.id}' but is not qualified.",
                    entity_type="faculty",
                    entity_id=fac.id
                ))

            # Assignment check: must be an assigned faculty for this section-subject
            pair = (slot.section_id, slot.subject_id)
            if pair in assign_map:
                assign = assign_map[pair]
                if slot.faculty_id not in assign.faculty_ids:
                    errors.append(ValidationErrorDetail(
                        code="UNASSIGNED_FACULTY_IN_SLOT",
                        message=f"Faculty '{fac.name}' teaches '{sub.name}' for section '{sec_map.get(slot.section_id, slot.section_id)}' in slot '{slot.id}' but is not in assignment's faculty list.",
                        entity_type="faculty",
                        entity_id=fac.id
                    ))
            else:
                errors.append(ValidationErrorDetail(
                    code="UNASSIGNED_SUBJECT_FOR_SECTION",
                    message=f"Subject '{sub.name}' is scheduled for section '{sec_map.get(slot.section_id, slot.section_id)}' without an assignment entry.",
                    entity_type="assignment",
                    entity_id=slot.id
                ))

        # Constraint 10: Practical room compatibility
        if slot.subject_id in sub_map and slot.room_id in room_map:
            sub = sub_map[slot.subject_id]
            room = room_map[slot.room_id]
            if sub.type == "practical":
                if room.type != "lab":
                    errors.append(ValidationErrorDetail(
                        code="PRACTICAL_IN_NON_LAB",
                        message=f"Practical subject '{sub.name}' is assigned to non-lab room '{room.name}'.",
                        entity_type="room",
                        entity_id=room.id
                    ))
                if sub.required_lab_type and room.lab_type != sub.required_lab_type:
                    errors.append(ValidationErrorDetail(
                        code="LAB_TYPE_MISMATCH",
                        message=f"Practical subject '{sub.name}' requires lab type '{sub.required_lab_type}', but room '{room.name}' has type '{room.lab_type}'.",
                        entity_type="room",
                        entity_id=room.id
                    ))
                if room.supported_subject_ids and sub.id not in room.supported_subject_ids:
                    errors.append(ValidationErrorDetail(
                        code="ROOM_SUBJECT_UNSUPPORTED",
                        message=f"Room '{room.name}' does not support practical subject '{sub.name}'.",
                        entity_type="room",
                        entity_id=room.id
                    ))

    # 2. Constraint 1: Section conflict (at most 1 class per section per slot)
    sec_time_slots: Dict[Tuple[str, int, int], List[TimetableSlot]] = defaultdict(list)
    for slot in timetable:
        sec_time_slots[(slot.section_id, slot.day, slot.period)].append(slot)

    for (sec_id, day, period), slots in sec_time_slots.items():
        if len(slots) > 1:
            sec_name = sec_map[sec_id].name if sec_id in sec_map else sec_id
            errors.append(ValidationErrorDetail(
                code="SECTION_DOUBLE_BOOKED",
                message=f"Section '{sec_name}' has {len(slots)} simultaneous classes on day {day}, period {period}.",
                entity_type="section",
                entity_id=sec_id
            ))

    # 3. Constraint 2: Faculty conflict (at most 1 class per faculty per slot)
    fac_time_slots: Dict[Tuple[str, int, int], List[TimetableSlot]] = defaultdict(list)
    for slot in timetable:
        fac_time_slots[(slot.faculty_id, slot.day, slot.period)].append(slot)

    for (fac_id, day, period), slots in fac_time_slots.items():
        if len(slots) > 1:
            fac_name = fac_map[fac_id].name if fac_id in fac_map else fac_id
            errors.append(ValidationErrorDetail(
                code="FACULTY_DOUBLE_BOOKED",
                message=f"Faculty '{fac_name}' is double-booked across {len(slots)} sections on day {day}, period {period}.",
                entity_type="faculty",
                entity_id=fac_id
            ))

    # 4. Constraint 3: Room conflict (at most 1 class per room per slot)
    room_time_slots: Dict[Tuple[str, int, int], List[TimetableSlot]] = defaultdict(list)
    for slot in timetable:
        room_time_slots[(slot.room_id, slot.day, slot.period)].append(slot)

    for (room_id, day, period), slots in room_time_slots.items():
        if len(slots) > 1:
            room_name = room_map[room_id].name if room_id in room_map else room_id
            errors.append(ValidationErrorDetail(
                code="ROOM_DOUBLE_BOOKED",
                message=f"Room '{room_name}' is double-booked across {len(slots)} classes on day {day}, period {period}.",
                entity_type="room",
                entity_id=room_id
            ))

    # 5. Constraint 4: Exact weekly period requirements per assignment
    actual_assignment_counts: Dict[Tuple[str, str], int] = defaultdict(int)
    for slot in timetable:
        actual_assignment_counts[(slot.section_id, slot.subject_id)] += 1

    for assign in request.assignments:
        pair = (assign.section_id, assign.subject_id)
        actual_count = actual_assignment_counts[pair]
        sub = sub_map.get(assign.subject_id)
        sec = sec_map.get(assign.section_id)
        if sub:
            expected = sub.weekly_periods
            if actual_count != expected:
                sec_name = sec.name if sec else assign.section_id
                errors.append(ValidationErrorDetail(
                    code="PERIOD_COUNT_MISMATCH",
                    message=f"Section '{sec_name}' has {actual_count} scheduled periods for subject '{sub.name}', but exactly {expected} are required.",
                    entity_type="assignment",
                    entity_id=assign.id
                ))

    # 6. Constraint 6: Faculty availability windows & workload caps
    for fac in request.faculty:
        fac_slots = [s for s in timetable if s.faculty_id == fac.id]
        
        # Check unavailable slots
        unavail_set = {(u.day, u.period) for u in fac.unavailable_slots}
        for s in fac_slots:
            if (s.day, s.period) in unavail_set:
                errors.append(ValidationErrorDetail(
                    code="FACULTY_UNAVAILABLE_SLOT_VIOLATED",
                    message=f"Faculty '{fac.name}' is scheduled on day {s.day}, period {s.period}, which is in their unavailable slots.",
                    entity_type="faculty",
                    entity_id=fac.id
                ))

        # Constraint 11: Workload caps
        if fac.max_periods_per_week is not None and len(fac_slots) > fac.max_periods_per_week:
            errors.append(ValidationErrorDetail(
                code="FACULTY_EXCEEDS_WEEKLY_CAP",
                message=f"Faculty '{fac.name}' has {len(fac_slots)} scheduled periods, exceeding weekly cap of {fac.max_periods_per_week}.",
                entity_type="faculty",
                entity_id=fac.id
            ))

        if fac.max_periods_per_day is not None:
            day_counts: Dict[int, int] = defaultdict(int)
            for s in fac_slots:
                day_counts[s.day] += 1
            for day, count in day_counts.items():
                if count > fac.max_periods_per_day:
                    errors.append(ValidationErrorDetail(
                        code="FACULTY_EXCEEDS_DAILY_CAP",
                        message=f"Faculty '{fac.name}' has {count} scheduled periods on day {day}, exceeding daily cap of {fac.max_periods_per_day}.",
                        entity_type="faculty",
                        entity_id=fac.id
                    ))

    # 7. Constraint 8 & 9: Consecutive practical blocks and break crossing
    # For every practical assignment, group slots by section and subject
    practical_slots_by_sec_sub: Dict[Tuple[str, str], List[TimetableSlot]] = defaultdict(list)
    for slot in timetable:
        sub = sub_map.get(slot.subject_id)
        if sub and sub.type == "practical":
            practical_slots_by_sec_sub[(slot.section_id, slot.subject_id)].append(slot)

    for (sec_id, sub_id), p_slots in practical_slots_by_sec_sub.items():
        sub = sub_map[sub_id]
        sec = sec_map.get(sec_id)
        sec_name = sec.name if sec else sec_id
        req_consecutive = sub.consecutive_periods

        # Group by day
        slots_by_day: Dict[int, List[TimetableSlot]] = defaultdict(list)
        for s in p_slots:
            slots_by_day[s.day].append(s)

        for day, d_slots in slots_by_day.items():
            # Sort periods on this day
            d_slots_sorted = sorted(d_slots, key=lambda s: s.period)
            periods = [s.period for s in d_slots_sorted]
            day_breaks = breaks_by_day[day]

            # Check that periods are partitioned into contiguous blocks of length req_consecutive
            # e.g., if req_consecutive = 2, we must have pairs: [1, 2], or [5, 6]
            if len(periods) % req_consecutive != 0:
                errors.append(ValidationErrorDetail(
                    code="PRACTICAL_BLOCK_SIZE_MISMATCH",
                    message=f"Practical subject '{sub.name}' for section '{sec_name}' has {len(periods)} periods on day {day}, not divisible by required block size ({req_consecutive}).",
                    entity_type="subject",
                    entity_id=sub.id
                ))
                continue

            # Check each contiguous chunk of size req_consecutive
            for i in range(0, len(periods), req_consecutive):
                chunk_slots = d_slots_sorted[i : i + req_consecutive]
                chunk_periods = [s.period for s in chunk_slots]

                # Must be strictly contiguous: p[k+1] == p[k] + 1
                is_contiguous = all(
                    chunk_periods[k + 1] == chunk_periods[k] + 1
                    for k in range(len(chunk_periods) - 1)
                )
                if not is_contiguous:
                    errors.append(ValidationErrorDetail(
                        code="PRACTICAL_NOT_CONTIGUOUS",
                        message=f"Practical subject '{sub.name}' for section '{sec_name}' has non-consecutive periods {chunk_periods} on day {day}.",
                        entity_type="subject",
                        entity_id=sub.id
                    ))
                    continue

                # Must not cross any break on this day
                # A break occurs after period b. If start_p <= b < end_p, it crosses the break!
                start_p = chunk_periods[0]
                end_p = chunk_periods[-1]
                for b_after in day_breaks:
                    if start_p <= b_after < end_p:
                        errors.append(ValidationErrorDetail(
                            code="PRACTICAL_CROSSES_BREAK",
                            message=f"Practical subject '{sub.name}' block {chunk_periods} on day {day} crosses break after period {b_after}.",
                            entity_type="subject",
                            entity_id=sub.id
                        ))

                # Room and faculty must be consistent throughout the block
                rooms_in_chunk = {s.room_id for s in chunk_slots}
                fac_in_chunk = {s.faculty_id for s in chunk_slots}
                if len(rooms_in_chunk) > 1:
                    errors.append(ValidationErrorDetail(
                        code="PRACTICAL_SPLIT_ROOMS",
                        message=f"Practical subject '{sub.name}' block {chunk_periods} on day {day} changes rooms mid-session.",
                        entity_type="room",
                        entity_id=sub.id
                    ))
                if len(fac_in_chunk) > 1:
                    errors.append(ValidationErrorDetail(
                        code="PRACTICAL_SPLIT_FACULTY",
                        message=f"Practical subject '{sub.name}' block {chunk_periods} on day {day} changes faculty mid-session.",
                        entity_type="faculty",
                        entity_id=sub.id
                    ))

    return errors
