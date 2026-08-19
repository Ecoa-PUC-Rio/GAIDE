#!/bin/bash
# Portable check: security feedback on a single edited file. Two layers, each
# skipped silently when its tool is not installed (install semgrep and
# osv-scanner to activate — see README):
#   SAST  semgrep on the edited file (pinned registry rulesets, cached locally)
#   SCA   osv-scanner when the file is a dependency lockfile/manifest
# Exit 1 with the findings on stderr; exit 0 otherwise. Findings block — tool
# errors (offline registry, unsupported language) never do. Claude Code calls
# this from a PostToolUse hook (.claude/hooks/check-security.sh); other tools
# run it directly after each edit. Full-repo scans belong to CI, not here.
#   usage: scripts/check-security.sh <file>
FILE="$1"
[ -f "$FILE" ] || exit 0

case "$(basename "$FILE")" in
  package-lock.json|pnpm-lock.yaml|yarn.lock|requirements*.txt|poetry.lock|uv.lock|Pipfile.lock|go.mod|Cargo.lock|Gemfile.lock|composer.lock|pom.xml)
    command -v osv-scanner >/dev/null 2>&1 || exit 0
    OUT="$(osv-scanner scan source -L "$FILE" 2>&1)"
    STATUS=$?
    # exit 1 = known vulnerabilities; other non-zero codes are tool/setup errors
    if [ "$STATUS" -eq 1 ]; then
      { echo "Blocked: osv-scanner found known vulnerabilities in $(basename "$FILE")."
        echo "Resolve by moving to patched versions — findings are fixed, not suppressed (Constitution Principle 10)."
        echo "$OUT" | head -40; } >&2
      exit 1
    fi
    exit 0
    ;;
esac

command -v semgrep >/dev/null 2>&1 || exit 0
case "$FILE" in
  *.md|*.txt|*.csv|*.lock) exit 0 ;;
esac
OUT="$(semgrep scan --quiet --metrics=off --error --config p/security-audit --config p/secrets "$FILE" 2>&1)"
STATUS=$?
# with --error: exit 1 = findings; exit >= 2 = scan error (never blocks)
if [ "$STATUS" -eq 1 ]; then
  { echo "Blocked: semgrep flagged security finding(s) in $FILE."
    echo "Fix the code. If a finding is genuinely a false positive, suppress it in a dedicated commit that explains why (Constitution Principle 10)."
    echo "$OUT" | head -40; } >&2
  exit 1
fi
exit 0
