#!/usr/bin/env python3
"""
Trigger the git_sync root job and monitor it to completion.

CML's parent-child job chain handles the rest autonomously:
    git_sync  →  (CML auto-triggers)  build

This script only triggers and waits for git_sync. The build job fires on its
own when git_sync succeeds. After build, launch the Application once with
cai_integration/deploy_application.py (or via the CML UI).

Usage:
    python cai_integration/trigger_jobs.py --project-id <project_id>

Required env: CML_HOST, CML_API_KEY
"""

import argparse
import os
import sys
import time
import requests
from typing import Optional

ROOT_JOB_NAME = "Git Repository Sync"
ROOT_JOB_TIMEOUT = 300    # git fetch + reset; should finish in < 2 min
BUILD_JOB_NAME = "Build App"
BUILD_JOB_TIMEOUT = 1800  # npm install + next build
LAUNCH_JOB_NAME = "Launch Application"
LAUNCH_JOB_TIMEOUT = 600  # create/replace the Application + wait for running
AUTO_TRIGGER_WINDOW = 120  # wait this long for CML to auto-trigger a child before triggering it ourselves


class JobTrigger:

    def __init__(self):
        self.cml_host = os.environ.get("CML_HOST")
        self.api_key = os.environ.get("CML_API_KEY")

        if not all([self.cml_host, self.api_key]):
            print("Error: Missing required environment variables")
            print("   Required: CML_HOST, CML_API_KEY")
            sys.exit(1)

        self.api_url = f"{self.cml_host.rstrip('/')}/api/v2"
        self.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Bearer {self.api_key.strip()}",
        }

    def make_request(self, method, endpoint, data=None, params=None) -> Optional[dict]:
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        try:
            response = requests.request(
                method=method, url=url, headers=self.headers,
                json=data, params=params, timeout=30,
            )
            if 200 <= response.status_code < 300:
                return response.json() if response.text else {}
            print(f"API Error ({response.status_code}): {response.text[:200]}")
            return None
        except Exception as e:
            print(f"Request error: {e}")
            return None

    def find_job_id(self, project_id: str, job_name: str) -> Optional[str]:
        result = self.make_request("GET", f"projects/{project_id}/jobs")
        if result:
            for job in result.get("jobs", []):
                if job.get("name") == job_name:
                    return job.get("id")
        return None

    def trigger_job(self, project_id: str, job_id: str) -> Optional[str]:
        result = self.make_request("POST", f"projects/{project_id}/jobs/{job_id}/runs")
        return result.get("id") if result else None

    def wait_for_new_run(self, project_id, job_id, job_name, trigger_epoch, timeout) -> Optional[str]:
        """Poll until a run for job_id appears that was created after trigger_epoch
        (the run CML auto-triggered). Returns its run_id, or None on timeout.

        Mirrors ray-serve-cai: the run-list field is `runs` and CML does not honor a
        sort param, so we filter by created_at rather than trusting list order — a
        prior successful run must not be mistaken for the new one.
        """
        print(f"   Waiting for CML to auto-trigger: {job_name} ...")
        start = time.time()
        while time.time() - start < timeout:
            result = self.make_request(
                "GET", f"projects/{project_id}/jobs/{job_id}/runs", params={"page_size": 5}
            )
            for run in (result or {}).get("runs", []):
                run_id = run.get("id")
                if not run_id:
                    continue
                # An actively-running run after the parent succeeded is unambiguously the
                # auto-triggered child — accept it regardless of created_at (avoids clock-skew
                # misses that then collide with an explicit trigger via "already active").
                status = (run.get("status") or "").lower()
                if any(s in status for s in ("scheduling", "running", "starting", "pending")):
                    print(f"   [{int(time.time() - start)}s] Active run detected: {run_id} ({status})")
                    return run_id
                created_at = run.get("created_at", "")
                if not created_at:
                    continue
                try:
                    from datetime import datetime, timezone
                    ts = created_at.rstrip("Z")
                    fmt = "%Y-%m-%dT%H:%M:%S.%f" if "." in ts else "%Y-%m-%dT%H:%M:%S"
                    dt = datetime.strptime(ts, fmt).replace(tzinfo=timezone.utc)
                    if dt.timestamp() > trigger_epoch:
                        print(f"   [{int(time.time() - start)}s] New run detected: {run_id}")
                        return run_id
                except Exception:
                    return run_id
            time.sleep(15)
        print(f"   Timed out waiting for {job_name} to be auto-triggered ({timeout}s)")
        return None

    def wait_for_job_completion(self, project_id, job_id, run_id, timeout) -> bool:
        print(f"   Waiting for job to complete (timeout: {timeout}s)...")
        start = time.time()
        last_status = None

        while time.time() - start < timeout:
            result = self.make_request(
                "GET", f"projects/{project_id}/jobs/{job_id}/runs/{run_id}"
            )
            if result:
                status = result.get("status", "unknown").lower()
                if status != last_status:
                    print(f"      [{int(time.time() - start)}s] Status: {status}")
                    last_status = status
                if status in ("succeeded", "success", "engine_succeeded"):
                    print("   Job completed successfully")
                    return True
                if status in ("failed", "error", "engine_failed", "killed", "stopped", "timedout"):
                    print(f"   Job failed with status: {status}")
                    return False
            time.sleep(10)

        print(f"   Job timeout ({int(time.time() - start)}s / {timeout}s)")
        return False

    def run(self, project_id: str) -> bool:
        print("=" * 70)
        print(f"Triggering root job: {ROOT_JOB_NAME}")
        print("(CML will auto-trigger Build App when this succeeds)")
        print("=" * 70)

        job_id = self.find_job_id(project_id, ROOT_JOB_NAME)
        if not job_id:
            print(f"Job not found: {ROOT_JOB_NAME}")
            print("   Run the create-jobs step first.")
            return False
        print(f"   Job ID: {job_id}")

        run_id = self.trigger_job(project_id, job_id)
        if not run_id:
            print("   Failed to trigger job")
            return False
        # Epoch BEFORE the run completes, so the Build App run (created after
        # git_sync succeeds) is always newer than this timestamp.
        trigger_epoch = time.time()
        print(f"   Run ID: {run_id}\n")

        if not self.wait_for_job_completion(project_id, job_id, run_id, ROOT_JOB_TIMEOUT):
            print(f"{ROOT_JOB_NAME} failed")
            return False

        # Walk the rest of the chain: Build App → Launch Application. CML *should*
        # auto-trigger each child when its parent succeeds (parent→child), but that
        # dependency (and its timestamp detection) isn't reliable — the symptom is a
        # long "waiting to be auto-triggered" hang. So for each: briefly look for an
        # auto-triggered run; if none appears, trigger it explicitly.
        if not self._await_child(project_id, BUILD_JOB_NAME, BUILD_JOB_TIMEOUT, trigger_epoch):
            return False
        if not self._await_child(project_id, LAUNCH_JOB_NAME, LAUNCH_JOB_TIMEOUT, trigger_epoch):
            return False

        print("=" * 70)
        print(f"{ROOT_JOB_NAME} → {BUILD_JOB_NAME} → {LAUNCH_JOB_NAME} complete. Application is live.")
        print("=" * 70)
        return True

    def _await_child(self, project_id: str, job_name: str, timeout: int, trigger_epoch: float) -> bool:
        """Run a child job and wait. Explicitly trigger it; if CML already auto-triggered
        it (parent→child), the trigger 400s with 'already active' and we grab that active
        run instead. Either way we get one run_id to wait on — no reliance on flaky
        run-list detection of an auto-trigger."""
        job_id = self.find_job_id(project_id, job_name)
        if not job_id:
            print(f"✗ Job not found: {job_name} — run the create-jobs step first.")
            return False
        run_id = self.trigger_job(project_id, job_id)
        if run_id:
            print(f"   Triggered {job_name}: run {run_id}")
        else:
            # 'already active' (or a transient trigger error): find the run CML is running.
            run_id = self._await_active_run(project_id, job_id, job_name)
            if not run_id:
                print(f"   Could not obtain a run for {job_name}")
                return False
            print(f"   Using CML-auto-triggered run: {run_id}")
        if not self.wait_for_job_completion(project_id, job_id, run_id, timeout):
            print(f"{job_name} failed")
            return False
        return True

    def _list_runs(self, project_id: str, job_id: str) -> list:
        """List a job's runs, robust to the response field name across CML versions."""
        result = self.make_request(
            "GET", f"projects/{project_id}/jobs/{job_id}/runs", params={"page_size": 20}
        ) or {}
        for key in ("runs", "job_runs", "jobRuns", "items", "data"):
            v = result.get(key)
            if isinstance(v, list):
                return v
        for v in result.values():  # fall back to the first list-of-objects in the payload
            if isinstance(v, list) and (not v or isinstance(v[0], dict)):
                return v
        return []

    def _await_active_run(self, project_id: str, job_id: str, job_name: str, tries: int = 6) -> Optional[str]:
        """Return the id of the job's active (or most recent) run, retrying briefly for the
        runs list to become consistent after an auto-trigger."""
        for _ in range(tries):
            runs = self._list_runs(project_id, job_id)
            for run in runs:  # prefer an actively-running run
                if any(s in (run.get("status") or "").lower()
                       for s in ("scheduling", "running", "starting", "pending")):
                    return run.get("id")
            if runs:
                return max(runs, key=lambda r: r.get("created_at", "")).get("id")
            time.sleep(5)
        return None


    def sync_only(self, project_id: str) -> bool:
        """Run just git_sync to pull the latest code into the project working dir.
        Used before create_jobs so newly-added job scripts (e.g. launch_app.py) exist
        in the project when CML validates them. No-op on a brand-new project (no
        git_sync job yet) — its clone is already at HEAD."""
        job_id = self.find_job_id(project_id, ROOT_JOB_NAME)
        if not job_id:
            print(f"{ROOT_JOB_NAME} not found — new project (fresh clone); nothing to pre-sync.")
            return True
        print(f"Pre-syncing project code via {ROOT_JOB_NAME} ...")
        run_id = self.trigger_job(project_id, job_id)
        if not run_id:
            print("   Failed to trigger git_sync")
            return False
        return self.wait_for_job_completion(project_id, job_id, run_id, ROOT_JOB_TIMEOUT)


def main():
    parser = argparse.ArgumentParser(
        description="Run the CML deploy chain (git_sync → build → launch)"
    )
    parser.add_argument("--project-id", required=True, help="CML project ID")
    parser.add_argument("--sync-only", action="store_true",
                        help="Only run git_sync (pull latest code), then exit — use before create_jobs")
    args = parser.parse_args()

    try:
        trigger = JobTrigger()
        if args.sync_only:
            sys.exit(0 if trigger.sync_only(args.project_id) else 1)
        sys.exit(0 if trigger.run(args.project_id) else 1)
    except KeyboardInterrupt:
        print("\nCancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nUnexpected error: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
