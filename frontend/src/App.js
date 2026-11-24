import React, { useState, useEffect } from "react";
import { Header } from "./components/Header.tsx";
import { TabNavigation } from "./components/TabNavigation.tsx";
import { ValidationSummary } from "./components/ValidationSummary.tsx";
import { GenerationControls } from "./components/GenerationControls.tsx";
import { FailureReport } from "./components/FailureReport.tsx";
import { TimetableContainer } from "./components/TimetableContainer.tsx";
import { CollegeTimingForm } from "./components/forms/CollegeTimingForm.tsx";
import { DepartmentsSectionsForm } from "./components/forms/DepartmentsSectionsForm.tsx";
import { SubjectsForm } from "./components/forms/SubjectsForm.tsx";
import { FacultyForm } from "./components/forms/FacultyForm.tsx";
import { RoomsForm } from "./components/forms/RoomsForm.tsx";
import { AssignmentsForm } from "./components/forms/AssignmentsForm.tsx";
import { WeightsForm } from "./components/forms/WeightsForm.tsx";
import { validateConfig } from "./domain/validation.ts";
import { DEFAULT_CONFIG, loadSavedConfig, saveConfigDraft, } from "./store/useTimetableStore.ts";
import { Calendar } from "lucide-react";
export function App() {
    const [config, setConfig] = useState(() => loadSavedConfig());
    const [mainTab, setMainTab] = useState("config");
    const [configSubtab, setConfigSubtab] = useState("timing");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationResponse, setGenerationResponse] = useState(null);
    // Live client-side domain validation
    const validationErrors = validateConfig(config);
    // Persist draft on changes
    useEffect(() => {
        saveConfigDraft(config);
    }, [config]);
    const handleGenerate = async () => {
        if (validationErrors.length > 0) {
            alert("Please resolve the pre-solve validation errors before generating.");
            return;
        }
        setIsGenerating(true);
        setGenerationResponse(null);
        try {
            const res = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config),
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || `Server returned HTTP ${res.status}: ${res.statusText}`);
            }
            const data = await res.json();
            setGenerationResponse(data);
            if (data.status === "OPTIMAL" || data.status === "FEASIBLE") {
                setMainTab("timetable");
            }
        }
        catch (err) {
            setGenerationResponse({
                status: "UNKNOWN",
                executionTimeMs: 0,
                timetable: [],
                errors: [
                    {
                        code: "SERVER_UNREACHABLE",
                        message: `Could not connect to the Python CP-SAT service (${err.message}). Ensure the solver service is running on http://127.0.0.1:8000.`,
                        entityType: "config",
                    },
                ],
                warnings: [
                    "Tip: Run 'bash scripts/start.sh' to launch both backend and frontend together.",
                ],
            });
        }
        finally {
            setIsGenerating(false);
        }
    };
    return (<div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <Header config={config} onLoadConfig={(newCfg) => {
            setConfig(newCfg);
            setGenerationResponse(null);
        }} onReset={() => {
            setConfig(DEFAULT_CONFIG);
            setGenerationResponse(null);
            setMainTab("config");
        }}/>

      {/* Sticky Action Controls */}
      <GenerationControls isGenerating={isGenerating} hasErrors={validationErrors.length > 0} response={generationResponse} onGenerate={handleGenerate} onViewTimetable={() => setMainTab("timetable")}/>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <TabNavigation mainTab={mainTab} configSubtab={configSubtab} hasTimetable={Boolean(generationResponse?.timetable && generationResponse.timetable.length > 0)} onSelectMainTab={setMainTab} onSelectConfigSubtab={setConfigSubtab}/>

        {/* CONFIGURATION TAB */}
        {mainTab === "config" && (<div className="mt-4 space-y-5">
            {/* Live Pre-Solve Validation Feedback */}
            <ValidationSummary errors={validationErrors}/>

            {/* Infeasibility or Solver Failure Report */}
            {generationResponse &&
                generationResponse.status !== "OPTIMAL" &&
                generationResponse.status !== "FEASIBLE" && (<FailureReport response={generationResponse} onAdjustConfig={() => setConfigSubtab("timing")}/>)}

            {/* Subtab Form Routing */}
            {configSubtab === "timing" && (<CollegeTimingForm collegeConfig={config.collegeConfig} breakSlots={config.breakSlots} onChangeConfig={(cc) => setConfig({ ...config, collegeConfig: cc })} onChangeBreaks={(bs) => setConfig({ ...config, breakSlots: bs })}/>)}

            {configSubtab === "departments" && (<DepartmentsSectionsForm departments={config.departments} sections={config.sections} onChangeDepartments={(depts) => setConfig({ ...config, departments: depts })} onChangeSections={(secs) => setConfig({ ...config, sections: secs })}/>)}

            {configSubtab === "subjects" && (<SubjectsForm subjects={config.subjects} departments={config.departments} onChangeSubjects={(subs) => setConfig({ ...config, subjects: subs })}/>)}

            {configSubtab === "faculty" && (<FacultyForm faculty={config.faculty} subjects={config.subjects} departments={config.departments} collegeConfig={config.collegeConfig} onChangeFaculty={(facs) => setConfig({ ...config, faculty: facs })}/>)}

            {configSubtab === "rooms" && (<RoomsForm rooms={config.rooms} onChangeRooms={(rms) => setConfig({ ...config, rooms: rms })}/>)}

            {configSubtab === "assignments" && (<AssignmentsForm assignments={config.assignments} sections={config.sections} subjects={config.subjects} faculty={config.faculty} rooms={config.rooms} onChangeAssignments={(as) => setConfig({ ...config, assignments: as })}/>)}

            {configSubtab === "weights" && (<WeightsForm weights={config.weights} timeLimitSeconds={config.timeLimitSeconds} onChangeWeights={(w) => setConfig({ ...config, weights: w })} onChangeTimeLimit={(t) => setConfig({ ...config, timeLimitSeconds: t })}/>)}
          </div>)}

        {/* TIMETABLE TAB */}
        {mainTab === "timetable" && (<div className="mt-4">
            {generationResponse?.timetable && generationResponse.timetable.length > 0 ? (<TimetableContainer config={config} timetable={generationResponse.timetable}/>) : (<div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm space-y-3">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                  <Calendar className="w-6 h-6"/>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  No Timetable Generated Yet
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                  Switch to the Configuration tab to review rules and constraints, then click
                  <strong> Generate Conflict-Free Timetable</strong>.
                </p>
                <div className="pt-2">
                  <button type="button" onClick={() => setMainTab("config")} className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition">
                    Open Configuration
                  </button>
                </div>
              </div>)}
          </div>)}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-400 no-print mt-auto">
        <p>Smart College Timetable Generator &copy; 2026. Built with React, TypeScript &amp; Google OR-Tools CP-SAT.</p>
      </footer>
    </div>);
}
export default App;
