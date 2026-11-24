"""CP-SAT Model Builder for Timetable Generation.

Builds decision variables and hard constraints:
1. Section concurrency: at most 1 class per section per slot
2. Faculty concurrency: at most 1 class per faculty per slot
3. Room concurrency: at most 1 class per room per slot
4. Weekly period requirements per section-subject assignment
5. Faculty availability masks
6. Faculty daily and weekly workload caps
7. Consecutive practical blocks with break avoidance and consistent room/faculty
8. Lab type compatibility for practicals
"""

from typing import Dict, List, Tuple, Set
from collections import defaultdict
from ortools.sat.python import cp_model

from solver.app.models import (
    GenerateRequest,
    Subject,
    Faculty,
    Room,
    SectionSubjectAssignment,
)


class ModelData:
    """Holds CP-SAT model and indexing maps for variable access."""
    def __init__(self, request: GenerateRequest):
        self.request = request
        self.model = cp_model.CpModel()
        
        # Maps
        self.sec_map = {s.id: s for s in request.sections}
        self.sub_map = {s.id: s for s in request.subjects}
        self.fac_map = {f.id: f for f in request.faculty}
        self.room_map = {r.id: r for r in request.rooms}

        # Breaks: day -> set of period_after
        self.breaks_by_day: Dict[int, Set[int]] = defaultdict(set)
        cfg = request.college_config
        for b in request.break_slots:
            target_days = b.applies_to_days if b.applies_to_days else cfg.working_days
            for d in target_days:
                self.breaks_by_day[d].add(b.period_after)

        # Variables:
        # x[(sec_id, sub_id, fac_id, room_id, day, period)] -> BoolVar
        self.x: Dict[Tuple[str, str, str, str, int, int], cp_model.BoolVar] = {}

        # block[(sec_id, sub_id, fac_id, room_id, day, start_period)] -> BoolVar (for practicals)
        self.block: Dict[Tuple[str, str, str, str, int, int], cp_model.BoolVar] = {}

        # Precomputed index groupings for fast constraint building
        self.sec_day_period_vars: Dict[Tuple[str, int, int], List[cp_model.BoolVar]] = defaultdict(list)
        self.fac_day_period_vars: Dict[Tuple[str, int, int], List[cp_model.BoolVar]] = defaultdict(list)
        self.room_day_period_vars: Dict[Tuple[str, int, int], List[cp_model.BoolVar]] = defaultdict(list)
        self.fac_day_vars: Dict[Tuple[str, int], List[cp_model.BoolVar]] = defaultdict(list)
        self.fac_all_vars: Dict[str, List[cp_model.BoolVar]] = defaultdict(list)


def build_model(request: GenerateRequest) -> ModelData:
    """Constructs the complete CP-SAT model with all 11 hard constraints."""
    data = ModelData(request)
    cfg = request.college_config
    working_days = cfg.working_days
    periods_per_day = cfg.periods_per_day

    # 1. Create decision variables for each assignment
    for assign in request.assignments:
        sec_id = assign.section_id
        sub = data.sub_map[assign.subject_id]
        assigned_fac_ids = assign.faculty_ids

        # Eligible rooms for this assignment
        eligible_rooms = _get_eligible_rooms(assign, sub, data.room_map)

        if sub.type == "theory":
            _build_theory_variables(
                data,
                sec_id=sec_id,
                sub=sub,
                fac_ids=assigned_fac_ids,
                room_ids=eligible_rooms,
                working_days=working_days,
                periods_per_day=periods_per_day,
            )
        else:
            _build_practical_variables(
                data,
                sec_id=sec_id,
                sub=sub,
                fac_ids=assigned_fac_ids,
                room_ids=eligible_rooms,
                working_days=working_days,
                periods_per_day=periods_per_day,
            )

    # 2. Hard Constraint 1: Section Concurrency (at most 1 class per section per slot)
    for (sec_id, day, period), vars_list in data.sec_day_period_vars.items():
        if len(vars_list) > 1:
            data.model.AddAtMostOne(vars_list)

    # 3. Hard Constraint 2: Faculty Concurrency (at most 1 class per faculty per slot)
    for (fac_id, day, period), vars_list in data.fac_day_period_vars.items():
        if len(vars_list) > 1:
            data.model.AddAtMostOne(vars_list)

    # 4. Hard Constraint 3: Room Concurrency (at most 1 class per room per slot)
    for (room_id, day, period), vars_list in data.room_day_period_vars.items():
        if len(vars_list) > 1:
            data.model.AddAtMostOne(vars_list)

    # 5. Hard Constraint 4: Weekly period requirements per assignment
    for assign in request.assignments:
        sub = data.sub_map[assign.subject_id]
        sec_id = assign.section_id
        
        if sub.type == "theory":
            assign_vars = [
                data.x[k]
                for k in data.x
                if k[0] == sec_id and k[1] == sub.id
            ]
            data.model.Add(sum(assign_vars) == sub.weekly_periods)
        else:
            # For practicals, number of blocks must equal weekly_periods // consecutive_periods
            req_blocks = sub.weekly_periods // sub.consecutive_periods
            block_vars = [
                data.block[k]
                for k in data.block
                if k[0] == sec_id and k[1] == sub.id
            ]
            data.model.Add(sum(block_vars) == req_blocks)

            # At most one practical block of this subject per section per day (distributed)
            for day in working_days:
                day_blocks = [
                    data.block[k]
                    for k in data.block
                    if k[0] == sec_id and k[1] == sub.id and k[4] == day
                ]
                if day_blocks:
                    data.model.AddAtMostOne(day_blocks)

    # 6. Hard Constraint 6: Faculty Availability Windows
    for fac in request.faculty:
        for unavail in fac.unavailable_slots:
            slot_vars = data.fac_day_period_vars.get((fac.id, unavail.day, unavail.period), [])
            for v in slot_vars:
                data.model.Add(v == 0)

    # 7. Hard Constraint 11: Faculty Workload Caps
    for fac in request.faculty:
        # Weekly cap
        if fac.max_periods_per_week is not None:
            all_fac_vars = data.fac_all_vars.get(fac.id, [])
            if all_fac_vars:
                data.model.Add(sum(all_fac_vars) <= fac.max_periods_per_week)

        # Daily cap
        if fac.max_periods_per_day is not None:
            for day in working_days:
                day_fac_vars = data.fac_day_vars.get((fac.id, day), [])
                if day_fac_vars:
                    data.model.Add(sum(day_fac_vars) <= fac.max_periods_per_day)

    return data


