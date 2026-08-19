#!/bin/bash
# Portable check: scans content on stdin for known secret patterns.
# Exit 1 with a message on a match; exit 0 otherwise. Enforces Constitution
# Principle 6 (secrets never enter the repo) as a mechanism, in any tool:
# Claude Code calls this from a PreToolUse hook (.claude/hooks/block-secrets.sh);
# other agents and humans pipe file content in by hand or from their own hooks.
#   usage: scripts/check-secrets.sh < file
# The heredoc occupies python's stdin, so the content is passed via env.
CONTENT="$(cat)" python3 - <<'PY'
import os, re, sys

content = os.environ.get("CONTENT") or ""

# Placeholder values (as used in .env.example files) are allowed.
PLACEHOLDER = re.compile(r"YOUR_|CHANGE_?ME|PLACEHOLDER|EXAMPLE|xxx|<[^>]+>", re.I)

PATTERNS = [
    (r"-----BEGIN [A-Z ]*PRIVATE KEY-----", "private key material"),
    (r"\bAKIA[0-9A-Z]{16}\b", "AWS access key ID"),
    (r"\bghp_[A-Za-z0-9]{36}\b", "GitHub personal access token"),
    (r"\bgithub_pat_[A-Za-z0-9_]{22,}\b", "GitHub fine-grained token"),
    (r"\bsk-ant-[A-Za-z0-9_\-]{20,}\b", "Anthropic API key"),
    (r"\bsk-[A-Za-z0-9]{32,}\b", "API secret key"),
    (r"\bxox[baprs]-[A-Za-z0-9\-]{10,}\b", "Slack token"),
]

for pattern, label in PATTERNS:
    match = re.search(pattern, content)
    if match and not PLACEHOLDER.search(match.group(0)):
        print(
            f"Blocked: content matches a secret pattern ({label}). "
            "Constitution Principle 6: secrets never enter the repository. "
            "Use .env.example with placeholder values instead.",
            file=sys.stderr,
        )
        sys.exit(1)
PY
