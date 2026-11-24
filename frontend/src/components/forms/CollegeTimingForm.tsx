import React from "react";
import { Plus, Trash2, Clock, Coffee } from "lucide-react";
import type { CollegeConfig, BreakSlot } from "../../domain/types.ts";

interface CollegeTimingFormProps {
  collegeConfig: CollegeConfig;
  breakSlots: BreakSlot[];
  onChangeConfig: (config: CollegeConfig) => void;
  onChangeBreaks: (breaks: BreakSlot[]) => void;
}

const ALL_DAYS = [
  { id: 1, label: "Monday", short: "Mon" },
  { id: 2, label: "Tuesday", short: "Tue" },
  { id: 3, label: "Wednesday", short: "Wed" },
  { id: 4, label: "Thursday", short: "Thu" },
  { id: 5, label: "Friday", short: "Fri" },
  { id: 6, label: "Saturday", short: "Sat" },
  { id: 7, label: "Sunday", short: "Sun" },
];

export const CollegeTimingForm: React.FC<CollegeTimingFormProps> = ({
  collegeConfig,
  breakSlots,
  onChangeConfig,
  onChangeBreaks,
}) => {
  const toggleWorkingDay = (dayId: number) => {
    let updated = [...collegeConfig.workingDays];
    if (updated.includes(dayId)) {
      if (updated.length === 1) {
        alert("At least one working day must be configured.");
        return;
      }
      updated = updated.filter((d) => d !== dayId);
    } else {
      updated = [...updated, dayId].sort((a, b) => a - b);
    }
    onChangeConfig({ ...collegeConfig, workingDays: updated });
  };

  const handleAddBreak = () => {
    const newBreak: BreakSlot = {
      id: `break-${Date.now()}`,
      name: "Short Break",
      periodAfter: Math.min(2, collegeConfig.periodsPerDay - 1),
      durationMinutes: 15,
      appliesToDays: [],
    };
    onChangeBreaks([...breakSlots, newBreak]);
  };

  const handleUpdateBreak = (id: string, partial: Partial<BreakSlot>) => {
    onChangeBreaks(
      breakSlots.map((b) => (b.id === id ? { ...b, ...partial } : b))
    );
  };

  const handleRemoveBreak = (id: string) => {
    onChangeBreaks(breakSlots.filter((b) => b.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* College Info & Working Days */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
        <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-semibold text-slate-900">
            College Timing & Calendar Rules
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              College / Institution Name *
            </label>
            <input
              type="text"
              value={collegeConfig.collegeName}
              onChange={(e) =>
                onChangeConfig({ ...collegeConfig, collegeName: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Apex Institute of Technology"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Instruction Periods per Day *
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={2}
                max={12}
                value={collegeConfig.periodsPerDay}
                onChange={(e) =>
                  onChangeConfig({
                    ...collegeConfig,
                    periodsPerDay: Math.max(2, Math.min(12, parseInt(e.target.value) || 7)),
                  })
                }
                className="w-24 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-500">
                (Default: 7 or 8 teaching slots)
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Day Start Time (24h format) *
            </label>
            <input
              type="time"
              value={collegeConfig.dayStartTime}
              onChange={(e) =>
                onChangeConfig({ ...collegeConfig, dayStartTime: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Standard Period Duration (minutes) *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={20}
                max={120}
                value={collegeConfig.periodDurationMinutes}
                onChange={(e) =>
                  onChangeConfig({
                    ...collegeConfig,
                    periodDurationMinutes: Math.max(20, parseInt(e.target.value) || 50),
                  })
                }
                className="w-24 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-500">minutes</span>
            </div>
          </div>
        </div>

        {/* Working Days Checkbox Grid */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-2">
            Active Working Days *
          </label>
          <div className="flex flex-wrap gap-2">
            {ALL_DAYS.map((day) => {
              const isActive = collegeConfig.workingDays.includes(day.id);
              return (
                <button
                  type="button"
                  key={day.id}
                  onClick={() => toggleWorkingDay(day.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                    isActive
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Break & Lunch Slots */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Coffee className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Breaks & Lunch Slots
              </h2>
              <p className="text-xs text-slate-500">
                Time windows when all classes pause. Multi-period practicals cannot span across breaks.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddBreak}
            className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Break</span>
          </button>
        </div>

        {breakSlots.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">
            No breaks defined. Classes will run continuously across all periods.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 px-3 font-medium">Break Name</th>
                  <th className="py-2 px-3 font-medium">Placement (After Period)</th>
                  <th className="py-2 px-3 font-medium">Duration</th>
                  <th className="py-2 px-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {breakSlots.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={b.name}
                        onChange={(e) =>
                          handleUpdateBreak(b.id, { name: e.target.value })
                        }
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                        placeholder="e.g. Lunch Break"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={b.periodAfter}
                        onChange={(e) =>
                          handleUpdateBreak(b.id, {
                            periodAfter: parseInt(e.target.value) || 1,
                          })
                        }
                        className="px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                      >
                        {Array.from(
                          { length: collegeConfig.periodsPerDay - 1 },
                          (_, i) => i + 1
                        ).map((p) => (
                          <option key={p} value={p}>
                            After Period {p}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={5}
                          max={120}
                          value={b.durationMinutes}
                          onChange={(e) =>
                            handleUpdateBreak(b.id, {
                              durationMinutes: parseInt(e.target.value) || 15,
                            })
                          }
                          className="w-16 px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-slate-400">min</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveBreak(b.id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition"
                        title="Delete break"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
