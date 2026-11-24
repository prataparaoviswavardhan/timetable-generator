import React from "react";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
export const ValidationSummary = ({ errors }) => {
    const [isExpanded, setIsExpanded] = React.useState(false);
    if (errors.length === 0) {
        return (<div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-lg flex items-center justify-between text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0"/>
          <span>
            <strong>Pre-Solve Integrity Pass:</strong> All entity references, period counts, availability, and break constraints are mathematically sound.
          </span>
        </div>
      </div>);
    }
    return (<div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-lg text-xs sm:text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"/>
          <div>
            <span className="font-semibold text-amber-950">
              {errors.length} Pre-Solve Issue{errors.length > 1 ? "s" : ""} Detected:
            </span>
            <p className="text-amber-800 text-xs mt-0.5">
              These structural conflicts must be resolved before the scheduling engine can run.
            </p>
          </div>
        </div>

        <button onClick={() => setIsExpanded(!isExpanded)} className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 hover:text-amber-950 bg-amber-100/60 px-2.5 py-1 rounded transition">
          <span>{isExpanded ? "Hide Details" : "View Issues"}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5"/> : <ChevronDown className="w-3.5 h-3.5"/>}
        </button>
      </div>

      {isExpanded && (<ul className="mt-3 divide-y divide-amber-200/60 border-t border-amber-200 pt-2 space-y-1.5 max-h-60 overflow-y-auto">
          {errors.map((err, idx) => (<li key={idx} className="pt-1.5 flex items-start gap-2 text-xs">
              <span className="px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded font-mono text-[10px] uppercase">
                {err.code}
              </span>
              <span className="text-amber-900">{err.message}</span>
            </li>))}
        </ul>)}
    </div>);
};
