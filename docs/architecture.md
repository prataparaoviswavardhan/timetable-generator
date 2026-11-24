# Architecture Decision Record & System Design

## 1. Product Objective & Boundary

The system is a **one-time-use Smart College Timetable Generator for a single college**.
It takes academic structure, curricular rules, availability constraints, and facility mappings as inputs, validates them, uses a constraint satisfaction solver (Google OR-Tools CP-SAT) to generate a conflict-free timetable, provides multi-dimensional visualization (by section, faculty, and room), and exports the timetable to PDF and Excel.

### Strict Scope Boundary
- **In Scope**:
  - College timing configuration (working days, periods per day, start time, period duration).
  - Break and lunch blockages (system-wide or day-specific).
  - Dynamic academic hierarchy (departments, years, semesters, sections; dynamic counts and naming).
  - Theory and practical subjects with weekly period counts and consecutive block requirements.
  - Faculty profiles with qualified subjects, availability windows, and daily/weekly workload caps.
  - Classrooms and specialized laboratories.
  - Section-subject-faculty assignments and room preferences.
  - Pre-solve structural validation and feasibility checks.
  - CP-SAT constraint formulation (hard + soft constraints).
  - Responsive visual timetable grid (filterable by section, faculty, room; desktop and mobile views).
  - Lossless JSON import/export and `localStorage` draft persistence.
  - Print-ready PDF export and multi-sheet Excel export.
- **Explicitly Out of Scope**:
  - Authentication, user accounts, and role-based permissions.
  - Student/faculty portals, notifications, SMS/email alerts.
  - Attendance management, substitution tracking, or live rescheduling.
  - Database servers (e.g., PostgreSQL, MySQL, MongoDB, or SQLite).
  - Daily operations, ERP integrations, analytics dashboards, or AI chatbots.

---

## 2. High-Level Architecture

```
+---------------------------------------------------------------------------------+
| Browser (Desktop / Tablet / Mobile)                                             |
|                                                                                 |
|  +---------------------------------------------------------------------------+  |
|  | React + TypeScript + Tailwind CSS                                         |  |
|  |                                                                           |  |
|  | [ Configuration Wizard / Forms ]  <---> [ LocalStorage Draft Persistence] |  |
|  |           |                                                               |  |
|  | [ Import / Export JSON ]                                                  |  |
|  |           |                                                               |  |
|  | [ Timetable Views (Section / Faculty / Room) ]                            |  |
|  |           |                                                               |  |
|  | [ Client-Side Exporters: PDF (jsPDF) & Excel (SheetJS) ]                 |  |
|  +--------------------------------------|------------------------------------+  |
+-----------------------------------------|---------------------------------------+
                                          | HTTP JSON API (proxied via Vite dev)
                                          v
+---------------------------------------------------------------------------------+
| Local Scheduling Service (FastAPI + Python 3.9+)                                |
|                                                                                 |
|  [ POST /validate ] --------> Pre-solve Feasibility Checker (Pure Domain Logic) |
|                                              |                                  |
|  [ POST /generate ] --------> CP-SAT Model Builder                              |
|                                     |                                           |
|                               [ Hard Constraints ]                              |
|                               [ Soft Objectives ]                               |
|                                     |                                           |
|                               CP-SAT Solver (Multi-threaded, Time-bounded)      |
|                                     |                                           |
|                               Structured Response (OPTIMAL / FEASIBLE /         |
|                                                     INFEASIBLE + Diagnostics)   |
|                                                                                 |
|  [ Independent Verifier ] <--- verify.py (Zero CP-SAT dependencies)             |
|                               Checks: Section, Faculty, Room, Periods, Labs...   |
+---------------------------------------------------------------------------------+
```

---

## 3. Technology Stack & Justification

| Layer | Technology | Justification |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18+ with Vite & TypeScript | Fast development cycle, strict typing, broad ecosystem for UI grids and forms. |
| **Styling** | Tailwind CSS | Utility-first CSS ensuring full responsiveness (360px to 1440px+), clean typography, tabular numerals, accessible contrast. |
| **State Management** | Zustand | Lightweight, minimal boilerplate, clean decoupling from UI components, easy persistence to `localStorage`. |
| **Export Engines** | jsPDF + autoTable (PDF), SheetJS (Excel) | Client-side generation eliminates server binary dependencies and allows instant client downloads. |
| **Backend Framework** | FastAPI (Python) | High-performance, native Pydantic schema validation, automatic OpenAPI documentation, clean async route structure. |
| **Constraint Solver** | Google OR-Tools (CP-SAT) | State-of-the-art exact constraint programming solver. Handles Boolean constraints, interval logic for practical blocks, multi-threaded optimization, and strict infeasibility detection. |
| **Testing** | Vitest (Frontend), Pytest (Backend) | Fast, isolated unit tests for domain validation, JSON parsing, and solver constraint verification. |

