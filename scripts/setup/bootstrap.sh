#!/usr/bin/env bash
# One-command local environment bootstrap, referenced from README.md and
# CONTRIBUTING.md. Cross-platform note: this script targets bash (available
# via WSL2/Git Bash on Windows, native on macOS/Linux) per the project's
# cross-platform requirement — see docs/architecture, Section 4 (Primary
# Goals: Windows/Linux/macOS all supported).
set -euo pipefail

echo "==> Working around a known Nx daemon issue on long paths"
# See .github/workflows/ci.yml for the full explanation: Nx's daemon socket
# path can exceed OS limits on deep clone paths (this is not Windows-only,
# but is more likely there given typical path depths). Pointing it at a
# short tmp dir avoids the failure. Add this to your shell profile if you
# want it to persist beyond this script.
export NX_SOCKET_DIR="${NX_SOCKET_DIR:-/tmp/nx-agentdock}"
mkdir -p "$NX_SOCKET_DIR"

echo "==> Checking Node.js version against .nvmrc"
required_node="$(cat .nvmrc)"
required_major="${required_node%%.*}"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install Node.js ${required_node} first (see https://nodejs.org or use nvm/fnm)." >&2
  exit 1
fi
current_node="$(node -v)"
current_major="${current_node#v}"
current_major="${current_major%%.*}"
if [ "$current_major" != "$required_major" ]; then
  echo "Node.js major version mismatch: this repo requires Node ${required_node} (major v${required_major})," >&2
  echo "but 'node' on your PATH is ${current_node}. Switch with 'nvm use' (reads .nvmrc) or 'fnm use'." >&2
  exit 1
fi

echo "==> Enabling Corepack (for pinned pnpm version)"
corepack enable

echo "==> Installing dependencies"
pnpm install

echo "==> Copying .env.example to .env (skipped if .env already exists)"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env — review it before running anything that reads it."
else
  echo ".env already exists, leaving it untouched."
fi

echo "==> Setting up git hooks"
pnpm exec husky

echo "==> Done. Run 'pnpm nx graph' to explore the workspace, or see CONTRIBUTING.md for next steps."
