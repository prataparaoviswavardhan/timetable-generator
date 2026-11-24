import React from "react";
import {
  Calendar,
  Building2,
  BookOpen,
  UserCheck,
  DoorOpen,
  Link2,
  Sliders,
  Table,
} from "lucide-react";

export type ConfigSubtab =
  | "timing"
  | "departments"
  | "subjects"
  | "faculty"
  | "rooms"
  | "assignments"
  | "weights";

interface TabNavigationProps {
  mainTab: "config" | "timetable";
  configSubtab: ConfigSubtab;
  hasTimetable: boolean;
  onSelectMainTab: (tab: "config" | "timetable") => void;
  onSelectConfigSubtab: (subtab: ConfigSubtab) => void;
}

const SUBTABS: { id: ConfigSubtab; label: string; icon: React.ElementType }[] = [
  { id: "timing", label: "1. College & Timing", icon: Calendar },
  { id: "departments", label: "2. Depts & Sections", icon: Building2 },
  { id: "subjects", label: "3. Subjects", icon: BookOpen },
  { id: "faculty", label: "4. Faculty & Availability", icon: UserCheck },
  { id: "rooms", label: "5. Rooms & Labs", icon: DoorOpen },
  { id: "assignments", label: "6. Assignments", icon: Link2 },
  { id: "weights", label: "7. Soft Weights", icon: Sliders },
];

export const TabNavigation: React.FC<TabNavigationProps> = ({
  mainTab,
  configSubtab,
  hasTimetable,
  onSelectMainTab,
  onSelectConfigSubtab,
}) => {
  return (
    <div className="space-y-3 no-print">
      {/* Primary Top Tab Switcher */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => onSelectMainTab("config")}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            mainTab === "config"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Configuration & Constraints</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectMainTab("timetable")}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            mainTab === "timetable"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <Table className="w-4 h-4" />
          <span>Timetable Grid</span>
          {hasTimetable && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* Subtab Carousel/Pills for Configuration */}
      {mainTab === "config" && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {SUBTABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = configSubtab === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => onSelectConfigSubtab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
                  isActive
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
