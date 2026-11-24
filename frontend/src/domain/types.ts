/**
 * Domain types for Smart College Timetable Generator.
 * Strict TypeScript types aligned with JSON Schema and backend Pydantic models.
 */

export interface CollegeConfig {
  collegeName: string;
  workingDays: number[]; // 1 = Monday ... 7 = Sunday
  periodsPerDay: number; // e.g. 7 or 8
  dayStartTime: string; // "HH:MM" 24h format, e.g. "09:00"
  periodDurationMinutes: number; // Duration in minutes, e.g. 50
}

export interface BreakSlot {
  id: string;
  name: string;
  periodAfter: number; // 1-based index (e.g. 4 for lunch after 4th period)
  durationMinutes: number;
  appliesToDays: number[]; // Days this break applies to. Empty array = all workingDays
}

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Section {
  id: string;
  departmentId: string;
  year: number;
  semester: number;
  name: string;
  studentCount?: number;
}

export type SubjectType = "theory" | "practical";

export interface Subject {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  type: SubjectType;
  weeklyPeriods: number;
  consecutivePeriods: number; // 1 for theory, 2+ for practicals
  preferredRoomType?: "classroom" | "lab";
  requiredLabType?: string;
}

export interface UnavailableSlot {
  day: number;
  period: number;
}

export interface Faculty {
  id: string;
  name: string;
  shortName: string;
  departmentId: string;
  qualifiedSubjectIds: string[];
  unavailableSlots: UnavailableSlot[];
  maxPeriodsPerDay?: number;
  maxPeriodsPerWeek?: number;
}

export type RoomType = "classroom" | "lab";

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  capacity?: number;
  labType?: string;
  supportedSubjectIds?: string[];
}

export interface SectionSubjectAssignment {
  id: string;
  sectionId: string;
  subjectId: string;
  facultyIds: string[];
  preferredRoomId?: string;
}

export interface SolverWeights {
  spreadSubjectsAcrossWeek: number;
  maxConsecutiveTheory: number;
  consecutiveTheoryPenalty: number;
  minimizeFacultyGaps: number;
  balanceFacultyWorkload: number;
  distributePracticals: number;
  diverseFirstPeriods: number;
}

export interface GenerateRequest {
  collegeConfig: CollegeConfig;
  breakSlots: BreakSlot[];
  departments: Department[];
  sections: Section[];
  subjects: Subject[];
  faculty: Faculty[];
  rooms: Room[];
  assignments: SectionSubjectAssignment[];
  weights?: Partial<SolverWeights>;
  timeLimitSeconds?: number;
}

export interface TimetableSlot {
  id: string;
  sectionId: string;
  day: number;
  period: number;
  subjectId: string;
  facultyId: string;
  roomId: string;
  batchId?: string;
}

export type SolverStatus = "OPTIMAL" | "FEASIBLE" | "INFEASIBLE" | "UNKNOWN" | "PRE_CHECK_FAILED";

export type EntityType = "section" | "faculty" | "subject" | "room" | "assignment" | "config";

export interface ValidationErrorDetail {
  code: string;
  message: string;
  entityType: EntityType;
  entityId?: string;
}

export interface GenerateResponse {
  status: SolverStatus;
  executionTimeMs: number;
  objectiveValue?: number;
  timetable: TimetableSlot[];
  errors: ValidationErrorDetail[];
  warnings: string[];
}
