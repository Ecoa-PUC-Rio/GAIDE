# Project Briefing

> **How to use this file:** this is the canonical briefing for **any** coding agent working on this repository — Claude Code, Google Antigravity, Cursor, Codex, Zed, Copilot, Gemini CLI, or a human. Tools that read `AGENTS.md` load it natively; Claude Code loads it via `.claude/CLAUDE.md`; Antigravity via `.agents/rules/`. Fill in the sections marked with `[ ]`.

---

## Overview

**Project name:** `[PROJECT NAME]`

**One-line description:** `[WHAT THE APPLICATION DOES]`

**Current status:** `[concept | in development | in production | in maintenance]`

## Tech stack

- **Primary language:** `[e.g., Python 3.12 / Node.js 22 / Go 1.23]`
- **Framework:** `[e.g., FastAPI / Next.js / etc.]`
- **Database:** `[e.g., PostgreSQL 16]`
- **Deployment:** `[e.g., GCP Cloud Run / AWS ECS / on-prem k8s]`

## Relevant folder structure

```text
.
├── AGENTS.md               This file — canonical agent briefing
├── agents/                 Portable agent procedures (single source)
│   ├── skills/             Skills: spec writing, review, ADRs, tests, verification
│   └── reviewers/          Clean-context reviewer rubrics
├── scripts/                Portable enforcement checks (run in any tool, or by hand)
├── specs/                  SDD specs — source of truth for behavior
├── docs/adr/               Architecture Decision Records
├── PROGRESS.md             Session log — read at start, update at end
├── src/                    Source code
└── tests/                  Tests
```

Tool-specific bindings (generated from the portable sources by `scripts/sync-adapters.sh` — never edit them directly): `.claude/` for Claude Code, `.agents/` for Antigravity.

## Session protocol

- **At session start:** run `./init.sh` (environment bring-up + health check — a failure means inherited broken state), then read `PROGRESS.md` and the recent `git log` to understand where the last session left off. If the previous session left something broken, fix that before starting new work. `PROGRESS.md` is local and gitignored — if it doesn't exist yet, create it (title + dated entries with done / next / known issues, newest first).
- **At session end:** append an entry to `PROGRESS.md` (done / next / known issues).

## Mandatory operating principles

Before any code change, the agent MUST:

1. **Read the constitution** at `specs/constitution.md`.
2. **Check whether a spec exists** for the feature at `specs/<feature>/spec.md`.
3. **If no spec exists**, propose writing one using the `spec-writer` skill before coding.
4. **Follow the SDD flow**: spec → plan → tasks → implementation.
5. **Never edit tests or task lists to make work appear done** (Constitution Principle 9).

## Enforcement checks

The checks in `scripts/` are the portable enforcement layer. In Claude Code they fire automatically as hooks; **in every other tool, run them yourself**:

- `scripts/check-file.sh <file>` — syntax check after editing a file
- `scripts/check-security.sh <file>` — SAST (semgrep) / dependency scan (osv-scanner) on an edited file
- `scripts/check-secrets.sh` — secret-pattern scan of content on stdin
- `scripts/check-clean-state.sh` — before ending a session with uncommitted changes: secrets (gitleaks) + test suite

Whatever the tool, the guaranteed floor is the same for everyone: pre-commit (`.pre-commit-config.yaml`) and CI (`.github/workflows/security.yml`).

## Ground rules (enforced as deny-permissions where the tool supports it)

- Never read `.env` files, private keys (`*.pem`, `*.key`, `id_rsa*`), or credential stores (`~/.ssh`, `~/.aws`, `~/.config/gcloud`).
- Never run `git push --force`, `git reset --hard`, or pipe downloads into a shell.
- Secrets never enter versioned files, even as examples (Constitution Principle 6).

## Code conventions

- `[e.g., ESLint config / Black + Ruff / gofmt]`
- `[e.g., tests required for every public function]`
- `[e.g., Conventional Commits]`

## Critical integrations

`[List internal systems this project integrates with. For each, indicate whether there's an MCP configured.]`

- `[System X]` — `[via MCP / via REST API / via client library]`

MCP servers are declared in `.mcp.json` (canonical reference). See `docs/mcp-setup.md` for connecting them in each tool.

## How the agent should work

- **Current autonomy mode:** HIC (every code change requires explicit human approval before commit).
- **Change size:** prefer small, atomic changes. No sweeping refactors without an ADR.
- **Comments:** only when the *why* is not obvious from the code.
- **Tests:** changing code that affects behavior without changing/adding tests is forbidden.
- **Logging:** follow the convention defined in a `docs/adr/NNNN-logging-strategy.md` ADR (create one if missing).

## Available skills

Source of truth in `agents/skills/` (Claude Code exposes them as `/name` via `.claude/skills/`; Antigravity as `/name` workflows via `.agents/workflows/` — both generated):

- `spec-writer` — write SDD specs
- `code-reviewer` — review the current diff in a clean context (rubric in `agents/reviewers/code-reviewer.md`; never pass the reviewer the implementation conversation)
- `security-reviewer` — security review of the current diff (rubric in `agents/reviewers/security-reviewer.md`); use for changes touching auth, sensitive data, external input, or new dependencies
- `verifier` — exercise a feature end-to-end against the spec's criteria; the only path to `verified` status
- `adr-writer` — record architectural decisions
- `test-generator` — generate tests from a spec

## Contacts and governance

- **Maintainers:** `[names / emails]`
- **Review channel:** `[e.g., GitHub PR / Slack #channel]`
- **Human-response SLA:** `[e.g., 24h on business days]`
