/**
 * Client-side Excel export using SheetJS (xlsx).
 * Generates structured multi-sheet workbooks:
 * - One sheet per section
 * - Summary sheet for faculty schedules
 * - Summary sheet for room occupancy
 */
import * as XLSX from "xlsx";
const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export function exportTimetableToExcel(config, timetable) {
    const wb = XLSX.utils.book_new();
    const secMap = new Map(config.sections.map((s) => [s.id, s]));
    const subMap = new Map(config.subjects.map((s) => [s.id, s]));
    const facMap = new Map(config.faculty.map((f) => [f.id, f]));
    const roomMap = new Map(config.rooms.map((r) => [r.id, r]));
    const workingDays = config.collegeConfig.workingDays;
    const periodsPerDay = config.collegeConfig.periodsPerDay;
    // Map break slots by period_after
    const breakMap = new Map();
    for (const b of config.breakSlots) {
        breakMap.set(b.periodAfter, b.name);
    }
    // 1. Sheet per section
    for (const sec of config.sections) {
        const sheetData = [];
        // Header info
        sheetData.push([config.collegeConfig.collegeName]);
        sheetData.push([`Section: ${sec.name} (Year ${sec.year}, Sem ${sec.semester})`]);
        sheetData.push([]);
        // Column headers
        const headers = ["Period", ...workingDays.map((d) => DAY_NAMES[d] || `Day ${d}`)];
        sheetData.push(headers);
        for (let p = 1; p <= periodsPerDay; p++) {
            const row = [`Period ${p}`];
            for (const d of workingDays) {
                const slot = timetable.find((s) => s.sectionId === sec.id && s.day === d && s.period === p);
                if (slot) {
                    const sub = subMap.get(slot.subjectId);
                    const fac = facMap.get(slot.facultyId);
                    const room = roomMap.get(slot.roomId);
                    row.push(`${sub?.code || slot.subjectId} [${fac?.shortName || slot.facultyId} - ${room?.name || slot.roomId}]`);
                }
                else {
                    row.push("-");
                }
            }
            sheetData.push(row);
            if (breakMap.has(p)) {
                const breakName = breakMap.get(p);
                const breakRow = [`*** ${breakName.toUpperCase()} ***`];
                for (let i = 0; i < workingDays.length; i++) {
                    breakRow.push("---");
                }
                sheetData.push(breakRow);
            }
        }
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        // Sanitize sheet name (max 31 chars, no invalid chars)
        const safeSheetName = sec.name.replace(/[:\\/?*\[\]]/g, "_").slice(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
    }
    // 2. Faculty master schedule sheet
    const facultyData = [];
    facultyData.push([config.collegeConfig.collegeName]);
    facultyData.push(["Faculty Consolidated Timetable"]);
    facultyData.push([]);
    facultyData.push(["Faculty Name", "Short Code", "Day", "Period", "Subject", "Section", "Room"]);
    for (const fac of config.faculty) {
        const facSlots = timetable
            .filter((s) => s.facultyId === fac.id)
            .sort((a, b) => a.day - b.day || a.period - b.period);
        for (const s of facSlots) {
            facultyData.push([
                fac.name,
                fac.shortName,
                DAY_NAMES[s.day] || `Day ${s.day}`,
                `Period ${s.period}`,
                subMap.get(s.subjectId)?.code || s.subjectId,
                secMap.get(s.sectionId)?.name || s.sectionId,
                roomMap.get(s.roomId)?.name || s.roomId,
            ]);
        }
    }
    const wsFac = XLSX.utils.aoa_to_sheet(facultyData);
    XLSX.utils.book_append_sheet(wb, wsFac, "Faculty Schedule");
    // 3. Room occupancy sheet
    const roomData = [];
    roomData.push([config.collegeConfig.collegeName]);
    roomData.push(["Room Occupancy Matrix"]);
    roomData.push([]);
    roomData.push(["Room Name", "Type", "Day", "Period", "Subject", "Section", "Faculty"]);
    for (const room of config.rooms) {
        const rSlots = timetable
            .filter((s) => s.roomId === room.id)
            .sort((a, b) => a.day - b.day || a.period - b.period);
        for (const s of rSlots) {
            roomData.push([
                room.name,
                room.type,
                DAY_NAMES[s.day] || `Day ${s.day}`,
                `Period ${s.period}`,
                subMap.get(s.subjectId)?.code || s.subjectId,
                secMap.get(s.sectionId)?.name || s.sectionId,
                facMap.get(s.facultyId)?.shortName || s.facultyId,
            ]);
        }
    }
    const wsRoom = XLSX.utils.aoa_to_sheet(roomData);
    XLSX.utils.book_append_sheet(wb, wsRoom, "Room Occupancy");
    const fileName = `Timetable_${config.collegeConfig.collegeName.replace(/\s+/g, "_")}.xlsx`;
    XLSX.writeFile(wb, fileName);
}
