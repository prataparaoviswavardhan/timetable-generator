# Timetable Generator Data Model Specification

This document details the exact JSON schemas, TypeScript interfaces, and Pydantic models for all entities in the Timetable Generator.

---

## 1. Core Entities

### CollegeConfig
Represents global college schedule timing rules.
```typescript
interface CollegeConfig {
  collegeName: string;            // e.g. "Apex Institute of Technology"
  workingDays: number[];          // 1 = Monday ... 6 = Saturday (e.g. [1, 2, 3, 4, 5])
  periodsPerDay: number;          // e.g. 7 or 8 (strictly > 0, typically 5-10)
  dayStartTime: string;           // "HH:MM" 24h format, e.g. "09:00"
  periodDurationMinutes: number;  // Duration in minutes, e.g. 50
}
```

### BreakSlot
Represents an unassignable slot (recess, lunch) across all or specific days.
```typescript
interface BreakSlot {
  id: string;                     // UUID or slug, e.g. "break-lunch"
  name: string;                   // e.g. "Lunch Break" or "Short Break"
  periodAfter: number;            // Period index after which the break occurs (1-based: e.g. after period 4)
  durationMinutes: number;        // e.g. 45
  appliesToDays: number[];        // Days this break applies to (empty means all workingDays)
}
```

### Department
Academic department or branch.
```typescript
interface Department {
  id: string;                     // e.g. "dept-cse"
  name: string;                   // e.g. "Computer Science & Engineering"
  code: string;                   // e.g. "CSE"
}
```

### Section
Cohort of students that attends classes together. Dynamic per department.
```typescript
interface Section {
  id: string;                     // e.g. "sec-cse-3-a"
  departmentId: string;           // References Department.id
  year: number;                   // Academic year, e.g. 1, 2, 3, 4
  semester: number;               // Semester number, e.g. 1 through 8
  name: string;                   // Section identifier, e.g. "A", "B", "Alpha"
  studentCount?: number;          // Optional student count
}
```

### Subject
Curricular course unit (Theory or Practical/Lab).
```typescript
type SubjectType = "theory" | "practical";

interface Subject {
  id: string;                     // e.g. "sub-cs301"
  name: string;                   // e.g. "Operating Systems"
  code: string;                   // e.g. "CS301"
  departmentId: string;           // References Department.id
  type: SubjectType;              // "theory" or "practical"
  weeklyPeriods: number;          // Total required periods per week (e.g. 4)
  consecutivePeriods: number;     // 1 for standard theory; 2 or 3 for practical lab blocks
  preferredRoomType?: "classroom" | "lab"; // Defaults to "classroom" for theory, "lab" for practical
  requiredLabType?: string;       // e.g. "linux-lab", "chemistry-lab", "electronics-lab"
}
```

### Faculty
Academic instructor.
```typescript
interface UnavailableSlot {
  day: number;                    // 1-based day index
  period: number;                 // 1-based period index
}

interface Faculty {
  id: string;                     // e.g. "fac-rk"
  name: string;                   // e.g. "Dr. Ravi Kumar"
  shortName: string;              // e.g. "RK" (used in compact timetable cells)
  departmentId: string;           // Primary department affiliation
  qualifiedSubjectIds: string[];  // Subject IDs this faculty can teach
  unavailableSlots: UnavailableSlot[]; // Specific blocked periods
  maxPeriodsPerDay?: number;      // Optional upper bound per day (e.g. 4)
  maxPeriodsPerWeek?: number;     // Optional upper bound per week (e.g. 18)
}
```

### Room
Physical facility (Classroom or Laboratory).
```typescript
type RoomType = "classroom" | "lab";

interface Room {
  id: string;                     // e.g. "room-101"
  name: string;                   // e.g. "LH-101" or "Network Lab"
  type: RoomType;                 // "classroom" or "lab"
  capacity?: number;              // Optional seating capacity
  labType?: string;               // Optional specialization tag (e.g. "linux-lab", "electronics-lab")
  supportedSubjectIds?: string[]; // Optional explicit list of supported subjects
}
```

### SectionSubjectAssignment
Assigns a subject to a section along with assigned faculty and room preferences.
```typescript
interface SectionSubjectAssignment {
  id: string;                     // e.g. "assign-cse-3a-cs301"
  sectionId: string;              // References Section.id
  subjectId: string;              // References Subject.id
  facultyIds: string[];           // Primary and secondary faculty assigned to teach this section
  preferredRoomId?: string;       // Optional dedicated classroom or specific lab
}
```

---

## 2. Solver Request & Response Contracts

### SolverWeights
Configurable objective penalty/reward weights for soft constraints.
```typescript
interface SolverWeights {
  spreadSubjectsAcrossWeek: number;   // Weight to avoid stacking theory on one day (default: 10)
  maxConsecutiveTheory: number;       // Upper limit before penalty (default: 2)
  consecutiveTheoryPenalty: number;   // Penalty per period exceeding maxConsecutive (default: 5)
  minimizeFacultyGaps: number;        // Weight to minimize idle periods between classes (default: 8)
  balanceFacultyWorkload: number;     // Weight to balance load evenly across days (default: 4)
  distributePracticals: number;       // Weight to spread labs across different days (default: 10)
  diverseFirstPeriods: number;        // Weight to avoid repeating the same first period subject (default: 2)
}
```

### GenerateRequest Payload
```typescript
interface GenerateRequest {
  collegeConfig: CollegeConfig;
  breakSlots: BreakSlot[];
  departments: Department[];
  sections: Section[];
  subjects: Subject[];
  faculty: Faculty[];
  rooms: Room[];
  assignments: SectionSubjectAssignment[];
  weights?: Partial<SolverWeights>;
  timeLimitSeconds?: number;          // Default: 60
}
```

### TimetableSlot Output
```typescript
interface TimetableSlot {
  id: string;                         // Unique slot ID
  sectionId: string;
  day: number;                        // 1 = Monday, etc.
  period: number;                     // 1-based period index
  subjectId: string;
  facultyId: string;
  roomId: string;
  batchId?: string;                   // Optional for future batch support
}
```

### GenerateResponse Payload
```typescript
type SolverStatus = "OPTIMAL" | "FEASIBLE" | "INFEASIBLE" | "UNKNOWN" | "PRE_CHECK_FAILED";

interface ValidationErrorDetail {
  code: string;                       // Machine-readable code, e.g. "FACULTY_OVERLOADED"
  message: string;                    // Human-readable plain English message
  entityType: "section" | "faculty" | "subject" | "room" | "assignment" | "config";
  entityId?: string;                  // ID of affected entity
}

interface GenerateResponse {
  status: SolverStatus;
  executionTimeMs: number;
  objectiveValue?: number;
  timetable: TimetableSlot[];
  errors: ValidationErrorDetail[];
  warnings: string[];
}
```
