"""Soft Constraint Objective Construction for CP-SAT Model.

Soft objectives:
1. Spread subjects across the week
2. Penalize excessive consecutive theory classes for sections
3. Minimize idle gaps for faculty within a day
4. Diversify first-period subjects for sections
"""

from typing import List, Dict
from ortools.sat.python import cp_model
from app.build_model import ModelData
from app.models import SolverWeights


def apply_objective(data: ModelData, weights: SolverWeights) -> None:
    """Attaches soft constraints to the CP-SAT objective function."""
    cfg = data.request.college_config
    working_days = cfg.working_days
    periods_per_day = cfg.periods_per_day
    model = data.model

    reward_terms: List[cp_model.LinearExpr] = []
    penalty_terms: List[cp_model.LinearExpr] = []

    # 1. Spread subjects across the week
    # Reward days where section has at least 1 period of a subject
    if weights.spread_subjects_across_week > 0:
        for assign in data.request.assignments:
            sec_id = assign.section_id
            sub_id = assign.subject_id
            sub = data.sub_map[sub_id]
            if sub.type == "theory":
                for day in working_days:
                    day_sub_vars = [
                        data.x[k]
                        for k in data.x
                        if k[0] == sec_id and k[1] == sub_id and k[4] == day
                    ]
                    if day_sub_vars:
                        has_day_var = model.NewBoolVar(f"has_{sec_id}_{sub_id}_d{day}")
                        for v in day_sub_vars:
                            model.Add(has_day_var >= v)
                        model.Add(has_day_var <= sum(day_sub_vars))
                        reward_terms.append(has_day_var * weights.spread_subjects_across_week)

    # 2. Avoid excessive consecutive theory periods for a section
    # If a section has > max_consecutive_theory classes without a break, penalize
    if weights.consecutive_theory_penalty > 0:
        max_c = weights.max_consecutive_theory
        span = max_c + 1
        for sec in data.request.sections:
            for day in working_days:
                day_breaks = data.breaks_by_day[day]
                for p_start in range(1, periods_per_day - span + 2):
                    p_end = p_start + span - 1
                    # Only apply if no break occurs inside this span
                    if not any(p_start <= b < p_end for b in day_breaks):
                        span_class_vars = []
                        for p in range(p_start, p_end + 1):
                            slot_vars = data.sec_day_period_vars.get((sec.id, day, p), [])
                            if slot_vars:
                                span_class_vars.append(sum(slot_vars))

                        if len(span_class_vars) == span:
                            excess_var = model.NewBoolVar(f"excess_consec_{sec.id}_d{day}_p{p_start}")
                            model.Add(sum(span_class_vars) <= span - 1 + excess_var)
                            penalty_terms.append(excess_var * weights.consecutive_theory_penalty)

    # 3. Minimize faculty idle gaps
    # Penalize when faculty has class at period A and period B with idle period in between
    if weights.minimize_faculty_gaps > 0:
        for fac in data.request.faculty:
            for day in working_days:
                teaches_at_p: Dict[int, cp_model.BoolVar] = {}
                for p in range(1, periods_per_day + 1):
                    slot_vars = data.fac_day_period_vars.get((fac.id, day, p), [])
                    if slot_vars:
                        t_var = model.NewBoolVar(f"t_{fac.id}_d{day}_p{p}")
                        model.Add(t_var == sum(slot_vars))
                        teaches_at_p[p] = t_var

                # Gap at period p: earlier class exists AND later class exists AND no class at p
                for p in range(2, periods_per_day):
                    earlier_vars = [teaches_at_p[ep] for ep in range(1, p) if ep in teaches_at_p]
                    later_vars = [teaches_at_p[lp] for lp in range(p + 1, periods_per_day + 1) if lp in teaches_at_p]

                    if earlier_vars and later_vars and p in teaches_at_p:
                        has_earlier = model.NewBoolVar(f"earlier_{fac.id}_d{day}_p{p}")
                        has_later = model.NewBoolVar(f"later_{fac.id}_d{day}_p{p}")
                        for ev in earlier_vars:
                            model.Add(has_earlier >= ev)
                        for lv in later_vars:
                            model.Add(has_later >= lv)

                        gap_var = model.NewBoolVar(f"gap_{fac.id}_d{day}_p{p}")
                        cur_t = teaches_at_p[p]
                        # gap_var is 1 if has_earlier=1, has_later=1, and cur_t=0
                        model.Add(gap_var >= has_earlier + has_later - cur_t - 1)
                        penalty_terms.append(gap_var * weights.minimize_faculty_gaps)

    # 4. Diverse first periods
    # Penalize if section has the same subject in period 1 on multiple days
    if weights.diverse_first_periods > 0:
        for sec in data.request.sections:
            for sub in data.request.subjects:
                p1_vars = [
                    data.x[k]
                    for k in data.x
                    if k[0] == sec.id and k[1] == sub.id and k[5] == 1
                ]
                if len(p1_vars) > 1:
                    repeat_var = model.NewIntVar(0, len(p1_vars), f"rep_p1_{sec.id}_{sub.id}")
                    model.Add(repeat_var >= sum(p1_vars) - 1)
                    penalty_terms.append(repeat_var * weights.diverse_first_periods)

    # Total Objective = Maximize (Rewards - Penalties)
    model.Maximize(sum(reward_terms) - sum(penalty_terms))
