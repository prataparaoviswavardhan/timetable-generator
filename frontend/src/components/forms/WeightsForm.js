import React from "react";
import { Sliders, Timer } from "lucide-react";
export const WeightsForm = ({ weights = {}, timeLimitSeconds = 30, onChangeWeights, onChangeTimeLimit, }) => {
    const current = {
        spreadSubjectsAcrossWeek: weights.spreadSubjectsAcrossWeek ?? 10,
        maxConsecutiveTheory: weights.maxConsecutiveTheory ?? 2,
        consecutiveTheoryPenalty: weights.consecutiveTheoryPenalty ?? 5,
        minimizeFacultyGaps: weights.minimizeFacultyGaps ?? 8,
        balanceFacultyWorkload: weights.balanceFacultyWorkload ?? 4,
        distributePracticals: weights.distributePracticals ?? 10,
        diverseFirstPeriods: weights.diverseFirstPeriods ?? 2,
    };
    return (<div className="space-y-6">
      {/* Soft Optimization Preferences */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
        <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-indigo-600"/>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Soft Optimization & Quality Weights
            </h2>
            <p className="text-xs text-slate-500">
              Hard constraints are strictly enforced first. These weights guide the engine to optimize schedule quality.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Spread subjects */}
          <div className="space-y-1.5 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-800">
                Spread Theory Across Week
              </span>
              <span className="font-mono font-bold text-indigo-600">
                {current.spreadSubjectsAcrossWeek}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Rewards spreading a subject across distinct days rather than stacking multiple periods on one day.
            </p>
            <input type="range" min={0} max={20} value={current.spreadSubjectsAcrossWeek} onChange={(e) => onChangeWeights({
            ...current,
            spreadSubjectsAcrossWeek: parseInt(e.target.value) || 0,
        })} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"/>
          </div>

          {/* Minimize gaps */}
          <div className="space-y-1.5 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-800">
                Minimize Faculty Idle Gaps
              </span>
              <span className="font-mono font-bold text-indigo-600">
                {current.minimizeFacultyGaps}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Penalizes empty periods between a faculty member's first and last class on any given day.
            </p>
            <input type="range" min={0} max={20} value={current.minimizeFacultyGaps} onChange={(e) => onChangeWeights({
            ...current,
            minimizeFacultyGaps: parseInt(e.target.value) || 0,
        })} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"/>
          </div>

          {/* Consecutive theory limit */}
          <div className="space-y-1.5 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-800">
                Max Consecutive Theory Periods
              </span>
              <span className="font-mono font-bold text-indigo-600">
                {current.maxConsecutiveTheory} periods
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Maximum contiguous lecture hours for students before penalty applies.
            </p>
            <input type="range" min={1} max={4} value={current.maxConsecutiveTheory} onChange={(e) => onChangeWeights({
            ...current,
            maxConsecutiveTheory: parseInt(e.target.value) || 2,
        })} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"/>
          </div>

          {/* Diverse first periods */}
          <div className="space-y-1.5 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-800">
                Diverse First Period Subjects
              </span>
              <span className="font-mono font-bold text-indigo-600">
                {current.diverseFirstPeriods}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Encourages sections to not always start with the same subject every morning.
            </p>
            <input type="range" min={0} max={10} value={current.diverseFirstPeriods} onChange={(e) => onChangeWeights({
            ...current,
            diverseFirstPeriods: parseInt(e.target.value) || 0,
        })} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"/>
          </div>
        </div>
      </div>

      {/* Solver Limits */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
          <Timer className="w-5 h-5 text-indigo-600"/>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Solver Time Boundary
            </h2>
            <p className="text-xs text-slate-500">
              Set the maximum execution time before returning the best discovered timetable.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <label className="font-medium text-slate-700">Time Limit:</label>
          <div className="flex items-center gap-2">
            {[15, 30, 60, 120].map((sec) => (<button key={sec} type="button" onClick={() => onChangeTimeLimit(sec)} className={`px-3 py-1.5 rounded-lg font-medium transition border ${timeLimitSeconds === sec
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"}`}>
                {sec}s
              </button>))}
          </div>
          <span className="text-slate-400">
            (Current: {timeLimitSeconds} seconds)
          </span>
        </div>
      </div>
    </div>);
};
