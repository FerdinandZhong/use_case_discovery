#!/usr/bin/env python3
"""CML Job: Launch Application — third job in the chain (git_sync → build → launch).

Runs INSIDE CML (as a Job) so the whole deploy is triggerable from the CML Jobs UI:
run "Git Repository Sync" and CML cascades sync → build → this. Creates (or replaces)
the CML Application pointing at cai_integration/start_app.py and waits for it to run.

Credentials are auto-injected by CML (CDSW_APIV2_KEY, CDSW_DOMAIN/CDSW_API_URL,
CDSW_PROJECT_ID). App config (ADMIN_TOKEN, RUNTIME_IDENTIFIER, subdomain, LLM_*,
DATABASE_URL) is baked into this job's environment by create_jobs.py.

CML runs job scripts in an IPython engine: never sys.exit (treated as failure) — raise.
"""
import os
import sys

# The job runs from the repo root (/home/cdsw); make cai_integration importable.
sys.path.insert(0, os.path.join(os.getcwd(), "cai_integration"))
sys.path.insert(0, "cai_integration")

from deploy_application import (  # noqa: E402
    _build_payload, normalize_host, find_application, delete_application,
    create_application, wait_for_running, emit_url,
)


def main() -> None:
    host = normalize_host(
        os.environ.get("CDSW_API_URL") or os.environ.get("CDSW_DOMAIN") or os.environ.get("CML_HOST") or ""
    )
    api_key = os.environ.get("CDSW_APIV2_KEY") or os.environ.get("CML_API_KEY")
    project_id = os.environ.get("CDSW_PROJECT_ID")
    runtime = os.environ.get("RUNTIME_IDENTIFIER")
    admin_token = os.environ.get("ADMIN_TOKEN")
    name = os.environ.get("APP_NAME", "AI Use Case Discovery Survey")
    subdomain = os.environ.get("APP_SUBDOMAIN", "ucd-survey")

    missing = [k for k, v in {
        "CDSW_API_URL/CDSW_DOMAIN": host, "CDSW_APIV2_KEY": api_key,
        "CDSW_PROJECT_ID": project_id, "RUNTIME_IDENTIFIER": runtime, "ADMIN_TOKEN": admin_token,
    }.items() if not v]
    if missing:
        raise RuntimeError(f"launch_app: missing required values: {', '.join(missing)}")

    payload = _build_payload(
        name=name, subdomain=subdomain, script="cai_integration/start_app.py",
        runtime_identifier=runtime, admin_token=admin_token, cpu=2, memory=4,
        bypass_authentication=(os.environ.get("APP_PUBLIC") == "1"),
        database_url=os.environ.get("DATABASE_URL"),
        sqlite_path=os.environ.get("SQLITE_PATH", "/home/cdsw/data/survey.db"),
        base_path=os.environ.get("NEXT_PUBLIC_BASE_PATH"),
    )

    existing = find_application(host, api_key, project_id, name, subdomain)
    if existing:
        print(f"Existing Application {existing} — deleting to apply current config.")
        delete_application(host, api_key, project_id, existing)
    app = create_application(host, api_key, project_id, payload=payload)
    app_id = app.get("id")
    print(f"Application created: {app_id} (subdomain: {subdomain})")

    if not wait_for_running(host, api_key, project_id, app_id, int(os.environ.get("APP_WAIT_TIMEOUT", "300"))):
        raise RuntimeError("Application did not reach 'running' — check the Application logs.")
    emit_url(host, api_key, project_id, app_id, subdomain)
    print("Launch Application complete.")


# CML engine: unguarded call, no sys.exit.
main()
