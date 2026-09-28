# Multi-stage Dockerfile for JobProof
# Stage 1: Build the frontend with Node 22 and pnpm
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY frontend/ ./
RUN pnpm build

# Stage 2: Runtime image with Python 3.12
FROM python:3.12-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.lock ./
RUN pip install --no-cache-dir -r requirements.lock

COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

ENV PYTHONUNBUFFERED=1
ENV PORT=8000
ENV STATIC_DIR=/app/frontend/dist
ENV ALLOWED_ORIGINS=*

EXPOSE 8000

CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
