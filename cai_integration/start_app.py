#!/usr/bin/env python3
"""CML Application entrypoint — Python, not bash.

CML executes the Application's `script` inside the runtime's Python/IPython engine,
so pointing it at a bash script fails with `SyntaxError: set -euo pipefail`. This thin
Python wrapper hands off to the real shell startup (cai_integration/start-app.sh) via
bash, which puts Node on PATH (ensure_node.sh) and runs `next start` on $CDSW_APP_PORT.
"""
import os
import subprocess


def _repo_dir() -> str:
    # No __file__ in the CML engine; fall back to the git working copy.
    if os.environ.get("REPO_DIR"):
        return os.environ["REPO_DIR"]
    try:
        return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    except NameError:
        for cand in ("/home/cdsw", os.getcwd()):
            if os.path.isfile(os.path.join(cand, "package.json")):
                return cand
        return "/home/cdsw"


def main() -> None:
    repo = _repo_dir()
    print(f"[start_app] repo={repo}; launching cai_integration/start-app.sh via bash")
    # Blocks for the life of the app (start-app.sh execs `next start` in the
    # foreground). Never sys.exit — the CML engine treats SystemExit as a crash;
    # subprocess raises CalledProcessError on failure, which correctly fails the app.
    subprocess.run(["bash", "cai_integration/start-app.sh"], cwd=repo, check=True)


# CML runs this file top-level (no __main__); keep the call unguarded like the Jobs.
main()
