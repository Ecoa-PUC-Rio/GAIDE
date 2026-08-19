#!/bin/bash
# Claude Code PostToolUse adapter for scripts/check-file.sh: extracts the
# edited file path from the hook payload and runs the portable syntax check.
# Exit 2 feeds stderr back to the agent.
FILE="$(HOOK_INPUT="$(cat)" python3 -c 'import json,os; print(json.loads(os.environ.get("HOOK_INPUT") or "{}").get("tool_input",{}).get("file_path",""))')"
"$CLAUDE_PROJECT_DIR"/scripts/check-file.sh "$FILE" || exit 2
exit 0
