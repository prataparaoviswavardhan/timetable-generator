import React, { useState } from "react";
import {
  Calendar,
  User,
  DoorOpen,
  FileSpreadsheet,
  FileText,
  Printer,
  Clock,
  FlaskConical,
  Coffee,
} from "lucide-react";
import type { GenerateRequest, TimetableSlot } from "../domain/types.ts";
import { exportTimetableToPdf } from "../export/pdfExport.ts";
import { exportTimetableToExcel } from "../export/excelExport.ts";

interface TimetableContainerProps {
  config: GenerateRequest;
  timetable: TimetableSlot[];
}

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Distinct accessible pastel colors for subjects
const SUBJECT_COLORS = [
  "border-indigo-300 bg-indigo-50/70 text-indigo-950",
  "border-blue-300 bg-blue-50/70 text-blue-950",
  "border-emerald-300 bg-emerald-50/70 text-emerald-950",
  "border-amber-300 bg-amber-50/70 text-amber-950",
  "border-purple-300 bg-purple-50/70 text-purple-950",
  "border-teal-300 bg-teal-50/70 text-teal-950",
  "border-rose-300 bg-rose-50/70 text-rose-950",
  "border-cyan-300 bg-cyan-50/70 text-cyan-950",
];

export const TimetableContainer: React.FC<TimetableContainerProps> = ({
  config,
  timetable,
}) => {
  const [viewMode, setViewMode] = useState<"section" | "faculty" | "room">("section");
  const [selectedEntityId, setSelectedEntityId] = useState<string>(
    config.sections[0]?.id || ""
  );
  // Mobile day tab selection (1..7)
  const [mobileActiveDay, setMobileActiveDay] = useState<number>(
    config.collegeConfig.workingDays[0] || 1
  );

  const secMap = new Map(config.sections.map((s) => [s.id, s]));
  const subMap = new Map(config.subjects.map((s) => [s.id, s]));
  const facMap = new Map(config.faculty.map((f) => [f.id, f]));
  const roomMap = new Map(config.rooms.map((r) => [r.id, r]));

  // Subject color hash
  const subColorMap = new Map<string, string>();
  config.subjects.forEach((sub, idx) => {
    subColorMap.set(sub.id, SUBJECT_COLORS[idx % SUBJECT_COLORS.length]);
  });

  const workingDays = config.collegeConfig.workingDays;
  const periodsPerDay = config.collegeConfig.periodsPerDay;

  // Break slots map
  const breakMap = new Map<number, { name: string; duration: number }>();
  for (const b of config.breakSlots) {
    breakMap.set(b.periodAfter, { name: b.name, duration: b.durationMinutes });
  }

  // Calculate period start and end times
  const getPeriodTimeWindow = (periodIndex: number): string => {
    try {
      const [startHour, startMin] = config.collegeConfig.dayStartTime.split(":").map(Number);
      let totalMinutes = startHour * 60 + startMin;
      const duration = config.collegeConfig.periodDurationMinutes;

      for (let p = 1; p < periodIndex; p++) {
        totalMinutes += duration;
        if (breakMap.has(p)) {
          totalMinutes += breakMap.get(p)!.duration;
        }
      }

      const pStart = `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(
        totalMinutes % 60
      ).padStart(2, "0")}`;
      const pEndMin = totalMinutes + duration;
      const pEnd = `${String(Math.floor(pEndMin / 60)).padStart(2, "0")}:${String(
        pEndMin % 60
      ).padStart(2, "0")}`;

      return `${pStart} - ${pEnd}`;
    } catch {
      return `Period ${periodIndex}`;
    }
  };

  // Filter slots based on active view mode and entity ID
  const getFilteredSlot = (day: number, period: number): TimetableSlot | undefined => {
    return timetable.find((s) => {
      if (s.day !== day || s.period !== period) return false;
      if (viewMode === "section") return s.sectionId === selectedEntityId;
      if (viewMode === "faculty") return s.facultyId === selectedEntityId;
      if (viewMode === "room") return s.roomId === selectedEntityId;
      return false;
    });
  };

  return (
    <div className="space-y-4">
      {/* View Switcher & Export Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 no-print">
        {/* View Mode Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => {
              setViewMode("section");
              setSelectedEntityId(config.sections[0]?.id || "");
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              viewMode === "section"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>By Section</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode("faculty");
              setSelectedEntityId(config.faculty[0]?.id || "");
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              viewMode === "faculty"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>By Faculty</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode("room");
              setSelectedEntityId(config.rooms[0]?.id || "");
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              viewMode === "room"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <DoorOpen className="w-3.5 h-3.5" />
            <span>By Room / Lab</span>
          </button>
        </div>

        {/* Entity Selector Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-700">
            {viewMode === "section" && "Select Section:"}
            {viewMode === "faculty" && "Select Faculty:"}
            {viewMode === "room" && "Select Facility:"}
          </label>
          <select
            value={selectedEntityId}
            onChange={(e) => setSelectedEntityId(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {viewMode === "section" &&
              config.sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (Year {s.year}, Sem {s.semester})
                </option>
              ))}

            {viewMode === "faculty" &&
              config.faculty.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.shortName})
                </option>
              ))}

            {viewMode === "room" &&
              config.rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.type === "lab" ? r.labType || "Lab" : "Classroom"})
                </option>
              ))}
          </select>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportTimetableToPdf(config, timetable, viewMode === "section" ? selectedEntityId : undefined)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
            title="Export high-resolution PDF for printing"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>

          <button
            type="button"
            onClick={() => exportTimetableToExcel(config, timetable)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
            title="Export Excel workbook (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition"
            title="Print current view"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Timetable Header Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            {viewMode === "section" && `Section Timetable: ${secMap.get(selectedEntityId)?.name || ""}`}
            {viewMode === "faculty" && `Faculty Timetable: ${facMap.get(selectedEntityId)?.name || ""}`}
            {viewMode === "room" && `Room Occupancy: ${roomMap.get(selectedEntityId)?.name || ""}`}
          </h2>
          <p className="text-xs text-slate-500">
            {config.collegeConfig.collegeName} | Total Generated Slots: {timetable.length}
          </p>
        </div>
      </div>

      {/* MOBILE VIEW (< 768px): Dedicated Day-by-Day Cards */}
      <div className="block md:hidden space-y-3">
        {/* Day Selector Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-print">
          {workingDays.map((d) => (
            <button
              key={d}
              onClick={() => setMobileActiveDay(d)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap min-w-[50px] min-h-[44px] flex items-center justify-center transition border ${
                mobileActiveDay === d
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {DAY_SHORT[d] || `Day ${d}`}
            </button>
          ))}
        </div>

        {/* Day Schedule List */}
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
          {Array.from({ length: periodsPerDay }, (_, i) => i + 1).map((period) => {
            const slot = getFilteredSlot(mobileActiveDay, period);
            const sub = slot ? subMap.get(slot.subjectId) : null;
            const fac = slot ? facMap.get(slot.facultyId) : null;
            const room = slot ? roomMap.get(slot.roomId) : null;
            const hasBreak = breakMap.has(period);

            return (
              <React.Fragment key={period}>
                <div className="p-3.5 flex items-start gap-3">
                  <div className="w-16 flex-shrink-0 text-center">
                    <span className="font-mono text-xs font-bold text-slate-700 block">
                      Period {period}
                    </span>
                    <span className="text-[10px] text-slate-400 block tabular-nums">
                      {getPeriodTimeWindow(period)}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    {slot && sub ? (
                      <div
                        className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                          subColorMap.get(sub.id) || "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold font-mono text-xs">
                            {sub.code}
                          </span>
                          {sub.type === "practical" && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900">
                              <FlaskConical className="w-2.5 h-2.5" /> LAB
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-slate-900 truncate">
                          {sub.name}
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-slate-600 pt-0.5">
                          <span>
                            {viewMode === "faculty"
                              ? secMap.get(slot.sectionId)?.name
                              : fac?.shortName}
                          </span>
                          <span className="font-semibold text-slate-700">
                            {room?.name}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-2 text-xs text-slate-400 italic">
                        Free Period
                      </div>
                    )}
                  </div>
                </div>

                {hasBreak && (
                  <div className="bg-slate-100/80 px-4 py-2 flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 border-y border-slate-200">
                    <Coffee className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {breakMap.get(period)!.name} ({breakMap.get(period)!.duration}m)
                    </span>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* DESKTOP VIEW (>= 768px): Full Timetable Grid with Sticky Headers */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider">
                <th className="py-3 px-3 w-28 font-semibold text-center border-r border-slate-800">
                  Period / Time
                </th>
                {workingDays.map((d) => (
                  <th
                    key={d}
                    className="py-3 px-3 font-semibold text-center border-r border-slate-800 last:border-none min-w-[140px]"
                  >
                    {DAY_NAMES[d] || `Day ${d}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {Array.from({ length: periodsPerDay }, (_, i) => i + 1).map((period) => {
                const hasBreak = breakMap.has(period);
                const timeStr = getPeriodTimeWindow(period);

                return (
                  <React.Fragment key={period}>
                    <tr className="hover:bg-slate-50/30 transition">
                      {/* Period Header Column */}
                      <td className="py-3 px-2 bg-slate-50 font-medium text-center border-r border-slate-200">
                        <span className="font-bold text-slate-800 block text-xs">
                          Period {period}
                        </span>
                        <span className="text-[10px] text-slate-400 block tabular-nums mt-0.5">
                          {timeStr}
                        </span>
                      </td>

                      {/* Day Columns */}
                      {workingDays.map((day) => {
                        const slot = getFilteredSlot(day, period);
                        const sub = slot ? subMap.get(slot.subjectId) : null;
                        const fac = slot ? facMap.get(slot.facultyId) : null;
                        const room = slot ? roomMap.get(slot.roomId) : null;

                        return (
                          <td
                            key={day}
                            className="p-1.5 border-r border-slate-200 last:border-none align-top h-20"
                          >
                            {slot && sub ? (
                              <div
                                className={`h-full p-2 rounded-lg border text-xs flex flex-col justify-between shadow-xs transition hover:shadow-sm ${
                                  subColorMap.get(sub.id) || "bg-slate-50 border-slate-200"
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold font-mono text-[11px]">
                                      {sub.code}
                                    </span>
                                    {sub.type === "practical" && (
                                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1 rounded bg-emerald-200 text-emerald-900">
                                        <FlaskConical className="w-2.5 h-2.5" /> LAB
                                      </span>
                                    )}
                                  </div>
                                  <p className="font-medium text-slate-900 text-[11px] truncate mt-0.5 leading-tight">
                                    {sub.name}
                                  </p>
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-slate-600 font-medium pt-1 border-t border-slate-200/50 mt-1">
                                  <span>
                                    {viewMode === "faculty"
                                      ? secMap.get(slot.sectionId)?.name
                                      : fac?.shortName}
                                  </span>
                                  <span className="font-semibold text-slate-800">
                                    {room?.name}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center text-slate-300 text-xs italic select-none">
                                -
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Break Row Divider */}
                    {hasBreak && (
                      <tr className="bg-slate-100 text-slate-600 font-semibold border-y-2 border-slate-300">
                        <td
                          colSpan={workingDays.length + 1}
                          className="py-1.5 px-4 text-center tracking-wide text-xs"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Coffee className="w-3.5 h-3.5 text-slate-500" />
                            <span>
                              {breakMap.get(period)!.name.toUpperCase()} (
                              {breakMap.get(period)!.duration} MINUTES)
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
