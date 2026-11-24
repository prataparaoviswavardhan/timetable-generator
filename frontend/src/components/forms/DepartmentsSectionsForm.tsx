import React from "react";
import { Plus, Trash2, Building2, Users } from "lucide-react";
import type { Department, Section } from "../../domain/types.ts";

interface DepartmentsSectionsFormProps {
  departments: Department[];
  sections: Section[];
  onChangeDepartments: (depts: Department[]) => void;
  onChangeSections: (sections: Section[]) => void;
}

export const DepartmentsSectionsForm: React.FC<DepartmentsSectionsFormProps> = ({
  departments,
  sections,
  onChangeDepartments,
  onChangeSections,
}) => {
  const handleAddDepartment = () => {
    const nextNum = departments.length + 1;
    const newDept: Department = {
      id: `dept-${Date.now()}`,
      name: `Department ${nextNum}`,
      code: `D${nextNum}`,
    };
    onChangeDepartments([...departments, newDept]);
  };

  const handleUpdateDepartment = (id: string, partial: Partial<Department>) => {
    onChangeDepartments(
      departments.map((d) => (d.id === id ? { ...d, ...partial } : d))
    );
  };

  const handleRemoveDepartment = (id: string) => {
    if (departments.length === 1) {
      alert("At least one department must exist.");
      return;
    }
    onChangeDepartments(departments.filter((d) => d.id !== id));
    // Also remove orphaned sections
    onChangeSections(sections.filter((s) => s.departmentId !== id));
  };

  const handleAddSection = () => {
    const defaultDept = departments[0]?.id || "";
    const newSec: Section = {
      id: `sec-${Date.now()}`,
      departmentId: defaultDept,
      year: 1,
      semester: 1,
      name: `Section ${String.fromCharCode(65 + (sections.length % 26))}`,
    };
    onChangeSections([...sections, newSec]);
  };

  const handleUpdateSection = (id: string, partial: Partial<Section>) => {
    onChangeSections(
      sections.map((s) => (s.id === id ? { ...s, ...partial } : s))
    );
  };

  const handleRemoveSection = (id: string) => {
    if (sections.length === 1) {
      alert("At least one section must exist.");
      return;
    }
    onChangeSections(sections.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Departments Section */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Departments & Academic Branches
              </h2>
              <p className="text-xs text-slate-500">
                Configure dynamic departments (no hardcoded limits).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddDepartment}
            className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Department</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2 relative group hover:border-slate-300 transition"
            >
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={dept.code}
                  onChange={(e) =>
                    handleUpdateDepartment(dept.id, {
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-20 px-2 py-1 text-xs font-semibold bg-white border border-slate-300 rounded uppercase focus:ring-1 focus:ring-indigo-500"
                  placeholder="CODE"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveDepartment(dept.id)}
                  className="text-slate-400 hover:text-red-600 p-1 rounded transition"
                  title="Delete department"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <input
                type="text"
                value={dept.name}
                onChange={(e) =>
                  handleUpdateDepartment(dept.id, { name: e.target.value })
                }
                className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                placeholder="Department Full Name"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Sections Section */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Sections & Student Cohorts
              </h2>
              <p className="text-xs text-slate-500">
                Dynamic sections per department, year, and semester (e.g. CSE-A, ECE-B).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddSection}
            className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Section</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 px-3 font-medium">Section Name</th>
                <th className="py-2 px-3 font-medium">Department</th>
                <th className="py-2 px-3 font-medium">Year</th>
                <th className="py-2 px-3 font-medium">Semester</th>
                <th className="py-2 px-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sections.map((sec) => (
                <tr key={sec.id} className="hover:bg-slate-50/50">
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={sec.name}
                      onChange={(e) =>
                        handleUpdateSection(sec.id, { name: e.target.value })
                      }
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                      placeholder="e.g. CSE-3A"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={sec.departmentId}
                      onChange={(e) =>
                        handleUpdateSection(sec.id, {
                          departmentId: e.target.value,
                        })
                      }
                      className="px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.code} - {d.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={sec.year}
                      onChange={(e) =>
                        handleUpdateSection(sec.id, {
                          year: parseInt(e.target.value) || 1,
                        })
                      }
                      className="px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                    >
                      {[1, 2, 3, 4].map((y) => (
                        <option key={y} value={y}>
                          Year {y}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={sec.semester}
                      onChange={(e) =>
                        handleUpdateSection(sec.id, {
                          semester: parseInt(e.target.value) || 1,
                        })
                      }
                      className="px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                    >
                      {Array.from({ length: 8 }, (_, i) => i + 1).map((s) => (
                        <option key={s} value={s}>
                          Sem {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveSection(sec.id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition"
                      title="Delete section"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
