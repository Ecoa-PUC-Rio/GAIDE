#!/bin/bash
# Claude Code PostToolUse adapter for scripts/check-security.sh: extracts the
# edited file path from the hook payload and runs the portable SAST/SCA check.
# Exit 2 feeds the findings back to the agent while the edit context is fresh.
FILE="$(HOOK_INPUT="$(cat)" python3 -c 'import json,os; print(json.loads(os.environ.get("HOOK_INPUT") or "{}").get("tool_input",{}).get("file_path",""))')"
"$CLAUDE_PROJECT_DIR"/scripts/check-security.sh "$FILE" || exit 2
exit 0