---

## 4. Architectural Trade-offs & Decisions

### Decision 1: Python OR-Tools vs. Pure Browser JavaScript Constraint Solver
- **Context**: The user requested a responsive web app for a single college, but also specified Google OR-Tools CP-SAT (Python).
- **Evaluation**: JavaScript-based solvers struggle significantly with complex combinatorial scheduling containing 12+ sections, shared faculty, consecutive practical intervals, and room constraints. They lack native interval variables and multi-core SAT search.
- **Resolution**: Use a dual-runtime model: a lightweight, stateless FastAPI backend running on `localhost:8000` executing CP-SAT, and a modern React frontend on `localhost:5173`. A single `scripts/start.sh` launches both. The backend remains strictly stateless (JSON-in, JSON-out), allowing the solver to be tested and deployed independently.

### Decision 2: Zero Database Engine vs. JSON Persistence
- **Context**: Timetable generation is an episodic, one-time workflow. Introducing a database introduces schema migration overhead, locks, and unnecessary operational complexity.
- **Evaluation**: A college configuration and resulting timetable easily fit within 1–5 MB of structured JSON.
- **Resolution**: No database server. The frontend persists working drafts in browser `localStorage` and provides full JSON file export and import. The backend accepts the full configuration in `POST /generate` and returns the timetable without saving state to disk.

### Decision 3: Pre-solve Feasibility Checks vs. Relying Solely on Solver
- **Context**: When CP-SAT encounters an impossible constraint set, it returns `INFEASIBLE`. However, CP-SAT does not automatically produce human-readable explanations like "Faculty X is assigned 34 periods but is only available for 28".
- **Resolution**: Implement a dedicated `validate.py` module that performs deterministic, domain-specific feasibility checks before calling CP-SAT. If any pre-solve check fails, the API responds immediately with detailed, actionable error messages naming specific sections, subjects, or faculty.

### Decision 4: Infeasibility Precision & Independent Verification Layer
- **Context**: CP-SAT can only prove infeasibility for constraints that are explicitly and correctly represented in the CP-SAT mathematical model. If a constraint is missing or misformulated in the solver model, the solver might return a "FEASIBLE" solution that actually violates college rules, or return "INFEASIBLE" due to an unintended over-constraint.
- **Resolution**:
  1. **Strict Model Completeness**: Every hard constraint (1 through 11) is mathematically formulated in CP-SAT.
  2. **Zero-Dependency Independent Verifier (`solver/app/verify.py`)**: A standalone verification module written entirely from requirements and `docs/data-model.md`. It contains zero imports or references to CP-SAT or the solver builder. It validates any generated timetable JSON against the college configuration, checking section overlap, faculty overlap, room overlap, required periods, availability masks, break violations, and consecutive practical integrity.
  3. **Dual Validation in CI & Tests**: All test fixtures and solver runs must pass this independent verifier. If the solver claims a solution is feasible, the verifier must also pass. If the verifier fails, the solver model contains a bug.

---

## 5. Domain Assumptions (as per Section 4 & Scope)

1. **Practical Batches**: A practical session may be split into batches (e.g., A1 and A2) rotating across labs. In Phase 1, the data model supports an optional `batchId`, but the default solver behavior assigns the entire section to a single lab block.
2. **Faculty Concurrency**: Faculty may teach across multiple sections and departments, but can never be double-booked in the same time slot.
3. **Room Allocation**: Room capacity is optional and ignored in v1 matching unless explicit capacities or lab requirements are defined. Theory classes use available general classrooms; practicals strictly require labs tagged with the subject's required lab type.
4. **Break Slots**: Breaks and lunch slots are excised from the assignable domain. Classes are never scheduled during breaks, and multi-period practical blocks cannot span across a break.
5. **Consecutive Periods**: Practical sessions requiring $N$ consecutive periods must be scheduled as contiguous periods on the same day within a single uninterrupted session block.
6. **Stateless Operations**: No session tokens, user credentials, or server-side cache. Every generation request is self-contained.

---

## 6. Security, Performance & Reliability

- **Network Isolation**: The backend server binds strictly to `127.0.0.1`.
- **CORS Configuration**: Restrict allowed origins to the frontend development server (`http://localhost:5173`).
- **Input Validation & Sanitization**: Incoming JSON is rigorously validated against strict Pydantic models with bounded lengths and positive integers. Requests over 10 MB are rejected.
- **Solver Time Limits**: A default time limit of 60 seconds (configurable) prevents unbounded CPU utilization. If the time limit is reached, any feasible solution found is returned with status `FEASIBLE`, or `UNKNOWN` if none was discovered.
