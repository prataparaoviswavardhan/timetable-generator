import React from "react";
import { Play, Loader2, Sparkles, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import type { GenerateResponse } from "../domain/types.ts";

interface GenerationControlsProps {
  isGenerating: boolean;
  hasErrors: boolean;
  response: GenerateResponse | null;
  onGenerate: () => void;
  onViewTimetable: () => void;
}

export const GenerationControls: React.FC<GenerationControlsProps> = ({
  isGenerating,
  hasErrors,
  response,
  onGenerate,
  onViewTimetable,
}) => {
  const getStatusBadge = () => {
    if (!response) return null;

    switch (response.status) {
      case "OPTIMAL":
      case "FEASIBLE":
        return (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>{response.status === "OPTIMAL" ? "Optimal Timetable" : "Feasible Timetable"}</span>
            </span>
            <span className="text-xs text-slate-500 font-mono">
              ({(response.executionTimeMs / 1000).toFixed(2)}s)
            </span>
          </div>
        );

      case "PRE_CHECK_FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Pre-Check Failed</span>
          </span>
        );

      case "INFEASIBLE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>Mathematically Infeasible</span>
          </span>
        );

      case "UNKNOWN":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-600" />
            <span>Time Limit Exceeded</span>
          </span>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white border-y border-slate-200 py-3 px-4 sm:px-6 shadow-sm sticky top-[57px] z-30 no-print">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Status / Info */}
        <div className="flex items-center gap-3">
          {getStatusBadge()}
          {hasErrors && !response && (
            <span className="text-xs text-amber-600 font-medium">
              Resolve configuration issues to enable generation
            </span>
          )}
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-3">
          {response && (response.status === "OPTIMAL" || response.status === "FEASIBLE") && (
            <button
              type="button"
              onClick={onViewTimetable}
              className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition"
            >
              View Generated Timetable ({response.timetable.length} slots)
            </button>
          )}

          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating || hasErrors}
            className={`inline-flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition ${
              isGenerating
                ? "bg-indigo-400 text-white cursor-wait"
                : hasErrors
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20"
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running CP-SAT Engine...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Generate Conflict-Free Timetable</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