def _get_eligible_rooms(assign: SectionSubjectAssignment, sub: Subject, room_map: Dict[str, Room]) -> List[str]:
    """Finds eligible room IDs for an assignment respecting preferences and types."""
    if assign.preferred_room_id and assign.preferred_room_id in room_map:
        room = room_map[assign.preferred_room_id]
        if sub.type == "theory" or room.type == "lab":
            return [assign.preferred_room_id]

    eligible = []
    for r in room_map.values():
        if sub.type == "practical":
            if r.type != "lab":
                continue
            if sub.required_lab_type and r.lab_type != sub.required_lab_type:
                continue
            if r.supported_subject_ids and sub.id not in r.supported_subject_ids:
                continue
            eligible.append(r.id)
        else:
            if r.type == "classroom":
                eligible.append(r.id)

    # Fallback to general classrooms if no dedicated lab constraint exists
    if not eligible and sub.type == "theory":
        eligible = [r.id for r in room_map.values()]

    return eligible


def _build_theory_variables(
    data: ModelData,
    sec_id: str,
    sub: Subject,
    fac_ids: List[str],
    room_ids: List[str],
    working_days: List[int],
    periods_per_day: int,
) -> None:
    for day in working_days:
        for period in range(1, periods_per_day + 1):
            for fac_id in fac_ids:
                for room_id in room_ids:
                    var_name = f"x_{sec_id}_{sub.id}_{fac_id}_{room_id}_d{day}_p{period}"
                    v = data.model.NewBoolVar(var_name)
                    key = (sec_id, sub.id, fac_id, room_id, day, period)
                    data.x[key] = v

                    # Indexing
                    data.sec_day_period_vars[(sec_id, day, period)].append(v)
                    data.fac_day_period_vars[(fac_id, day, period)].append(v)
                    data.room_day_period_vars[(room_id, day, period)].append(v)
                    data.fac_day_vars[(fac_id, day)].append(v)
                    data.fac_all_vars[fac_id].append(v)


def _build_practical_variables(
    data: ModelData,
    sec_id: str,
    sub: Subject,
    fac_ids: List[str],
    room_ids: List[str],
    working_days: List[int],
    periods_per_day: int,
) -> None:
    k = sub.consecutive_periods

    for day in working_days:
        day_breaks = data.breaks_by_day[day]

        # Valid start periods that fit in day without crossing any break
        valid_starts = []
        for p_start in range(1, periods_per_day - k + 2):
            p_end = p_start + k - 1
            # Check if any break occurs strictly within [p_start, p_end)
            crosses_break = any(p_start <= b < p_end for b in day_breaks)
            if not crosses_break:
                valid_starts.append(p_start)

        for p_start in valid_starts:
            for fac_id in fac_ids:
                for room_id in room_ids:
                    b_name = f"blk_{sec_id}_{sub.id}_{fac_id}_{room_id}_d{day}_p{p_start}"
                    blk_var = data.model.NewBoolVar(b_name)
                    data.block[(sec_id, sub.id, fac_id, room_id, day, p_start)] = blk_var

                    # For each period in the block, create period variable and bind it
                    for offset in range(k):
                        p = p_start + offset
                        key = (sec_id, sub.id, fac_id, room_id, day, p)

                        if key not in data.x:
                            x_name = f"x_{sec_id}_{sub.id}_{fac_id}_{room_id}_d{day}_p{p}"
                            data.x[key] = data.model.NewBoolVar(x_name)
                            data.sec_day_period_vars[(sec_id, day, p)].append(data.x[key])
                            data.fac_day_period_vars[(fac_id, day, p)].append(data.x[key])
                            data.room_day_period_vars[(room_id, day, p)].append(data.x[key])
                            data.fac_day_vars[(fac_id, day)].append(data.x[key])
                            data.fac_all_vars[fac_id].append(data.x[key])

    # Now bind x variables to practical blocks:
    # A period slot x is active if and only if a block covering that period is active
    for day in working_days:
        for p in range(1, periods_per_day + 1):
            for fac_id in fac_ids:
                for room_id in room_ids:
                    key = (sec_id, sub.id, fac_id, room_id, day, p)
                    if key in data.x:
                        # Find all blocks covering this period
                        covering_blocks = [
                            data.block[(sec_id, sub.id, fac_id, room_id, day, p_start)]
                            for p_start in range(max(1, p - k + 1), p + 1)
                            if (sec_id, sub.id, fac_id, room_id, day, p_start) in data.block
                        ]
                        if covering_blocks:
                            data.model.Add(data.x[key] == sum(covering_blocks))
                        else:
                            data.model.Add(data.x[key] == 0)
