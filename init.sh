#!/bin/bash
# Session bootstrap — run at the start of every working session, BEFORE any new
# work. The goal: dependencies installed, tests green, app responding. A failure
# here means the previous session left the project broken; fix that first
# (see the session protocol in AGENTS.md).
#
# This is a template: the auto-detection below covers common stacks so it works
# out of the box, but replace it with your project's real bring-up as soon as
# you have one.
set -euo pipefail

echo "== GAIDE init: bring-up + health check =="

# 1. Dependencies
if [ -f package.json ]; then
  npm install --silent
elif [ -f requirements.txt ] || [ -f pyproject.toml ]; then
  [ -d .venv ] || python3 -m venv .venv
  # shellcheck disable=SC1091
  source .venv/bin/activate
  if [ -f requirements.txt ]; then pip install -q -r requirements.txt; fi
  if [ -f pyproject.toml ]; then pip install -q -e .; fi
fi

# 2. Test suite — red at session start means broken inherited state
if [ -f package.json ] && grep -q '"test"' package.json; then
  npm test --silent
elif command -v pytest >/dev/null 2>&1 && [ -d tests ]; then
  pytest -q || [ $? -eq 5 ]  # exit 5 = no tests collected yet; fine for a fresh template
fi

# 3. Health check — start the app and hit it as a user would.
# TODO: replace with your project's real check. Example:
#   npm run dev & SERVER_PID=$!
#   sleep 3
#   curl -fsS http://localhost:3000/health || { kill "$SERVER_PID"; exit 1; }
#   kill "$SERVER_PID"

echo "== init OK =="
