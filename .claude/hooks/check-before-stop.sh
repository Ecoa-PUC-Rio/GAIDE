#!/bin/bash
# Claude Code Stop adapter for scripts/check-clean-state.sh: before the agent
# ends its turn with uncommitted changes, the portable check verifies no
# secrets and a green test suite. Exit 2 blocks the stop and feeds stderr back
# to the agent.
HOOK_INPUT="$(cat)"

# Guard against blocking loops: if this hook already fired for this stop,
# let the agent finish (it has seen the failure and reported it).
echo "$HOOK_INPUT" | python3 -c 'import json,sys; sys.exit(1 if json.load(sys.stdin).get("stop_hook_active") else 0)' || exit 0

MSG="$("$CLAUDE_PROJECT_DIR"/scripts/check-clean-state.sh 2>&1)" || { echo "Stop blocked: $MSG" >&2; exit 2; }
exit 0
