# Smart College Timetable Generator

A responsive, one-time-use timetable generation application for higher education colleges, powered by **Google OR-Tools CP-SAT** (Python constraint solver) and **React 18 + TypeScript + Vite + Tailwind CSS**.

---

## Key Highlights

- **Stateless Mathematical Constraint Solver**: Powered by Google OR-Tools CP-SAT. Solves multi-section, multi-department academic timetables with hard constraints (concurrency, break barriers, consecutive practical hours, lab specialization matching, faculty workload caps).
- **Zero Database Server**: Stateless architecture (`JSON-in, JSON-out`). Drafts persist in browser `localStorage`; configurations export and import as structured JSON files.
- **Independent Verification Layer (`verify.py`)**: A pure verification engine that independently evaluates every generated timetable against all 11 hard constraints without importing or depending on any CP-SAT solver code.
- **Multi-Perspective Visualization**: Filterable by Section (primary), Faculty (with gap analysis), and Room / Specialized Laboratory.
- **Client-Side Export**:
  - **PDF Export**: Print-ready, formatted landscape sheets (one page per section or faculty) using `jsPDF` + `jspdf-autotable`.
  - **Excel Export**: Structured multi-sheet workbook (`.xlsx`) with Section sheets, Faculty Schedule sheet, and Room Occupancy matrix using `SheetJS`.
- **Responsive Design**: Designed intentionally for desktop (1440px/1280px), tablet, and mobile down to 360px (with dedicated day-tab card navigation).

---

## Architecture Overview

```
Browser (Desktop / Tablet / Mobile 360px+)
├── React 18 + Vite + TypeScript + Tailwind CSS
├── Working Draft Persistence (localStorage)
├── Lossless JSON Import / Export
├── Live Pre-Solve Validation (validation.ts)
├── Timetable Views (Section / Faculty / Room)
└── Client-Side Exporters (jsPDF + autoTable, SheetJS xlsx)
          │
          │ HTTP JSON Contract (localhost:5173 /api -> localhost:8000)
          ▼
FastAPI Scheduling Service (Python 3.9+)
├── POST /validate  --> Pre-solve feasibility checks (validate.py)
├── POST /generate  --> Full CP-SAT solver workflow (solve.py)
│     ├── CP-SAT Mathematical Model Builder (build_model.py)
│     ├── Soft Objective Weighting (objective.py)
│     ├── Time-bounded Multi-worker Solver (Google OR-Tools)
│     └── Independent Output Verifier (verify.py)
└── GET  /health    --> Service status & engine metadata
```

---

## Hard Constraints Enforced (Must Never Be Violated)

1. **Section Concurrency**: A section has at most one class in any time slot.
2. **Faculty Concurrency**: A faculty member teaches at most one section in any time slot.
3. **Room Concurrency**: A room or laboratory hosts at most one section in any time slot.
4. **Weekly Period Fulfillment**: Each section-subject assignment receives exactly its required weekly periods.
5. **Faculty Qualification**: A faculty member only teaches subjects they are qualified for.
6. **Faculty Availability Windows**: Classes are never scheduled during a faculty member's declared unavailable slots.
7. **Working Days & Hours**: All classes fall strictly within configured working days and daily period limits.
8. **Breaks & Lunch Protection**: Break and lunch periods remain completely free for all sections and faculty.
9. **Consecutive Practical Blocks**: Practical lab sessions requiring $N$ consecutive periods are placed in $N$ contiguous periods on the same day without crossing any break.
10. **Specialized Lab Compatibility**: A practical session is placed strictly in a laboratory matching its required lab type.
11. **Workload Caps**: Faculty daily and weekly teaching caps are strictly respected.

---

## Soft Constraints & Optimization (Configurable Weights)

1. **Spread Theory Across Week**: Avoids stacking multiple periods of the same subject on one day.
2. **Consecutive Theory Limit**: Penalizes student sections attending $>2$ contiguous lecture hours without a break.
3. **Minimize Faculty Idle Gaps**: Penalizes empty periods between a faculty member's first and last class on any day.
4. **Diverse First Periods**: Encourages sections to rotate first-period subjects across the week.
5. **Distribute Practicals**: Balances lab room utilization across weekdays.

---

## Quick Start Guide

### Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **Python**: 3.9+ (with `venv`)

### 1. Unified Launch (Recommended)
Launch both the Python CP-SAT solver and the Vite frontend with one command:

```bash
bash scripts/start.sh
```

- **Frontend Application**: Open [http://localhost:5173](http://localhost:5173) in your browser.
- **FastAPI Interactive Docs**: Open [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

---

### 2. Manual Startup (Alternative)

#### Backend (Terminal 1):
```bash
cd timetable-generator
source solver/.venv/bin/activate  # Or: python3 -m venv solver/.venv && pip install -r solver/requirements.txt
PYTHONPATH=. uvicorn solver.app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### Frontend (Terminal 2):
```bash
cd timetable-generator/frontend
npm install
npm run dev
```

---

## Testing & Verification

### Run Solver Pytest Suite (37 Tests):
```bash
cd timetable-generator
PYTHONPATH=. solver/.venv/bin/pytest -v solver/tests
```

Covers:
- Domain model schema validation and camelCase serialization.
- Pre-solve feasibility checks (duplicate IDs, reference integrity, overloaded faculty, overloaded sections, breaks blocking practicals, unqualified faculty, missing labs).
- CP-SAT model building and optimization solving on 1-section and 12-section college fixtures.
- Mathematical infeasibility proofs on impossible constraint sets.
- Independent verifier validating all 11 hard constraints.

### Run Frontend TypeScript Tests (12 Tests):
```bash
cd timetable-generator/frontend
npm test
```

### Build Production Bundle:
```bash
cd timetable-generator/frontend
npm run build
```
Generates production build in `frontend/dist/`.

---

## End-to-End Workflow

1. **Open UI**: Visit [http://localhost:5173](http://localhost:5173).
2. **Select Demo Preset or Enter Data**:
   - Click the preset selector dropdown in the header to load either the **1-Section Quick Demo** or the **12-Section 4-Dept College**.
   - Or configure your own rules via the 7 numbered wizard tabs:
     1. *College & Timing*: Configure days, periods, duration, and lunch/recess breaks.
     2. *Depts & Sections*: Add dynamic departments and sections.
     3. *Subjects*: Set theory vs practical hours, block sizes, and lab types.
     4. *Faculty & Availability*: Add faculty and click slots in the visual matrix to toggle availability.
     5. *Rooms & Labs*: Add general classrooms and specialized labs.
     6. *Assignments*: Map courses to sections and assign teachers.
     7. *Soft Weights*: Tune quality weights and solver timeout.
3. **Pre-Solve Validation**: Review the live feedback banner. If any structural errors exist, actionable alerts name the exact entities.
4. **Generate**: Click **Generate Conflict-Free Timetable**.
5. **Review & Export**:
   - Inspect the timetable grid by Section, Faculty, or Room.
   - Click **Export PDF** for printable landscape sheets.
   - Click **Export Excel** for a multi-sheet `.xlsx` workbook.
