# Multi-stage Dockerfile for JobProof
# Stage 1: Build the frontend with Node 22 and pnpm
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile

COPY frontend/ ./
RUN pnpm run build

# Stage 2: Runtime image with Python 3.12
FROM python:3.12-slim AS runner
WORKDIR /app

COPY backend/requirements.lock ./
RUN pip install --no-cache-dir -r requirements.lock

COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

ENV PYTHONUNBUFFERED=1
ENV PORT=8000
ENV STATIC_DIR=/app/frontend/dist
ENV DATABASE_URL=sqlite:////data/jobproof.db
# Local-only defaults: never "*". Publish the port on loopback (-p 127.0.0.1:8000:8000), see the README.
ENV ALLOWED_ORIGINS=http://127.0.0.1:8000,http://localhost:8000

RUN useradd --system --uid 10001 jobproof && mkdir /data && chown jobproof /data
USER jobproof
VOLUME /data

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD python -c "import os,urllib.request as u; u.urlopen('http://127.0.0.1:%s/health' % os.environ.get('PORT','8000'), timeout=4)"

CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
