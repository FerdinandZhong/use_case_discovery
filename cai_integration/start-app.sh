#!/bin/bash
# Launch script for a Cloudera AI (CML) Application.
#
# CML runs this script inside the Application's ML Runtime and routes external
# traffic to whatever listens on $CDSW_APP_PORT. Point the Application's
# "script" field at cai_integration/start-app.sh.
#
# Requires a Node-capable runtime (Node 20+). Data persists in project storage.
set -euo pipefail

export PORT="${CDSW_APP_PORT:-8080}"
export HOSTNAME="0.0.0.0"
export NEXT_TELEMETRY_DISABLED=1

# Secrets/config come from the Application's Environment settings (not committed).
: "${ADMIN_TOKEN:?ADMIN_TOKEN must be set in the CML Application environment}"

# Default datastore: embedded SQLite in project storage (survives restarts).
# For heavier concurrency prefer Postgres: set DATABASE_URL in the environment.
export SQLITE_PATH="${SQLITE_PATH:-/home/cdsw/data/survey.db}"
mkdir -p "$(dirname "$SQLITE_PATH")"

# Normal path: the "Build App" CML Job (cai_integration/build_app.py) already ran
# `npm ci && npm run build`, so node_modules and .next exist on project storage and
# we start in seconds. The guards below only fire on the CML-UI deploy path where no
# build Job ran — a one-time slow first start.
if [ ! -d node_modules ]; then
  echo "[start-app] node_modules missing — running npm ci (no build Job ran?)"
  npm ci
fi
if [ ! -d .next ]; then
  echo "[start-app] .next missing — building once (no build Job ran?)"
  npm run build
fi

echo "[start-app] starting on port ${PORT} (backend: ${DATABASE_URL:+postgres}${DATABASE_URL:-sqlite})"
exec npx next start -p "${PORT}" -H "${HOSTNAME}"
