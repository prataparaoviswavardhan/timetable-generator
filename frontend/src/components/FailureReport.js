import React from "react";
import { AlertOctagon, Lightbulb, Sliders } from "lucide-react";
export const FailureReport = ({ response, onAdjustConfig, }) => {
    const isPreCheck = response.status === "PRE_CHECK_FAILED";
    const isInfeasible = response.status === "INFEASIBLE";
    const isTimeout = response.status === "UNKNOWN";
    return (<div className="bg-white rounded-xl border border-rose-200 shadow-sm overflow-hidden my-6">
      <div className="bg-rose-50 border-b border-rose-200 p-4 sm:p-5 flex items-start gap-3">
        <div className="p-2 bg-rose-100 rounded-lg text-rose-700 flex-shrink-0 mt-0.5">
          <AlertOctagon className="w-6 h-6"/>
        </div>
        <div>
          <h3 className="text-base font-bold text-rose-950">
            {isPreCheck && "Pre-Solve Feasibility Validation Failed"}
            {isInfeasible && "Timetable Generation Infeasible (Hard Constraint Conflict)"}
            {isTimeout && "Solver Time Limit Exceeded Without Feasible Solution"}
          </h3>
          <p className="text-xs sm:text-sm text-rose-800 mt-1">
            {isPreCheck &&
            "The configuration contains structural errors or capacity impossibilities that prevent scheduling."}
            {isInfeasible &&
            "The constraint satisfaction engine proved that no timetable can exist that satisfies 100% of the active hard constraints simultaneously."}
            {isTimeout &&
            "The engine could not find a complete schedule within the allotted time limit."}
          </p>
        </div>
      </div>

      <div className="p-5 space-y-5 text-xs sm:text-sm">
        {/* Error Details */}
        {response.errors.length > 0 && (<div>
            <h4 className="font-semibold text-slate-900 mb-2">Detected Conflict Items:</h4>
            <div className="space-y-2">
              {response.errors.map((err, idx) => (<div key={idx} className="p-3 rounded-lg border border-rose-100 bg-rose-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="inline-block px-1.5 py-0.5 bg-rose-200 text-rose-900 rounded font-mono text-[10px] uppercase font-semibold mr-2">
                      {err.code}
                    </span>
                    <span className="text-slate-800">{err.message}</span>
                  </div>
                  {err.entityType && (<span className="text-[11px] text-slate-400 capitalize self-start sm:self-auto">
                      Entity: {err.entityType}
                    </span>)}
                </div>))}
            </div>
          </div>)}

        {/* Actionable Suggestions */}
        <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs sm:text-sm">
            <Lightbulb className="w-4 h-4 text-amber-600"/>
            <span>Recommended Actions & Remediation:</span>
          </div>

          <ul className="list-disc list-inside text-xs text-amber-800 space-y-1 pl-1">
            {isPreCheck && (<>
                <li>Review the specific entities listed above and adjust period counts or references.</li>
                <li>Ensure practical subjects do not exceed available continuous hours between breaks.</li>
                <li>Check faculty qualified subjects and verify all assignments map to qualified teachers.</li>
              </>)}

            {isInfeasible && (<>
                <li>
                  <strong>Relax Faculty Unavailable Slots:</strong> Check if a shared faculty member is blocked during times when multiple sections must meet.
                </li>
                <li>
                  <strong>Increase Available Rooms/Labs:</strong> If multiple practical lab sessions require the same lab type, ensure sufficient labs or days are available.
                </li>
                <li>
                  <strong>Balance Workload:</strong> Check if faculty daily or weekly caps are too tight relative to the total required teaching hours.
                </li>
              </>)}

            {isTimeout && (<>
                <li>Increase the solver time limit from the Optimization Settings tab (e.g. from 30s to 60s or 120s).</li>
                <li>Simplify soft constraint weights to reduce search branch complexity.</li>
              </>)}
          </ul>
        </div>

        {/* CTA */}
        <div className="pt-2 flex items-center justify-end">
          <button type="button" onClick={onAdjustConfig} className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition">
            <Sliders className="w-3.5 h-3.5"/>
            <span>Adjust Configuration & Re-run</span>
          </button>
        </div>
      </div>
    </div>);
};
