/**
 * Client-side PDF export using jsPDF and jspdf-autotable.
 * Generates clean, print-ready landscape timetable sheets (one page per section).
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { GenerateRequest, TimetableSlot } from "../domain/types.ts";

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function exportTimetableToPdf(
  config: GenerateRequest,
  timetable: TimetableSlot[],
  targetSectionId?: string
): void {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const secMap = new Map(config.sections.map((s) => [s.id, s]));
  const subMap = new Map(config.subjects.map((s) => [s.id, s]));
  const facMap = new Map(config.faculty.map((f) => [f.id, f]));
  const roomMap = new Map(config.rooms.map((r) => [r.id, r]));

  const sectionsToExport = targetSectionId
    ? config.sections.filter((s) => s.id === targetSectionId)
    : config.sections;

  if (sectionsToExport.length === 0) return;

  const workingDays = config.collegeConfig.workingDays;
  const periodsPerDay = config.collegeConfig.periodsPerDay;

  // Map break slots by period_after
  const breakMap = new Map<number, string>();
  for (const b of config.breakSlots) {
    breakMap.set(b.periodAfter, b.name);
  }

  sectionsToExport.forEach((sec, index) => {
    if (index > 0) {
      doc.addPage();
    }

    // Title & Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(config.collegeConfig.collegeName, 14, 15);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Section Timetable: ${sec.name} | Year ${sec.year}, Semester ${sec.semester}`,
      14,
      22
    );

    // Table Header
    const headRow = ["Period", ...workingDays.map((d) => DAY_NAMES[d] || `Day ${d}`)];
    const bodyRows: any[] = [];

    for (let p = 1; p <= periodsPerDay; p++) {
      const row = [`Period ${p}`];
      for (const d of workingDays) {
        const slot = timetable.find(
          (s) => s.sectionId === sec.id && s.day === d && s.period === p
        );
        if (slot) {
          const sub = subMap.get(slot.subjectId);
          const fac = facMap.get(slot.facultyId);
          const room = roomMap.get(slot.roomId);

          const cellLines = [
            sub?.code || slot.subjectId,
            sub?.name || "",
            `${fac?.shortName || slot.facultyId} (${room?.name || slot.roomId})`,
          ].filter(Boolean);

          row.push(cellLines.join("\n"));
        } else {
          row.push("-");
        }
      }
      bodyRows.push(row);

      // Add break row if break exists after period p
      if (breakMap.has(p)) {
        const breakName = breakMap.get(p)!;
        bodyRows.push([
          {
            content: `*** ${breakName.toUpperCase()} ***`,
            colSpan: headRow.length,
            styles: {
              halign: "center",
              fillColor: [241, 245, 249],
              textColor: [71, 85, 105],
              fontStyle: "bold",
            },
          },
        ]);
      }
    }

    (autoTable as any)(doc, {
      startY: 28,
      head: [headRow],
      body: bodyRows,
      theme: "grid",
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontSize: 9,
        halign: "center",
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        halign: "center",
        valign: "middle",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: 14, right: 14 },
    });
  });

  const fileName = targetSectionId
    ? `Timetable_${secMap.get(targetSectionId)?.name || "Section"}.pdf`
    : `Timetable_${config.collegeConfig.collegeName.replace(/\s+/g, "_")}.pdf`;

  doc.save(fileName);
}
