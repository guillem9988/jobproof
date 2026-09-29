#!/usr/bin/env bash
set -e

echo "=========================================="
echo "  JobProof — Automated Setup"
echo "=========================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# 1. Setup Python Virtual Environment
if [ ! -d ".venv" ]; then
  echo "→ Creating Python virtual environment in .venv..."
  python3 -m venv .venv
fi

echo "→ Installing backend dependencies..."
.venv/bin/pip install --upgrade pip
if [ -f "backend/requirements.lock" ]; then
  .venv/bin/pip install -r backend/requirements.lock
elif [ -f "backend/requirements.txt" ]; then
  .venv/bin/pip install -r backend/requirements.txt
fi

# 2. Setup Frontend Dependencies
echo "→ Installing frontend dependencies with pnpm..."
pnpm --dir frontend install

# 3. Prepare Environment file if not present
if [ ! -f ".env" ]; then
  echo "→ Initializing .env from .env.example..."
  cp .env.example .env
fi

# 4. Run Alembic Database Migrations
echo "→ Running database migrations..."
(cd backend && ../.venv/bin/alembic upgrade head)

echo "=========================================="
echo "  ✓ Setup complete!"
echo "  You can start JobProof with:"
echo "    ./run.sh"
echo "=========================================="
