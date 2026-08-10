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

import requests


def create_application(
    host: str,
    api_key: str,
    project_id: str,
    *,
    name: str,
    subdomain: str,
    script: str,
    runtime_identifier: str,
    admin_token: str,
    cpu: int,
    memory: int,
    bypass_authentication: bool,
    database_url: str | None,
    sqlite_path: str,
    base_path: str | None,
) -> dict:
    url = f"{host.rstrip('/')}/api/v2/projects/{project_id}/applications"

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

    payload = {
        "name": name,
        "subdomain": subdomain,
        "script": script,
        "cpu": cpu,
        "memory": memory,
        "runtime_identifier": runtime_identifier,
        "bypass_authentication": bypass_authentication,
        "environment": environment,
    }

    resp = requests.post(
        url,
        json=payload,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        timeout=60,
    )
    if resp.status_code >= 400:
        print(f"✗ Failed ({resp.status_code}): {resp.text}", file=sys.stderr)
        resp.raise_for_status()
    return resp.json()


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
    p.add_argument("--script", default="cai_integration/start-app.sh")
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
    args = p.parse_args()

    missing = [k for k in ("host", "api_key", "project_id", "admin_token", "runtime_identifier")
               if not getattr(args, k)]
    if missing:
        print(f"✗ Missing required values: {', '.join(missing)}. "
              f"Pass them as flags or set the corresponding env vars.", file=sys.stderr)
        sys.exit(1)

    host = normalize_host(args.host)

    # Idempotent: restart an existing Application (picks up freshly-built code)
    # rather than failing on a duplicate name/subdomain.
    existing = find_application(host, args.api_key, args.project_id, args.name, args.subdomain)
    if existing:
        app = restart_application(host, args.api_key, args.project_id, existing)
        print(f"✓ Application restarted: {app.get('id', existing)}")
        return

    app = create_application(
        host, args.api_key, args.project_id,
        name=args.name, subdomain=args.subdomain, script=args.script,
        runtime_identifier=args.runtime_identifier, admin_token=args.admin_token,
        cpu=args.cpu, memory=args.memory,
        bypass_authentication=args.public,
        database_url=args.database_url, sqlite_path=args.sqlite_path,
        base_path=args.base_path,
    )
    print("✓ Application created:")
    print(f"   id:        {app.get('id')}")
    print(f"   subdomain: {app.get('subdomain')}")
    print(f"   status:    {app.get('status')}")
    if not args.public:
        print("   auth:      Workbench SSO (bypass_authentication=False)")


if __name__ == "__main__":
    main()
