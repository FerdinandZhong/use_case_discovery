# Deploying to Cloudera AI (CML) Workbench

Runs the survey/cockpit app as a **CML Application**, using the same
`cai_integration/` automation pattern as the sibling repos (`ray-serve-cai`,
`cai-eval-platform`, …).

**Flow:** create the project from git → CML Job chain (`git_sync → build`) pre-bakes
`npm ci && npm run build` → launch the Application (`start-app.sh` runs `next start`
on `$CDSW_APP_PORT`, starting in seconds because the build already happened).

## Prerequisite: a Node 20+ ML Runtime
The scripts default to no runtime; the Jobs and the Application **must** use a
**Node 20+ ML Runtime** (npm + git on PATH). The stock Cloudera runtimes are Python.
If your workspace has no Node runtime, register one as a Custom Runtime (this repo's
`Dockerfile` base, `node:20-slim`, is a good starting point) and note its **runtime
identifier**. Everything else keys off that identifier.

## One-command bootstrap (git-backed)
From any machine with Python + `requests` + `pyyaml` (local or CI):

```bash
export CML_HOST=https://ml-xxxx.cloudera.site
export CML_API_KEY=<API v2 key>            # User Settings → API Keys
export GIT_URL=https://github.com/<org>/<repo>   # or GITHUB_REPOSITORY=org/repo
export PROJECT_NAME="AI Use Case Discovery"
export RUNTIME_IDENTIFIER=<your-node-20-runtime>
export ADMIN_TOKEN=$(openssl rand -hex 24)

python cai_integration/setup_project.py                                   # → /tmp/project_id.txt
PID=$(cat /tmp/project_id.txt)
python cai_integration/create_jobs.py  --project-id "$PID"                # register git_sync → build
python cai_integration/trigger_jobs.py --project-id "$PID"               # run git_sync; CML runs build
# after "Build App" succeeds:
python cai_integration/deploy_application.py \
  --host "$CML_HOST" --api-key "$CML_API_KEY" --project-id "$PID" \
  --runtime-identifier "$RUNTIME_IDENTIFIER" --subdomain ucd-survey
```

Re-running `deploy_application.py` **restarts** the existing Application (idempotent),
so it also picks up a fresh build. Add `--database-url "postgresql://…"` for Postgres.

`deploy_application.py` **waits for the Application to reach `running`** (poll, `--wait-timeout`,
`--no-wait` to skip) and prints the URL (also written to `/tmp/app_url.txt` for CI), so a green
run means a reachable app. `create_jobs.py` **fails fast** if `RUNTIME_IDENTIFIER` is unset and
warns if it doesn't look like a Node runtime.

### What each file does
| File | Role |
|---|---|
| `setup_project.py` | Find/create the CML project from `GIT_URL`; wait for clone; write `/tmp/project_id.txt`. |
| `jobs_config.yaml` | The Job chain: `git_sync` (root) → `build`. |
| `create_jobs.py` | Create/update the Jobs from the yaml; resolves parent→UUID; runtime from `$RUNTIME_IDENTIFIER`. |
| `trigger_jobs.py` | Trigger `git_sync`; CML auto-runs `build`. |
| `git_sync.py` | Job: `git fetch && git reset --hard origin/<branch>`. |
| `build_app.py` | Job: `npm ci && npm run build` (so the app never builds at start). |
| `start-app.sh` | Application entry: `next start` on `$CDSW_APP_PORT`. |
| `deploy_application.py` | Create (or restart) the Application via CML API v2. Run externally / from a Python session. |

## Security first (customer data)
- Keep **`bypass_authentication = False`** (the default). The app then sits behind
  Workbench SSO — only authenticated users reach it. `--public` flips it (not recommended).
- The per-customer `/s/<slug>` links are the only "public" surface; each slug carries an
  unguessable suffix. If your customers are **external** and can't log into the Workbench,
  this deployment won't be reachable for them — use the **Docker** deploy (root `README.md`)
  on a policy-approved public host instead.
- Data stays on Cloudera infra: SQLite in project storage (`/home/cdsw/data`), or point
  `DATABASE_URL` at a Cloudera-approved managed Postgres.

## Option B — deploy via the CML UI (no scripts)
Project → **Applications → New Application**:
- **Script:** `cai_integration/start-app.sh`
- **Runtime:** your Node 20+ runtime
- **Subdomain:** `ucd-survey` · **Resources:** 2 vCPU / 4 GB
- **Environment:** `ADMIN_TOKEN=<secret>`, optionally `DATABASE_URL=<postgres>` /
  `SQLITE_PATH=/home/cdsw/data/survey.db`
- Leave **Enable Unauthenticated Access** OFF.

Without the build Job, the first UI start builds once (slow), then restarts are fast.

## Data & the NFS caveat
Project storage is NFS-backed. SQLite works there for survey-scale traffic (WAL +
busy-timeout enabled), but under heavy concurrent writes NFS file locking can be flaky —
for a high-traffic deployment prefer **Postgres** via `DATABASE_URL`.

## Using it
Open the Application URL → `/admin` (sign in with `ADMIN_TOKEN`) → create a customer →
share the `/s/<slug>` link → download catalogs (MD/JSON/CSV) or run
`npm run export-catalog <slug>`.
