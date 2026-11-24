import React from "react";
import { Plus, Trash2, BookOpen, FlaskConical } from "lucide-react";
export const SubjectsForm = ({ subjects, departments, onChangeSubjects, }) => {
    const handleAddSubject = (type) => {
        const nextIdx = subjects.length + 1;
        const defaultDept = departments[0]?.id || "";
        const newSub = {
            id: `sub-${Date.now()}`,
            name: type === "theory" ? `Course ${nextIdx}` : `Lab Session ${nextIdx}`,
            code: type === "theory" ? `CS${300 + nextIdx}` : `CS${300 + nextIdx}P`,
            departmentId: defaultDept,
            type,
            weeklyPeriods: type === "theory" ? 4 : 3,
            consecutivePeriods: type === "theory" ? 1 : 3,
            requiredLabType: type === "practical" ? "computing-lab" : undefined,
        };
        onChangeSubjects([...subjects, newSub]);
    };
    const handleUpdateSubject = (id, partial) => {
        onChangeSubjects(subjects.map((s) => (s.id === id ? { ...s, ...partial } : s)));
    };
    const handleRemoveSubject = (id) => {
        if (subjects.length === 1) {
            alert("At least one subject must exist.");
            return;
        }
        onChangeSubjects(subjects.filter((s) => s.id !== id));
    };
    return (<div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600"/>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Subjects (Theory & Practical Labs)
            </h2>
            <p className="text-xs text-slate-500">
              Define required weekly hours and consecutive block requirements for laboratory practicals.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => handleAddSubject("theory")} className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition">
            <Plus className="w-3.5 h-3.5"/>
            <span>Add Theory</span>
          </button>
          <button type="button" onClick={() => handleAddSubject("practical")} className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition">
            <FlaskConical className="w-3.5 h-3.5"/>
            <span>Add Practical Lab</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 px-3 font-medium">Code</th>
              <th className="py-2 px-3 font-medium">Subject Name</th>
              <th className="py-2 px-3 font-medium">Department</th>
              <th className="py-2 px-3 font-medium">Type</th>
              <th className="py-2 px-3 font-medium">Weekly Periods</th>
              <th className="py-2 px-3 font-medium">Consecutive Block</th>
              <th className="py-2 px-3 font-medium">Required Lab Type</th>
              <th className="py-2 px-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {subjects.map((sub) => (<tr key={sub.id} className="hover:bg-slate-50/50">
                <td className="py-2 px-3 w-28">
                  <input type="text" value={sub.code} onChange={(e) => handleUpdateSubject(sub.id, {
                code: e.target.value.toUpperCase(),
            })} className="w-full px-2 py-1 font-mono font-medium border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500" placeholder="CODE"/>
                </td>

                <td className="py-2 px-3">
                  <input type="text" value={sub.name} onChange={(e) => handleUpdateSubject(sub.id, { name: e.target.value })} className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-medium focus:ring-1 focus:ring-indigo-500" placeholder="Subject Name"/>
                </td>

                <td className="py-2 px-3 w-40">
                  <select value={sub.departmentId} onChange={(e) => handleUpdateSubject(sub.id, {
                departmentId: e.target.value,
            })} className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500">
                    {departments.map((d) => (<option key={d.id} value={d.id}>
                        {d.code} - {d.name}
                      </option>))}
                  </select>
                </td>

                <td className="py-2 px-3 w-28">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${sub.type === "practical"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-blue-100 text-blue-800"}`}>
                    {sub.type === "practical" ? "Practical" : "Theory"}
                  </span>
                </td>

                <td className="py-2 px-3 w-24">
                  <input type="number" min={1} max={20} value={sub.weeklyPeriods} onChange={(e) => handleUpdateSubject(sub.id, {
                weeklyPeriods: Math.max(1, parseInt(e.target.value) || 1),
            })} className="w-16 px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"/>
                </td>

                <td className="py-2 px-3 w-28">
                  {sub.type === "practical" ? (<div className="flex items-center gap-1">
                      <input type="number" min={2} max={6} value={sub.consecutivePeriods} onChange={(e) => handleUpdateSubject(sub.id, {
                    consecutivePeriods: Math.max(2, parseInt(e.target.value) || 2),
                })} className="w-14 px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"/>
                      <span className="text-[11px] text-slate-400">hrs</span>
                    </div>) : (<span className="text-slate-400 text-xs">1 period</span>)}
                </td>

                <td className="py-2 px-3 w-36">
                  {sub.type === "practical" ? (<input type="text" value={sub.requiredLabType || ""} onChange={(e) => handleUpdateSubject(sub.id, {
                    requiredLabType: e.target.value,
                })} className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500" placeholder="e.g. computing-lab"/>) : (<span className="text-slate-400 text-xs">Standard Room</span>)}
                </td>

                <td className="py-2 px-3 text-right">
                  <button type="button" onClick={() => handleRemoveSubject(sub.id)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition" title="Delete subject">
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </td>
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>);
};
