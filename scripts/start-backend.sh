#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/../backend"
../.venv/bin/alembic upgrade head
exec ../.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
