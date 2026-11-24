/**
 * Pure client-side domain validation functions for timetable configuration.
 * Mirrors the backend pre-solve feasibility checks without depending on any UI or solver code.
 */
export function validateConfig(request) {
    const errors = [];
    // 1. Check duplicate IDs within entity collections
    checkDuplicateIds("department", request.departments.map((d) => d.id), errors);
    checkDuplicateIds("section", request.sections.map((s) => s.id), errors);
    checkDuplicateIds("subject", request.subjects.map((sub) => sub.id), errors);
    checkDuplicateIds("faculty", request.faculty.map((f) => f.id), errors);
    checkDuplicateIds("room", request.rooms.map((r) => r.id), errors);
    checkDuplicateIds("assignment", request.assignments.map((a) => a.id), errors);
    checkDuplicateIds("break", request.breakSlots.map((b) => b.id), errors);
    const deptMap = new Map(request.departments.map((d) => [d.id, d]));
    const secMap = new Map(request.sections.map((s) => [s.id, s]));
    const subMap = new Map(request.subjects.map((s) => [s.id, s]));
    const facMap = new Map(request.faculty.map((f) => [f.id, f]));
    const roomMap = new Map(request.rooms.map((r) => [r.id, r]));
    // 2. Reference integrity
    for (const sec of request.sections) {
        if (!deptMap.has(sec.departmentId)) {
            errors.push({
                code: "INVALID_DEPARTMENT_REF",
                message: `Section '${sec.name}' references non-existent department ID '${sec.departmentId}'.`,
                entityType: "section",
                entityId: sec.id,
            });
        }
    }
    for (const sub of request.subjects) {
        if (!deptMap.has(sub.departmentId)) {
            errors.push({
                code: "INVALID_DEPARTMENT_REF",
                message: `Subject '${sub.name}' (${sub.code}) references non-existent department ID '${sub.departmentId}'.`,
                entityType: "subject",
                entityId: sub.id,
            });
        }
    }
    for (const fac of request.faculty) {
        if (!deptMap.has(fac.departmentId)) {
            errors.push({
                code: "INVALID_DEPARTMENT_REF",
                message: `Faculty '${fac.name}' references non-existent department ID '${fac.departmentId}'.`,
                entityType: "faculty",
                entityId: fac.id,
            });
        }
        for (const qSubId of fac.qualifiedSubjectIds) {
            if (!subMap.has(qSubId)) {
                errors.push({
                    code: "INVALID_SUBJECT_REF",
                    message: `Faculty '${fac.name}' references non-existent qualified subject ID '${qSubId}'.`,
                    entityType: "faculty",
                    entityId: fac.id,
                });
            }
        }
    }
    for (const room of request.rooms) {
        if (room.supportedSubjectIds) {
            for (const sId of room.supportedSubjectIds) {
                if (!subMap.has(sId)) {
                    errors.push({
                        code: "INVALID_SUBJECT_REF",
                        message: `Room '${room.name}' references non-existent supported subject ID '${sId}'.`,
                        entityType: "room",
                        entityId: room.id,
                    });
                }
            }
        }
    }
    // 3. Assignment integrity & qualification checks
    const seenPairs = new Set();
    for (const assign of request.assignments) {
        if (!secMap.has(assign.sectionId)) {
            errors.push({
                code: "INVALID_SECTION_REF",
                message: `Assignment '${assign.id}' references non-existent section ID '${assign.sectionId}'.`,
                entityType: "assignment",
                entityId: assign.id,
            });
            continue;
        }
        if (!subMap.has(assign.subjectId)) {
            errors.push({
                code: "INVALID_SUBJECT_REF",
                message: `Assignment '${assign.id}' references non-existent subject ID '${assign.subjectId}'.`,
                entityType: "assignment",
                entityId: assign.id,
            });
            continue;
        }
        const sec = secMap.get(assign.sectionId);
        const sub = subMap.get(assign.subjectId);
        const pairKey = `${assign.sectionId}::${assign.subjectId}`;
        if (seenPairs.has(pairKey)) {
            errors.push({
                code: "DUPLICATE_ASSIGNMENT",
                message: `Duplicate assignment for section '${sec.name}' and subject '${sub.name}'.`,
                entityType: "assignment",
                entityId: assign.id,
            });
        }
        seenPairs.add(pairKey);
        // Qualification check
        for (const facId of assign.facultyIds) {
            if (!facMap.has(facId)) {
                errors.push({
                    code: "INVALID_FACULTY_REF",
                    message: `Assignment for section '${sec.name}' references non-existent faculty ID '${facId}'.`,
                    entityType: "assignment",
                    entityId: assign.id,
                });
            }
            else {
                const fac = facMap.get(facId);
                if (!fac.qualifiedSubjectIds.includes(sub.id)) {
                    errors.push({
                        code: "UNQUALIFIED_FACULTY",
                        message: `Faculty '${fac.name}' is assigned to teach '${sub.name}' for section '${sec.name}' but is not qualified for it.`,
                        entityType: "faculty",
                        entityId: fac.id,
                    });
                }
            }
        }
        // Preferred room check
        if (assign.preferredRoomId) {
            if (!roomMap.has(assign.preferredRoomId)) {
                errors.push({
                    code: "INVALID_ROOM_REF",
                    message: `Assignment references non-existent preferred room ID '${assign.preferredRoomId}'.`,
                    entityType: "assignment",
                    entityId: assign.id,
                });
            }
            else {
                const room = roomMap.get(assign.preferredRoomId);
                if (sub.type === "practical" && room.type !== "lab") {
                    errors.push({
                        code: "ROOM_TYPE_MISMATCH",
                        message: `Practical subject '${sub.name}' cannot use non-lab room '${room.name}'.`,
                        entityType: "room",
                        entityId: room.id,
                    });
                }
            }
        }
    }
    // 4. College config & Breaks
    const cfg = request.collegeConfig;
    const workingDaysSet = new Set(cfg.workingDays);
    const totalSlotsPerDay = cfg.periodsPerDay;
    const totalWeekSlots = cfg.workingDays.length * totalSlotsPerDay;
    const dayBreaks = new Map();
    for (const b of request.breakSlots) {
        if (b.periodAfter >= totalSlotsPerDay) {
            errors.push({
                code: "INVALID_BREAK_PERIOD",
                message: `Break '${b.name}' has periodAfter=${b.periodAfter}, which is not less than total periods per day (${totalSlotsPerDay}).`,
                entityType: "config",
                entityId: b.id,
            });
        }
        const targetDays = b.appliesToDays && b.appliesToDays.length > 0 ? b.appliesToDays : cfg.workingDays;
        for (const d of targetDays) {
            if (!workingDaysSet.has(d)) {
                errors.push({
                    code: "BREAK_INVALID_DAY",
                    message: `Break '${b.name}' applies to day ${d}, which is not in working days [${cfg.workingDays.join(", ")}].`,
                    entityType: "config",
                    entityId: b.id,
                });
            }
            else {
                if (!dayBreaks.has(d))
                    dayBreaks.set(d, []);
                dayBreaks.get(d).push(b.periodAfter);
            }
        }
    }
    // 5. Section load feasibility
    const sectionAssignedPeriods = new Map();
    for (const assign of request.assignments) {
        if (subMap.has(assign.subjectId) && secMap.has(assign.sectionId)) {
            const sub = subMap.get(assign.subjectId);
            const current = sectionAssignedPeriods.get(assign.sectionId) || 0;
            sectionAssignedPeriods.set(assign.sectionId, current + sub.weeklyPeriods);
        }
    }
    for (const [secId, totalPeriods] of sectionAssignedPeriods.entries()) {
        if (totalPeriods > totalWeekSlots) {
            const sec = secMap.get(secId);
            errors.push({
                code: "SECTION_OVERLOADED",
                message: `Section '${sec.name}' requires ${totalPeriods} periods per week, which exceeds total available slots (${totalWeekSlots}).`,
                entityType: "section",
                entityId: secId,
            });
        }
    }
    // 6. Faculty availability & workload caps
    const facultyAssignedPeriods = new Map();
    for (const assign of request.assignments) {
        if (subMap.has(assign.subjectId)) {
            const sub = subMap.get(assign.subjectId);
            for (const facId of assign.facultyIds) {
                const cur = facultyAssignedPeriods.get(facId) || 0;
                facultyAssignedPeriods.set(facId, cur + sub.weeklyPeriods);
            }
        }
    }
    for (const fac of request.faculty) {
        const assigned = facultyAssignedPeriods.get(fac.id) || 0;
        let unavailableValidCount = 0;
        const seenUnavail = new Set();
        for (const unavail of fac.unavailableSlots) {
            if (!workingDaysSet.has(unavail.day) || unavail.period < 1 || unavail.period > totalSlotsPerDay) {
                errors.push({
                    code: "INVALID_UNAVAILABLE_SLOT",
                    message: `Faculty '${fac.name}' has invalid unavailable slot (day=${unavail.day}, period=${unavail.period}).`,
                    entityType: "faculty",
                    entityId: fac.id,
                });
            }
            else {
                const slotKey = `${unavail.day}::${unavail.period}`;
                if (!seenUnavail.has(slotKey)) {
                    seenUnavail.add(slotKey);
                    unavailableValidCount++;
                }
            }
        }
        const availableSlots = totalWeekSlots - unavailableValidCount;
        if (assigned > availableSlots) {
            errors.push({
                code: "FACULTY_OVERLOADED_AVAILABILITY",
                message: `Faculty '${fac.name}' is assigned ${assigned} periods per week but only has ${availableSlots} available slots.`,
                entityType: "faculty",
                entityId: fac.id,
            });
        }
        if (fac.maxPeriodsPerWeek !== undefined && assigned > fac.maxPeriodsPerWeek) {
            errors.push({
                code: "FACULTY_EXCEEDS_WEEKLY_MAX",
                message: `Faculty '${fac.name}' is assigned ${assigned} periods per week, exceeding the weekly maximum of ${fac.maxPeriodsPerWeek}.`,
                entityType: "faculty",
                entityId: fac.id,
            });
        }
        if (fac.maxPeriodsPerDay !== undefined) {
            const maxPossibleWeekly = fac.maxPeriodsPerDay * cfg.workingDays.length;
            if (assigned > maxPossibleWeekly) {
                errors.push({
                    code: "FACULTY_EXCEEDS_DAILY_CAP_PRODUCT",
                    message: `Faculty '${fac.name}' is assigned ${assigned} periods per week, which is impossible with a daily cap of ${fac.maxPeriodsPerDay} across ${cfg.workingDays.length} working days.`,
                    entityType: "faculty",
                    entityId: fac.id,
                });
            }
        }
    }
    // 7. Practical consecutive block feasibility with breaks
    let maxContinuousBlockOverall = 0;
    for (const d of cfg.workingDays) {
        const breaks = (dayBreaks.get(d) || []).slice().sort((a, b) => a - b);
        const blockLengths = [];
        let startP = 1;
        for (const bAfter of breaks) {
            blockLengths.push(bAfter - startP + 1);
            startP = bAfter + 1;
        }
        blockLengths.push(totalSlotsPerDay - startP + 1);
        const dayMax = Math.max(...blockLengths);
        if (dayMax > maxContinuousBlockOverall) {
            maxContinuousBlockOverall = dayMax;
        }
    }
    for (const sub of request.subjects) {
        if (sub.type === "practical") {
            if (sub.consecutivePeriods < 2) {
                errors.push({
                    code: "PRACTICAL_INVALID_CONSECUTIVE",
                    message: `Practical subject '${sub.name}' must have consecutivePeriods >= 2 (got ${sub.consecutivePeriods}).`,
                    entityType: "subject",
                    entityId: sub.id,
                });
            }
            else if (sub.consecutivePeriods > totalSlotsPerDay) {
                errors.push({
                    code: "PRACTICAL_EXCEEDS_DAY_PERIODS",
                    message: `Practical subject '${sub.name}' requires ${sub.consecutivePeriods} consecutive periods, which exceeds periods per day (${totalSlotsPerDay}).`,
                    entityType: "subject",
                    entityId: sub.id,
                });
            }
            else if (sub.consecutivePeriods > maxContinuousBlockOverall) {
                errors.push({
                    code: "PRACTICAL_BLOCKED_BY_BREAKS",
                    message: `Practical subject '${sub.name}' requires ${sub.consecutivePeriods} consecutive periods, but no continuous block of this size exists on any working day due to breaks (largest block is ${maxContinuousBlockOverall}).`,
                    entityType: "subject",
                    entityId: sub.id,
                });
            }
            if (sub.weeklyPeriods % sub.consecutivePeriods !== 0) {
                errors.push({
                    code: "PRACTICAL_PERIODS_NOT_MULTIPLE",
                    message: `Practical subject '${sub.name}' weekly periods (${sub.weeklyPeriods}) must be divisible by consecutive periods (${sub.consecutivePeriods}).`,
                    entityType: "subject",
                    entityId: sub.id,
                });
            }
        }
    }
    // 8. Lab room availability check
    const labs = request.rooms.filter((r) => r.type === "lab");
    for (const assign of request.assignments) {
        if (subMap.has(assign.subjectId)) {
            const sub = subMap.get(assign.subjectId);
            if (sub.type === "practical") {
                const matchingLabs = labs.filter((lab) => {
                    if (sub.requiredLabType && lab.labType !== sub.requiredLabType)
                        return false;
                    if (lab.supportedSubjectIds && !lab.supportedSubjectIds.includes(sub.id))
                        return false;
                    return true;
                });
                if (matchingLabs.length === 0) {
                    const reqType = sub.requiredLabType || "general";
                    errors.push({
                        code: "NO_COMPATIBLE_LAB",
                        message: `Practical subject '${sub.name}' requires a compatible lab (type: '${reqType}'), but no matching lab room exists.`,
                        entityType: "subject",
                        entityId: sub.id,
                    });
                }
            }
        }
    }
    return errors;
}
function checkDuplicateIds(entityName, ids, errors) {
    const seen = new Set();
    for (const id of ids) {
        if (seen.has(id)) {
            const entityType = [
                "section",
                "faculty",
                "subject",
                "room",
                "assignment",
            ].includes(entityName)
                ? entityName
                : "config";
            errors.push({
                code: `DUPLICATE_${entityName.toUpperCase()}_ID`,
                message: `Duplicate ${entityName} ID detected: '${id}'.`,
                entityType,
                entityId: id,
            });
        }
        seen.add(id);
    }
}
