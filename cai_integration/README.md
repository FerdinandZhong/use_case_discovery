# Deploying to Cloudera AI (CML) Workbench

Runs the survey/cockpit app as a **CML Application**, using the same
`cai_integration/` automation pattern as the sibling repos (`ray-serve-cai`,
`cai-eval-platform`, …).

**Flow:** create the project from git → **CML Job chain** `git_sync → build → launch`:
`git_sync` pulls code, `build` pre-bakes `npm install && npm run build`, and **`launch`**
(Launch Application) creates/replaces the CML Application (pointing at `start_app.py` →
`start-app.sh`, `next start` on `$CDSW_APP_PORT`) and waits for it to run. Because the
launch is a CML Job, an end user can **run the whole chain from the CML Jobs UI** — run
"Git Repository Sync" and it cascades to a live Application, no external script needed.

## Runtime: any ML Runtime (Node auto-installed if missing)
Set `RUNTIME_IDENTIFIER` to any ML Runtime with `git` + internet (a **stock Python
runtime is fine**). If `npm` isn't on that runtime, `cai_integration/ensure_node.sh`
downloads a user-space **Node 20** into project storage (`$HOME/.local/node`, NFS-persistent)
on the first Build Job — shared by the Application, ~30 MB, downloaded once. The scripts
require *some* runtime identifier (fail fast if unset).

Prefer a purpose-built **Node 20+ runtime** if your workspace has one (skips the download):
register a Custom Runtime from this repo's `Dockerfile` (`node:20-slim`) and use its identifier.
`ensure_node.sh` is a no-op when `npm` is already on PATH.

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
python cai_integration/create_jobs.py  --project-id "$PID"                # register git_sync → build → launch
python cai_integration/trigger_jobs.py --project-id "$PID"               # run the chain; app is launched by the launch job
```

`create_jobs.py` bakes the app config (`ADMIN_TOKEN`, `RUNTIME_IDENTIFIER`, `APP_SUBDOMAIN`,
`LLM_*`, `DATABASE_URL`) into the **Launch Application** job's environment, so `trigger_jobs.py`
running the chain produces a live app — and so does running the chain from the CML Jobs UI.
Add `export DATABASE_URL="postgresql://…"` for Postgres. `create_jobs.py` **fails fast** if
`RUNTIME_IDENTIFIER` is unset. Re-running the chain replaces the Application with the current config.

### What each file does
| File | Role |
|---|---|
| `setup_project.py` | Find/create the CML project from `GIT_URL`; wait for clone; write `/tmp/project_id.txt`. |
| `jobs_config.yaml` | The Job chain: `git_sync` (root) → `build` → `launch`. |
| `create_jobs.py` | Create/update the Jobs from the yaml; resolves parent→UUID; injects the launch job's app-config env. |
| `trigger_jobs.py` | Run the chain: trigger `git_sync`, then wait-or-explicitly-trigger `build` then `launch`. |
| `git_sync.py` | Job: `git fetch && git reset --hard origin/<branch>`. |
| `build_app.py` | Job: `npm install && npm run build` (so the app never builds at start). |
| `launch_app.py` | Job (**Launch Application**, parent=build): create/replace the CML Application + wait for running. |
| `start_app.py` | Application entry (CML runs it in the **Python** engine); execs `start-app.sh` via bash. |
| `start-app.sh` | Shell startup invoked by `start_app.py`: ensure Node, `next start` on `$CDSW_APP_PORT`. |
| `deploy_application.py` | Shared CML-API helpers + a standalone CLI to create/replace the Application (used by `launch_app.py`; also runnable manually). |

## Setting `ADMIN_TOKEN`
The admin/facilitator secret (`process.env.ADMIN_TOKEN`); the app won't start without it.

- **Default — GitHub Actions (CI/CD):** store it once as a repo secret and every deploy injects it into
  the Application environment (`.github/workflows/deploy-to-cml.yml`; a preflight fails fast if it's absent).
  ```bash
  gh secret set ADMIN_TOKEN --body "$(openssl rand -hex 24)"
  ```
- **CML UI:** Applications → New/Edit → Environment Variables → `ADMIN_TOKEN`.
- **Deploy script:** `deploy_application.py --admin-token …` (or export `ADMIN_TOKEN`).

A restart preserves the old env — to rotate, change it in the UI or re-run the CI/CD deploy.

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
- **Script:** `cai_integration/start_app.py`  (Python entrypoint — CML runs the app script in the Python engine, not bash)
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
