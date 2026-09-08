#!/usr/bin/env python3
"""
Register this survey app as a Cloudera AI (CML) Application via CML API v2.

Modeled on the create_application pattern in ray-serve-cai
(ray_serve_cai/cai_cluster.py::CMLAPIClient.create_application):
    POST {host}/api/v2/projects/{project_id}/applications

Run this from inside a CML Session in the project (env vars are auto-injected),
or locally by supplying --host / --api-key / --project-id.

IMPORTANT (customer data): keep bypass_authentication FALSE so the survey sits
behind Workbench SSO. Only the /s/<slug> links you share are meant to be public;
if your customers are external and cannot reach the Workbench, use the container
deploy (Docker) on an approved host instead.
"""
from __future__ import annotations

import argparse
import os
import sys
import time

import requests


# Application status classification (pure — unit-testable without network).
# CML application statuses vary a little by version; classify on substrings.
def app_is_running(status: str) -> bool:
    return (status or "").lower() in ("running", "running_partial")


def app_is_failed(status: str) -> bool:
    return (status or "").lower() in (
        "failed", "stopped", "error", "engine_failed", "startup_failed", "killed",
    )


def _build_payload(*, name, subdomain, script, runtime_identifier, admin_token,
                   cpu, memory, bypass_authentication, database_url, sqlite_path, base_path) -> dict:
    environment = {
        "ADMIN_TOKEN": admin_token,
        "SQLITE_PATH": sqlite_path,
        "NEXT_TELEMETRY_DISABLED": "1",
    }
    if database_url:
        environment["DATABASE_URL"] = database_url  # Postgres overrides SQLite
    if base_path:
        environment["NEXT_PUBLIC_BASE_PATH"] = base_path
    # Stage-2 workshop cockpit LLM (OpenAI-compatible; e.g. Cloudera AI Inference).
    for var in ("LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL"):
        if os.environ.get(var):
            environment[var] = os.environ[var]
    return {
        "name": name,
        "subdomain": subdomain,
        "script": script,
        "cpu": cpu,
        "memory": memory,
        "runtime_identifier": runtime_identifier,
        "bypass_authentication": bypass_authentication,
        "environment": environment,
    }


def create_application(host: str, api_key: str, project_id: str, *, payload: dict) -> dict:
    url = f"{host.rstrip('/')}/api/v2/projects/{project_id}/applications"
    resp = requests.post(
        url, json=payload,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        timeout=60,
    )
    if resp.status_code >= 400:
        print(f"✗ Create failed ({resp.status_code}): {resp.text}", file=sys.stderr)
        resp.raise_for_status()
    return resp.json()


def delete_application(host: str, api_key: str, project_id: str, app_id: str) -> None:
    """DELETE an existing Application so a redeploy can recreate it with the current
    config (script/env/runtime). CML's PATCH uses a different request schema than POST
    and rejects the create payload; delete+create is the reliable converge path. Only
    the Application *definition* is removed — project storage (SQLite data) is untouched."""
    url = f"{host}/api/v2/projects/{project_id}/applications/{app_id}"
    resp = requests.delete(url, headers={"Authorization": f"Bearer {api_key}"}, timeout=60)
    if resp.status_code >= 400:
        print(f"✗ Delete failed ({resp.status_code}): {resp.text}", file=sys.stderr)
        resp.raise_for_status()


def normalize_host(host: str) -> str:
    """CDSW_API_URL may carry a /api/v1 or /api/v2 suffix — strip it; callers
    re-append /api/v2 themselves."""
    host = (host or "").rstrip("/")
    for suffix in ("/api/v2", "/api/v1"):
        if host.endswith(suffix):
            return host[: -len(suffix)]
    return host


def find_application(host: str, api_key: str, project_id: str,
                     name: str, subdomain: str) -> str | None:
    """Return the id of an existing Application matching name or subdomain, else None."""
    url = f"{host}/api/v2/projects/{project_id}/applications"
    resp = requests.get(url, headers={"Authorization": f"Bearer {api_key}"}, timeout=60)
    if resp.status_code >= 400:
        return None
    for app in resp.json().get("applications", []):
        if app.get("name") == name or app.get("subdomain") == subdomain:
            return app.get("id")
    return None


