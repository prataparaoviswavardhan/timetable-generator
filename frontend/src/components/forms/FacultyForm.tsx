import React, { useState } from "react";
import { Plus, Trash2, UserCheck, CalendarX2, Check, X } from "lucide-react";
import type { Faculty, Subject, Department, CollegeConfig } from "../../domain/types.ts";

interface FacultyFormProps {
  faculty: Faculty[];
  subjects: Subject[];
  departments: Department[];
  collegeConfig: CollegeConfig;
  onChangeFaculty: (faculty: Faculty[]) => void;
}

const DAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const FacultyForm: React.FC<FacultyFormProps> = ({
  faculty,
  subjects,
  departments,
  collegeConfig,
  onChangeFaculty,
}) => {
  const [selectedFacId, setSelectedFacId] = useState<string>(
    faculty[0]?.id || ""
  );

  const activeFac = faculty.find((f) => f.id === selectedFacId) || faculty[0];

  const handleAddFaculty = () => {
    const nextIdx = faculty.length + 1;
    const defaultDept = departments[0]?.id || "";
    const newFac: Faculty = {
      id: `fac-${Date.now()}`,
      name: `Faculty Member ${nextIdx}`,
      shortName: `F${nextIdx}`,
      departmentId: defaultDept,
      qualifiedSubjectIds: subjects.slice(0, 2).map((s) => s.id),
      unavailableSlots: [],
      maxPeriodsPerDay: 4,
      maxPeriodsPerWeek: 18,
    };
    const updated = [...faculty, newFac];
    onChangeFaculty(updated);
    setSelectedFacId(newFac.id);
  };

  const handleUpdateFaculty = (id: string, partial: Partial<Faculty>) => {
    onChangeFaculty(
      faculty.map((f) => (f.id === id ? { ...f, ...partial } : f))
    );
  };

  const handleRemoveFaculty = (id: string) => {
    if (faculty.length === 1) {
      alert("At least one faculty member must exist.");
      return;
    }
    const updated = faculty.filter((f) => f.id !== id);
    onChangeFaculty(updated);
    if (selectedFacId === id) {
      setSelectedFacId(updated[0]?.id || "");
    }
  };

  const toggleQualifiedSubject = (facId: string, subId: string) => {
    const fac = faculty.find((f) => f.id === facId);
    if (!fac) return;
    const isQualified = fac.qualifiedSubjectIds.includes(subId);
    const updatedIds = isQualified
      ? fac.qualifiedSubjectIds.filter((id) => id !== subId)
      : [...fac.qualifiedSubjectIds, subId];
    handleUpdateFaculty(facId, { qualifiedSubjectIds: updatedIds });
  };

  const toggleSlotAvailability = (facId: string, day: number, period: number) => {
    const fac = faculty.find((f) => f.id === facId);
    if (!fac) return;
    const isBlocked = fac.unavailableSlots.some(
      (u) => u.day === day && u.period === period
    );
    const updatedSlots = isBlocked
      ? fac.unavailableSlots.filter(
          (u) => !(u.day === day && u.period === period)
        )
      : [...fac.unavailableSlots, { day, period }];
    handleUpdateFaculty(facId, { unavailableSlots: updatedSlots });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Faculty Members & Workload Caps
              </h2>
              <p className="text-xs text-slate-500">
                Manage teaching staff, qualifications, daily/weekly limits, and availability windows.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddFaculty}
            className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Faculty</span>
          </button>
        </div>

        {/* Master-Detail Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Faculty List Sidebar */}
          <div className="space-y-2 border border-slate-200 rounded-lg p-2 max-h-[500px] overflow-y-auto bg-slate-50/50">
            {faculty.map((fac) => {
              const isSelected = fac.id === activeFac?.id;
              return (
                <div
                  key={fac.id}
                  onClick={() => setSelectedFacId(fac.id)}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between gap-2 ${
                    isSelected
                      ? "bg-white border-indigo-500 ring-1 ring-indigo-500 shadow-sm text-slate-900 font-medium"
                      : "bg-white/80 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="truncate">
                    <span className="font-semibold">{fac.shortName}</span> -{" "}
                    <span>{fac.name}</span>
                    <div className="text-[10px] text-slate-400">
                      {departments.find((d) => d.id === fac.departmentId)?.code} |{" "}
                      {fac.qualifiedSubjectIds.length} qualified subjects
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFaculty(fac.id);
                    }}
                    className="text-slate-400 hover:text-red-600 p-1 rounded"
                    title="Delete faculty"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Active Faculty Details & Availability Editor */}
          {activeFac && (
            <div className="md:col-span-2 space-y-4 bg-white p-4 rounded-lg border border-slate-200">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={activeFac.name}
                    onChange={(e) =>
                      handleUpdateFaculty(activeFac.id, {
                        name: e.target.value,
                      })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Short Display Name *
                  </label>
                  <input
                    type="text"
                    value={activeFac.shortName}
                    onChange={(e) =>
                      handleUpdateFaculty(activeFac.id, {
                        shortName: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full px-2.5 py-1.5 font-mono font-medium border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Department *
                  </label>
                  <select
                    value={activeFac.departmentId}
                    onChange={(e) =>
                      handleUpdateFaculty(activeFac.id, {
                        departmentId: e.target.value,
                      })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Max Periods / Day (optional)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={collegeConfig.periodsPerDay}
                    value={activeFac.maxPeriodsPerDay || ""}
                    onChange={(e) =>
                      handleUpdateFaculty(activeFac.id, {
                        maxPeriodsPerDay: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                    placeholder="None"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Max Periods / Week (optional)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={collegeConfig.workingDays.length * collegeConfig.periodsPerDay}
                    value={activeFac.maxPeriodsPerWeek || ""}
                    onChange={(e) =>
                      handleUpdateFaculty(activeFac.id, {
                        maxPeriodsPerWeek: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                    placeholder="None"
                  />
                </div>
              </div>

              {/* Qualified Subjects Multi-Select */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-800 mb-1.5">
                  Qualified Subjects ({activeFac.qualifiedSubjectIds.length} assigned)
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  {subjects.map((sub) => {
                    const isChecked = activeFac.qualifiedSubjectIds.includes(sub.id);
                    return (
                      <button
                        type="button"
                        key={sub.id}
                        onClick={() => toggleQualifiedSubject(activeFac.id, sub.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs transition border ${
                          isChecked
                            ? "bg-indigo-600 text-white border-indigo-600 font-medium"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3" />}
                        <span>{sub.code} - {sub.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visual Availability Matrix */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-800">
                      Weekly Availability Grid (Click slot to block/unblock)
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Red slots = faculty unavailable. Green slots = available for classes.
                    </span>
                  </div>

                  {activeFac.unavailableSlots.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateFaculty(activeFac.id, { unavailableSlots: [] })
                      }
                      className="text-[11px] text-indigo-600 hover:underline"
                    >
                      Clear all blocked slots
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                  <table className="w-full text-center border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 text-[11px]">
                        <th className="py-1 px-2 font-medium w-16">Period</th>
                        {collegeConfig.workingDays.map((d) => (
                          <th key={d} className="py-1 px-2 font-medium">
                            {DAY_NAMES[d] || `Day ${d}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(
                        { length: collegeConfig.periodsPerDay },
                        (_, i) => i + 1
                      ).map((p) => (
                        <tr key={p} className="border-b border-slate-100 last:border-none">
                          <td className="py-1 px-2 font-mono text-[11px] text-slate-400 bg-slate-50">
                            P{p}
                          </td>
                          {collegeConfig.workingDays.map((d) => {
                            const isBlocked = activeFac.unavailableSlots.some(
                              (u) => u.day === d && u.period === p
                            );
                            return (
                              <td
                                key={d}
                                onClick={() =>
                                  toggleSlotAvailability(activeFac.id, d, p)
                                }
                                className={`py-2 px-1 cursor-pointer transition select-none ${
                                  isBlocked
                                    ? "bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold"
                                    : "bg-emerald-50/50 hover:bg-emerald-100/70 text-emerald-800"
                                }`}
                                title={
                                  isBlocked
                                    ? `Unavailable on ${DAY_NAMES[d]}, Period ${p} (Click to make available)`
                                    : `Available on ${DAY_NAMES[d]}, Period ${p} (Click to block)`
                                }
                              >
                                {isBlocked ? (
                                  <div className="flex items-center justify-center">
                                    <X className="w-3.5 h-3.5 text-rose-600" />
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-emerald-700/60 font-mono">
                                    Free
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
