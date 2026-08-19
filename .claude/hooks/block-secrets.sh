#!/bin/bash
# Claude Code PreToolUse adapter for scripts/check-secrets.sh: extracts the
# Write/Edit content from the hook payload and pipes it to the portable check.
# Exit code 2 rejects the tool call and feeds stderr back to the agent.
CONTENT="$(HOOK_INPUT="$(cat)" python3 -c '
import json, os
data = json.loads(os.environ.get("HOOK_INPUT") or "{}")
tool_input = data.get("tool_input", {})
print("\n".join(str(tool_input.get(k, "")) for k in ("content", "new_string")))
')"
echo "$CONTENT" | "$CLAUDE_PROJECT_DIR"/scripts/check-secrets.sh || exit 2
exit 0
