import React from "react";
import { Plus, Trash2, Link2, AlertCircle } from "lucide-react";
import type {
  SectionSubjectAssignment,
  Section,
  Subject,
  Faculty,
  Room,
} from "../../domain/types.ts";

interface AssignmentsFormProps {
  assignments: SectionSubjectAssignment[];
  sections: Section[];
  subjects: Subject[];
  faculty: Faculty[];
  rooms: Room[];
  onChangeAssignments: (assignments: SectionSubjectAssignment[]) => void;
}

export const AssignmentsForm: React.FC<AssignmentsFormProps> = ({
  assignments,
  sections,
  subjects,
  faculty,
  rooms,
  onChangeAssignments,
}) => {
  const handleAddAssignment = () => {
    const defaultSec = sections[0]?.id || "";
    const defaultSub = subjects[0]?.id || "";
    // Find faculty qualified for defaultSub if possible
    const qualifiedFac = faculty.filter((f) =>
      f.qualifiedSubjectIds.includes(defaultSub)
    );
    const defaultFacId = qualifiedFac[0]?.id || faculty[0]?.id || "";

    const newAssign: SectionSubjectAssignment = {
      id: `as-${Date.now()}`,
      sectionId: defaultSec,
      subjectId: defaultSub,
      facultyIds: [defaultFacId],
    };
    onChangeAssignments([...assignments, newAssign]);
  };

  const handleUpdateAssignment = (
    id: string,
    partial: Partial<SectionSubjectAssignment>
  ) => {
    onChangeAssignments(
      assignments.map((a) => (a.id === id ? { ...a, ...partial } : a))
    );
  };

  const handleRemoveAssignment = (id: string) => {
    if (assignments.length === 1) {
      alert("At least one assignment must exist.");
      return;
    }
    onChangeAssignments(assignments.filter((a) => a.id !== id));
  };

  const toggleAssignmentFaculty = (assignId: string, facId: string) => {
    const assign = assignments.find((a) => a.id === assignId);
    if (!assign) return;
    let updatedFacIds = [...assign.facultyIds];
    if (updatedFacIds.includes(facId)) {
      if (updatedFacIds.length === 1) {
        alert("At least one faculty member must be assigned.");
        return;
      }
      updatedFacIds = updatedFacIds.filter((f) => f !== facId);
    } else {
      updatedFacIds.push(facId);
    }
    handleUpdateAssignment(assignId, { facultyIds: updatedFacIds });
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-indigo-600" />
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Section-Subject-Faculty Assignments
            </h2>
            <p className="text-xs text-slate-500">
              Assign courses to sections and map qualified teaching faculty and preferred rooms.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddAssignment}
          className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Assignment</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 px-3 font-medium">Target Section</th>
              <th className="py-2 px-3 font-medium">Subject</th>
              <th className="py-2 px-3 font-medium">Assigned Faculty</th>
              <th className="py-2 px-3 font-medium">Preferred Room (Optional)</th>
              <th className="py-2 px-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {assignments.map((assign) => {
              const sub = subjects.find((s) => s.id === assign.subjectId);
              const assignedFacList = faculty.filter((f) =>
                assign.facultyIds.includes(f.id)
              );

              // Check if any assigned faculty is not qualified
              const unqualifiedFaculty = assignedFacList.filter(
                (f) => sub && !f.qualifiedSubjectIds.includes(sub.id)
              );

              return (
                <tr key={assign.id} className="hover:bg-slate-50/50">
                  <td className="py-2 px-3 w-40">
                    <select
                      value={assign.sectionId}
                      onChange={(e) =>
                        handleUpdateAssignment(assign.id, {
                          sectionId: e.target.value,
                        })
                      }
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                    >
                      {sections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.name} (Sem {sec.semester})
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="py-2 px-3 w-52">
                    <select
                      value={assign.subjectId}
                      onChange={(e) =>
                        handleUpdateAssignment(assign.id, {
                          subjectId: e.target.value,
                        })
                      }
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code} - {s.name} ({s.weeklyPeriods}h, {s.type})
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="py-2 px-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap gap-1">
                        {faculty.map((fac) => {
                          const isAssigned = assign.facultyIds.includes(fac.id);
                          const isQualified = sub && fac.qualifiedSubjectIds.includes(sub.id);

                          return (
                            <button
                              type="button"
                              key={fac.id}
                              onClick={() => toggleAssignmentFaculty(assign.id, fac.id)}
                              className={`px-2 py-0.5 rounded text-[11px] font-medium border transition ${
                                isAssigned
                                  ? isQualified
                                    ? "bg-indigo-600 text-white border-indigo-600"
                                    : "bg-amber-500 text-white border-amber-600"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                              }`}
                              title={
                                !isQualified
                                  ? `${fac.name} is not marked qualified for ${sub?.name}`
                                  : undefined
                              }
                            >
                              {fac.shortName}
                            </button>
                          );
                        })}
                      </div>

                      {unqualifiedFaculty.length > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-amber-700 font-medium">
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          <span>
                            {unqualifiedFaculty.map((f) => f.shortName).join(", ")} not qualified for this subject
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="py-2 px-3 w-48">
                    <select
                      value={assign.preferredRoomId || ""}
                      onChange={(e) =>
                        handleUpdateAssignment(assign.id, {
                          preferredRoomId: e.target.value || undefined,
                        })
                      }
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">Any Suitable Room/Lab</option>
                      {rooms
                        .filter((r) => sub?.type !== "practical" || r.type === "lab")
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.type === "lab" ? r.labType || "Lab" : "Classroom"})
                          </option>
                        ))}
                    </select>
                  </td>

                  <td className="py-2 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveAssignment(assign.id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition"
                      title="Delete assignment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
