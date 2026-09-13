# syntax=docker/dockerfile:1
FROM python:3.12-slim AS base

WORKDIR /app

# System deps kept minimal — bcrypt/pyotp/motor all build from wheels,
# no compiler toolchain needed on python:3.12-slim for these versions.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Runs as a non-root user — a real, checkable hardening step, not just
# a comment. Verify with `docker run --rm <image> whoami`.
RUN useradd --create-home --shell /usr/sbin/nologin appuser
USER appuser

EXPOSE 8000

# No secrets baked into the image — MONGODB_URI/JWT_SECRET_KEY/etc.
# are supplied at runtime via environment variables or a mounted
# .env, never committed here. See docs/deployment.md.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
