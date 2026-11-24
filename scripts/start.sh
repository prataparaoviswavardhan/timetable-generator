#!/usr/bin/env bash
# ==============================================================================
# Smart College Timetable Generator - Unified Start Script
# Launches both the Python CP-SAT FastAPI solver and the React Vite frontend.
# ==============================================================================

set -e

# Resolve repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=========================================================="
echo " Starting Smart College Timetable Generator"
echo " Project Root: ${ROOT_DIR}"
echo "=========================================================="

# Check and activate Python virtual environment
VENV_DIR="${ROOT_DIR}/solver/.venv"
if [ ! -d "${VENV_DIR}" ]; then
  echo "[-] Creating virtual environment in solver/.venv..."
  python3 -m venv "${VENV_DIR}"
  "${VENV_DIR}/bin/pip" install -r "${ROOT_DIR}/solver/requirements.txt"
fi

source "${VENV_DIR}/bin/activate"

# Trap exit signals to gracefully kill child processes
cleanup() {
  echo ""
  echo "[-] Stopping Timetable Generator services..."
  if [ -n "${BACKEND_PID}" ]; then
    kill "${BACKEND_PID}" 2>/dev/null || true
  fi
  if [ -n "${FRONTEND_PID}" ]; then
    kill "${FRONTEND_PID}" 2>/dev/null || true
  fi
  echo "[+] Services stopped. Goodbye!"
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 1. Start FastAPI Solver Service
echo "[+] Starting FastAPI Solver on http://127.0.0.1:8000..."
cd "${ROOT_DIR}"
PYTHONPATH=. "${VENV_DIR}/bin/uvicorn" solver.app.main:app --host 127.0.0.1 --port 8000 --log-level info &
BACKEND_PID=$!

# Wait briefly for backend health check
sleep 2

# 2. Start Vite Frontend Service
echo "[+] Starting Vite Frontend on http://localhost:5173..."
cd "${ROOT_DIR}/frontend"
npm run dev -- --host 127.0.0.1 --port 5173 &
FRONTEND_PID=$!

echo ""
echo "=========================================================="
echo " All services running!"
echo " Web UI:     http://localhost:5173"
echo " Solver API: http://127.0.0.1:8000/docs"
echo " Press Ctrl+C to terminate."
echo "=========================================================="
echo ""

# Keep script running
wait
