#!/bin/bash
# Portable check: is the working tree safe to walk away from? With uncommitted
# changes present, verifies (a) no secrets in them and (b) the test suite is
# green. Exit 1 with the reason on stderr; exit 0 otherwise (including when
# there is no diff). Claude Code calls this from a Stop hook
# (.claude/hooks/check-before-stop.sh); other agents and humans run it before
# ending a session (Principle 8: fail visibly).
#   usage: scripts/check-clean-state.sh
git diff --quiet && git diff --staged --quiet && exit 0

# Secrets: git-aware scan of the uncommitted changes. Deeper than the
# content-level regex check (entropy + full ruleset), and catches files that
# entered via shell commands instead of editor writes. Skipped silently when
# gitleaks is not installed; blocks only on leaks (exit 1), never on tool errors.
if command -v gitleaks >/dev/null 2>&1; then
  gitleaks protect --no-banner --redact >/dev/null 2>&1
  if [ $? -eq 1 ]; then
    echo "Uncommitted changes contain secret(s) per gitleaks. Remove them before ending (Constitution Principle 6); run 'gitleaks protect --redact' to see the findings." >&2
    exit 1
  fi
fi

if [ -f package.json ] && grep -q '"test"' package.json; then
  npm test --silent >/dev/null 2>&1 || {
    echo "Uncommitted changes with a failing test suite (npm test). Fix the tests or report the failure explicitly before ending." >&2
    exit 1
  }
elif command -v pytest >/dev/null 2>&1 && [ -d tests ]; then
  pytest -q >/dev/null 2>&1
  STATUS=$?
  # exit 5 = no tests collected; acceptable for a fresh template
  if [ "$STATUS" -ne 0 ] && [ "$STATUS" -ne 5 ]; then
    echo "Uncommitted changes with a failing test suite (pytest). Fix the tests or report the failure explicitly before ending." >&2
    exit 1
  fi
fi
exit 0
