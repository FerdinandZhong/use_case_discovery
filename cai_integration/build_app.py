#!/usr/bin/env python3
"""
Build job for the Use Case Discovery CML deployment.

Second job in the chain (see cai_integration/jobs_config.yaml):
    git_sync  ->  build  ->  deploy

Runs `npm ci && npm run build` once, on the shared project filesystem, so the
CML Application (cai_integration/start-app.sh) starts in seconds with `next
start` instead of building on every cold start.

Requires a Node 20+ ML Runtime (npm on PATH). Runs at the repo root.
"""

import os
import subprocess


def _repo_dir() -> str:
    # No __file__ in the CML job engine; fall back to the git working copy.
    if os.environ.get("REPO_DIR"):
        return os.environ["REPO_DIR"]
    try:
        return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    except NameError:
        for cand in ("/home/cdsw", os.getcwd()):
            if os.path.isdir(os.path.join(cand, "package.json")):
                return cand
        return "/home/cdsw"


REPO_DIR = _repo_dir()


def run(cmd) -> None:
    print(f"Running: {cmd}  (cwd={REPO_DIR})")
    # Stream output live; raise (never sys.exit) so CML marks failure correctly.
    result = subprocess.run(cmd, shell=True, cwd=REPO_DIR)
    if result.returncode != 0:
        raise RuntimeError(f"command failed ({result.returncode}): {cmd}")


def main() -> None:
    print("=" * 70)
    print("Use Case Discovery — Build")
    print("=" * 70)
    print(f"Repo dir: {REPO_DIR}")

    if not os.path.isfile(os.path.join(REPO_DIR, "package.json")):
        raise RuntimeError(f"no package.json in {REPO_DIR}")

    # NEXT_TELEMETRY_DISABLED keeps the build quiet/offline-friendly.
    os.environ.setdefault("NEXT_TELEMETRY_DISABLED", "1")
    # Stock CML runtimes are Python-only — ensure_node.sh installs Node into project
    # storage if npm is missing (no-op on a Node runtime), then we build. One shell
    # so the PATH export from sourcing carries into npm.
    # `npm install` (not `npm ci`): the committed package-lock.json is generated on
    # macOS and omits linux-only optional native deps (@emnapi/*), so strict `npm ci`
    # fails on the linux CML runner. install resolves per-platform.
    # ponytail: non-strict install, acceptable ceiling; pin a linux lockfile if repro matters.
    run(". cai_integration/ensure_node.sh && npm install --no-audit --no-fund && npm run build")
    print("Build complete: .next produced, node_modules installed.")


# CML job engine: no __main__ guard, no sys.exit. Kept for local runs.
main()