def restart_application(host: str, api_key: str, project_id: str, app_id: str) -> dict:
    """Restart so a re-deploy picks up the freshly-built code. POST .../restart,
    falling back to a PATCH touch if restart isn't supported."""
    base = f"{host}/api/v2/projects/{project_id}/applications/{app_id}"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    resp = requests.post(f"{base}/restart", headers=headers, timeout=60)
    if resp.status_code >= 400:
        resp = requests.patch(base, json={}, headers=headers, timeout=60)
    if resp.status_code >= 400:
        print(f"✗ Restart failed ({resp.status_code}): {resp.text}", file=sys.stderr)
        resp.raise_for_status()
    return resp.json() if resp.text else {"id": app_id}


def get_application(host: str, api_key: str, project_id: str, app_id: str) -> dict:
    """GET a single Application (for status + url)."""
    url = f"{host}/api/v2/projects/{project_id}/applications/{app_id}"
    resp = requests.get(url, headers={"Authorization": f"Bearer {api_key}"}, timeout=60)
    if resp.status_code >= 400:
        return {}
    return resp.json() if resp.text else {}


def wait_for_running(host: str, api_key: str, project_id: str, app_id: str,
                     timeout: int = 300) -> bool:
    """Poll the Application until it reaches a running state, or a terminal
    failure / timeout. Mirrors trigger_jobs.wait_for_job_completion so a broken
    start fails CI instead of reporting a false green."""
    print(f"   Waiting for Application to reach 'running' (timeout: {timeout}s)...")
    start = time.time()
    last = None
    while time.time() - start < timeout:
        app = get_application(host, api_key, project_id, app_id)
        status = (app.get("status") or "unknown").lower()
        if status != last:
            print(f"      [{int(time.time() - start)}s] status: {status}")
            last = status
        if app_is_running(status):
            print("   ✓ Application is running")
            return True
        if app_is_failed(status):
            print(f"   ✗ Application entered a failed state: {status}", file=sys.stderr)
            return False
        time.sleep(10)
    print(f"   ✗ Timed out waiting for 'running' ({timeout}s)", file=sys.stderr)
    return False


def emit_url(host: str, api_key: str, project_id: str, app_id: str, subdomain: str) -> None:
    """Print the deployed app URL and write it to /tmp/app_url.txt (for CI summary)."""
    app = get_application(host, api_key, project_id, app_id)
    url = app.get("url") or f"(subdomain '{subdomain}' — check the CML Applications page for the full URL)"
    print(f"   url:       {url}")
    try:
        with open("/tmp/app_url.txt", "w") as f:
            f.write(url)
    except OSError:
        pass


def _selfcheck() -> None:
    """No-network assertions for the pure helpers."""
    assert app_is_running("running") and app_is_running("RUNNING")
    assert not app_is_running("starting") and not app_is_running("stopped")
    assert app_is_failed("failed") and app_is_failed("stopped") and app_is_failed("startup_failed")
    assert not app_is_failed("running") and not app_is_failed("starting")
    assert normalize_host("https://x.site/api/v2") == "https://x.site"
    assert normalize_host("https://x.site/api/v1/") == "https://x.site"
    assert normalize_host("https://x.site/") == "https://x.site"
    print("deploy_application selfcheck: OK")


