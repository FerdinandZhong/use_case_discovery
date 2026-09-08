# Ensure Node 20 + npm are on PATH. Stock Cloudera AI (CML) runtimes are Python-only,
# so rather than require a custom Node runtime we install a user-space Node into
# project storage ($HOME, NFS-persistent) — shared by the Build Job and the
# Application, downloaded once, and a NO-OP when a real Node runtime is present.
#
# POSIX-safe: `source`/`.` this from bash (start-app.sh) or dash (build_app.py's shell).
# set -o pipefail is intentionally omitted (dash doesn't support it).
set -eu

NODE_VERSION="${NODE_VERSION:-20.18.1}"
NODE_HOME="${NODE_HOME:-$HOME/.local/node}"
BIN="$NODE_HOME/node-v${NODE_VERSION}/bin"

# Already have npm on PATH (e.g. a proper Node runtime)? Nothing to do.
if command -v npm >/dev/null 2>&1; then
  return 0 2>/dev/null || exit 0
fi

if [ ! -x "$BIN/npm" ]; then
  case "$(uname -m)" in
    x86_64|amd64) ARCH=x64 ;;
    aarch64|arm64) ARCH=arm64 ;;
    *) echo "[ensure_node] unsupported arch: $(uname -m)" >&2; exit 1 ;;
  esac
  TARBALL="node-v${NODE_VERSION}-linux-${ARCH}.tar.xz"
  URL="https://nodejs.org/dist/v${NODE_VERSION}/${TARBALL}"
  echo "[ensure_node] npm not found — installing Node ${NODE_VERSION} (${ARCH}) into ${NODE_HOME}"
  mkdir -p "$NODE_HOME"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$URL" -o "/tmp/${TARBALL}"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "/tmp/${TARBALL}" "$URL"
  else
    echo "[ensure_node] neither curl nor wget available to download Node" >&2; exit 1
  fi
  tar -xJf "/tmp/${TARBALL}" -C "$NODE_HOME"
  # Normalize the arch-specific dir to a stable name so $BIN is arch-independent.
  rm -rf "$NODE_HOME/node-v${NODE_VERSION}"
  mv "$NODE_HOME/node-v${NODE_VERSION}-linux-${ARCH}" "$NODE_HOME/node-v${NODE_VERSION}"
  rm -f "/tmp/${TARBALL}"
fi

export PATH="$BIN:$PATH"
echo "[ensure_node] using node $(node --version), npm $(npm --version)"
