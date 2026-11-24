import React, { useRef } from "react";
import { CalendarDays, Download, Upload, RotateCcw, } from "lucide-react";
import { DEFAULT_CONFIG, MEDIUM_COLLEGE_PRESET } from "../store/useTimetableStore.ts";
export const Header = ({ config, onLoadConfig, onReset }) => {
    const fileInputRef = useRef(null);
    const handleExportJson = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `college_config_${config.collegeConfig.collegeName.replace(/\s+/g, "_")}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    };
    const handleImportJson = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target?.result);
                if (parsed.collegeConfig && parsed.sections && parsed.subjects) {
                    onLoadConfig(parsed);
                    alert("Configuration successfully imported!");
                }
                else {
                    alert("Invalid timetable configuration JSON structure.");
                }
            }
            catch (err) {
                alert("Failed to parse JSON file.");
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current)
            fileInputRef.current.value = "";
    };
    return (<header className="bg-slate-900 text-white border-b border-slate-800 no-print sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-sm">
            <CalendarDays className="w-5 h-5"/>
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-semibold tracking-tight leading-tight">
              Smart College Timetable Generator
            </h1>
            <p className="text-xs text-slate-400">
              One-Time Optimization Engine Powered by OR-Tools CP-SAT
            </p>
          </div>
        </div>

        {/* Preset & File Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Presets */}
          <div className="relative inline-block text-left">
            <select aria-label="Load demo preset" className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium py-1.5 px-3 rounded-md border border-slate-700 cursor-pointer transition focus:outline-none focus:ring-1 focus:ring-indigo-500" onChange={(e) => {
            if (e.target.value === "minimal")
                onLoadConfig(DEFAULT_CONFIG);
            if (e.target.value === "medium")
                onLoadConfig(MEDIUM_COLLEGE_PRESET);
            e.target.value = "";
        }} defaultValue="">
              <option value="" disabled>Load Demo Preset...</option>
              <option value="minimal">1-Section Quick Demo</option>
              <option value="medium">12-Section 4-Dept College</option>
            </select>
          </div>

          {/* Import JSON */}
          <input type="file" ref={fileInputRef} onChange={handleImportJson} accept=".json,application/json" className="hidden"/>
          <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium py-1.5 px-3 rounded-md border border-slate-700 transition" title="Import configuration JSON">
            <Upload className="w-3.5 h-3.5"/>
            <span className="hidden sm:inline">Import JSON</span>
          </button>

          {/* Export JSON */}
          <button onClick={handleExportJson} className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium py-1.5 px-3 rounded-md border border-slate-700 transition" title="Export configuration JSON">
            <Download className="w-3.5 h-3.5"/>
            <span className="hidden sm:inline">Export JSON</span>
          </button>

          {/* Reset */}
          <button onClick={() => {
            if (confirm("Reset current draft to default preset?")) {
                onReset();
            }
        }} className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-red-950 text-slate-300 hover:text-red-300 text-xs font-medium py-1.5 px-2.5 rounded-md border border-slate-700 hover:border-red-800 transition" title="Reset Draft">
            <RotateCcw className="w-3.5 h-3.5"/>
          </button>
        </div>
      </div>
    </header>);
};
