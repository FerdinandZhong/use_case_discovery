# syntax=docker/dockerfile:1
# Multi-stage build producing a self-contained Next.js standalone server.
# Debian-slim (not Alpine) so the better-sqlite3 native module builds/loads cleanly.

# ── Stage 1: install dependencies ─────────────────────────────────────────────
FROM node:20-slim AS deps
WORKDIR /app
# Build tools for better-sqlite3 (falls back to source build if no prebuilt binary).
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
# Use `npm install` (not `npm ci`): the committed lock file is generated on the
# host platform and may omit the Linux-specific optional deps (e.g. @emnapi/*,
# platform sharp binaries) that this image needs. `npm install` resolves them
# correctly inside the container.
RUN npm install --no-audit --no-fund

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 3: runtime ──────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
# Default embedded-SQLite location (mount this dir as a volume to persist).
ENV SQLITE_PATH=/app/data/survey.db

# Standalone server + static assets + public dir.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Persistent data directory, owned by the non-root node user.
RUN mkdir -p /app/data && chown -R node:node /app/data
VOLUME /app/data
USER node

EXPOSE 8080
CMD ["node", "server.js"]
