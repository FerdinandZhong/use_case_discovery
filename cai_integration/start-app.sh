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
export HOSTNAME="127.0.0.1"
export NEXT_TELEMETRY_DISABLED=1

# Put Node/npm on PATH — no-op on a Node runtime; otherwise reuses (or installs)
# the user-space Node the Build Job placed in project storage.
. "$(dirname "$0")/ensure_node.sh"

# Secrets/config come from the Application's Environment settings (not committed).
: "${ADMIN_TOKEN:?ADMIN_TOKEN must be set in the CML Application environment}"

# Default datastore: embedded SQLite in project storage (survives restarts).
# For heavier concurrency prefer Postgres: set DATABASE_URL in the environment.
export SQLITE_PATH="${SQLITE_PATH:-/home/cdsw/data/survey.db}"
mkdir -p "$(dirname "$SQLITE_PATH")"

# Normal path: the "Build App" CML Job (cai_integration/build_app.py) already ran
# `npm install && npm run build`, so node_modules and .next exist on project storage
# and we start in seconds. The guards below only fire on the CML-UI deploy path where
# no build Job ran — a one-time slow first start.
if [ ! -d node_modules ]; then
  echo "[start-app] node_modules missing — running npm install (no build Job ran?)"
  npm install --no-audit --no-fund   # not `npm ci`: macOS lockfile omits linux optional deps
fi
if [ ! -d .next ]; then
  echo "[start-app] .next missing — building once (no build Job ran?)"
  npm run build
fi

echo "[start-app] starting on port ${PORT} (backend: ${DATABASE_URL:+postgres}${DATABASE_URL:-sqlite})"
# Retry a few times: when an Application is replaced, a prior instance may still be
# releasing the port (EADDRINUSE) for a few seconds. A successful `next start` blocks
# forever, so the loop only re-enters on failure.
for attempt in 1 2 3 4 5; do
  npx next start -p "${PORT}" -H "${HOSTNAME}" && break
  echo "[start-app] next start exited (attempt ${attempt}) — port may still be freeing; retrying in 6s"
  sleep 6
done
