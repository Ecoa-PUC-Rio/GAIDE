# GAIDE workspace rules

The canonical briefing for this repository is `AGENTS.md` at the repo root. Read it at session start and follow it in full — session protocol (`./init.sh`, `PROGRESS.md`), mandatory operating principles, and ground rules.

Non-negotiables, in brief:

- Read `specs/constitution.md` before any code change; follow the SDD flow (spec → plan → tasks → implementation). If no spec exists, write one first (`/spec-writer`).
- Never edit tests or task lists to make work appear done (Principle 9); never silence security scanners (Principle 10).
- Secrets never enter versioned files; never read `.env` files, private keys, or credential stores; never `git push --force` or `git reset --hard`.
- This tool has no inline enforcement hooks, so run the portable checks yourself: `scripts/check-file.sh` and `scripts/check-security.sh` after edits, `scripts/check-clean-state.sh` before ending a session. Pre-commit and CI enforce regardless.

Project procedures are available as workflows (`/spec-writer`, `/code-reviewer`, `/security-reviewer`, `/verifier`, `/adr-writer`, `/test-generator`) in `.agents/workflows/` — generated from `agents/skills/`; edit the source, not the workflow.
