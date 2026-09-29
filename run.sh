#!/usr/bin/env bash
set -e

echo "=========================================="
echo "  JobProof — Launching Application"
echo "=========================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Ensure environment is initialized
if [ ! -d ".venv" ] || [ ! -d "frontend/node_modules" ]; then
  echo "→ Dependencies missing. Running automated setup first..."
  ./setup.sh
fi

# Run any pending migrations
echo "→ Ensuring database schema is up to date..."
(cd backend && ../.venv/bin/alembic upgrade head >/dev/null 2>&1 || true)

# Trap signals to clean up background processes
cleanup() {
  echo ""
  echo "→ Shutting down JobProof services..."
  kill $(jobs -p) 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Start backend
echo "→ Starting Backend (FastAPI on http://127.0.0.1:8000)..."
(cd backend && exec ../.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000) &

# Start frontend
echo "→ Starting Frontend (Vite on http://127.0.0.1:5173)..."
(cd frontend && exec pnpm dev) &

echo "=========================================="
echo "  ✓ JobProof is live!"
echo "  - Frontend: http://localhost:5173"
echo "  - Backend:  http://localhost:8000"
echo "  Press Ctrl+C to stop all servers."
echo "=========================================="

wait
