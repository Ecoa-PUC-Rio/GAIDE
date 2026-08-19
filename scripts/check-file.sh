#!/bin/bash
# Portable check: fast per-file syntax feedback right after an edit, so the
# agent (or human) sees breakage immediately instead of review finding it.
# Exit 1 with the errors on stderr; exit 0 otherwise. Claude Code calls this
# from a PostToolUse hook (.claude/hooks/check-edited-file.sh); other tools
# run it directly after each edit. Checks are per-file and cheap; the full
# suite runs via init.sh. Extend per stack (ruff, eslint, gofmt...) — keep
# each check under ~2s or it will drag every edit.
#   usage: scripts/check-file.sh <file>
FILE="$1"
[ -f "$FILE" ] || exit 0

case "$FILE" in
  *.sh)
    ERRORS="$(bash -n "$FILE" 2>&1)" || { echo "$ERRORS" | head -20 >&2; exit 1; }
    ;;
  *.json)
    ERRORS="$(python3 -m json.tool "$FILE" 2>&1 >/dev/null)" || { echo "Invalid JSON in $FILE: $ERRORS" | head -20 >&2; exit 1; }
    ;;
  *.py)
    ERRORS="$(python3 -m py_compile "$FILE" 2>&1)" || { echo "$ERRORS" | head -20 >&2; exit 1; }
    ;;
esac
exit 0