def main() -> None:
    p = argparse.ArgumentParser(description="Deploy the survey app as a CML Application")
    p.add_argument("--host", default=os.environ.get("CDSW_API_URL") or os.environ.get("CML_HOST"),
                   help="CML host, e.g. https://ml-xxxx.cloudera.site (default: $CDSW_API_URL/$CML_HOST)")
    p.add_argument("--api-key", default=os.environ.get("CDSW_APIV2_KEY") or os.environ.get("CML_API_KEY"),
                   help="CML API v2 key (default: $CDSW_APIV2_KEY/$CML_API_KEY)")
    p.add_argument("--project-id", default=os.environ.get("CDSW_PROJECT_ID"),
                   help="Project ID (default: $CDSW_PROJECT_ID)")
    p.add_argument("--name", default="AI Use Case Discovery Survey")
    p.add_argument("--subdomain", default="ucd-survey", help="URL subdomain (a-z0-9-)")
    p.add_argument("--script", default="cai_integration/start_app.py")
    p.add_argument("--runtime-identifier", default=os.environ.get("RUNTIME_IDENTIFIER"),
                   help="ML Runtime identifier — a Node 20+ runtime (default: $RUNTIME_IDENTIFIER; "
                        "see cai_integration/README.md)")
    p.add_argument("--admin-token", default=os.environ.get("ADMIN_TOKEN"),
                   help="ADMIN_TOKEN for the app (default: $ADMIN_TOKEN)")
    p.add_argument("--cpu", type=int, default=2)
    p.add_argument("--memory", type=int, default=4)
    p.add_argument("--database-url", default=os.environ.get("DATABASE_URL"),
                   help="Optional Postgres URL; if set, Postgres is used instead of SQLite")
    p.add_argument("--sqlite-path", default="/home/cdsw/data/survey.db")
    p.add_argument("--base-path", default=os.environ.get("NEXT_PUBLIC_BASE_PATH"))
    p.add_argument("--public", action="store_true",
                   help="Set bypass_authentication=True (NOT recommended for customer data)")
    p.add_argument("--wait", dest="wait", action="store_true", default=True,
                   help="Poll until the Application is running (default)")
    p.add_argument("--no-wait", dest="wait", action="store_false",
                   help="Return immediately after create/restart (don't poll status)")
    p.add_argument("--wait-timeout", type=int, default=300,
                   help="Seconds to wait for 'running' before failing (default 300)")
    p.add_argument("--selfcheck", action="store_true",
                   help="Run no-network assertions on the pure helpers and exit")
    args = p.parse_args()

    if args.selfcheck:
        _selfcheck()
        return

    missing = [k for k in ("host", "api_key", "project_id", "admin_token", "runtime_identifier")
               if not getattr(args, k)]
    if missing:
        print(f"✗ Missing required values: {', '.join(missing)}. "
              f"Pass them as flags or set the corresponding env vars.", file=sys.stderr)
        sys.exit(1)

    host = normalize_host(args.host)

    payload = _build_payload(
        name=args.name, subdomain=args.subdomain, script=args.script,
        runtime_identifier=args.runtime_identifier, admin_token=args.admin_token,
        cpu=args.cpu, memory=args.memory, bypass_authentication=args.public,
        database_url=args.database_url, sqlite_path=args.sqlite_path, base_path=args.base_path,
    )

    # Idempotent: delete any existing Application, then create with the current config
    # (so a changed script/env/runtime always takes effect). CML PATCH rejects the
    # create payload, so delete+create is the reliable converge path.
    existing = find_application(host, args.api_key, args.project_id, args.name, args.subdomain)
    if existing:
        print(f"   Existing Application {existing} found — deleting to apply current config.")
        delete_application(host, args.api_key, args.project_id, existing)
    app = create_application(host, args.api_key, args.project_id, payload=payload)
    app_id = app.get("id")
    print("✓ Application created:")
    print(f"   id:        {app_id}")
    print(f"   subdomain: {app.get('subdomain')}")
    if not args.public:
        print("   auth:      Workbench SSO (bypass_authentication=False)")

    # Fail loudly if the app doesn't actually come up (broken runtime, missing
    # dep, port issue) — otherwise CI reports a false green.
    if args.wait and app_id:
        if not wait_for_running(host, args.api_key, args.project_id, app_id, args.wait_timeout):
            sys.exit(1)
    if app_id:
        emit_url(host, args.api_key, args.project_id, app_id, args.subdomain)


if __name__ == "__main__":
    main()
