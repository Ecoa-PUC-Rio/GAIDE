# GAIDE Project Template

GAIDE is a framework for disciplined AI-native software engineering.

Specification-driven development, agent skills, MCP integration, and human-in-command governance built into the workflow.

A pre-configured **Integrated Agentive Development Environment (IADE)** for disciplined vibe coding with AI assistants (Claude Code, Google Antigravity, Cursor, Codex, Zed, Copilot, Gemini CLI, etc.).

Use this as the base for any new project where you want AI-assisted development with proper guardrails: spec-first, test-first, human-in-command.

## What you get out of the box

Three native amplifiers wired up and ready:

- **Skills** in `agents/skills/` — reusable agent procedures (spec writing, code review, ADRs, test generation), written once and bound to each tool's dialect by `scripts/sync-adapters.sh`
- **MCPs** in `.mcp.json` — Model Context Protocol server config (filesystem, postgres, GitHub, custom APIs), with `docs/mcp-setup.md` mapping it to each tool
- **SDD** in `specs/` — Spec-Driven Development structure with a working example

## Structure

```text
.
├── AGENTS.md                  Project briefing — canonical, read by every tool
├── agents/                    Portable procedures (single source of truth)
│   ├── skills/                Skills: spec-writer, code-reviewer, security-reviewer,
│   │                          verifier, adr-writer, test-generator
│   └── reviewers/             Clean-context reviewer rubrics (code, security)
├── scripts/                   Portable enforcement checks + adapter sync
│   ├── check-secrets.sh       Secret-pattern scan of content (stdin)
│   ├── check-file.sh          Per-file syntax check
│   ├── check-security.sh      SAST (semgrep) + dependency scan (osv-scanner) per file
│   ├── check-clean-state.sh   Uncommitted changes: no secrets, tests green
│   └── sync-adapters.sh       Regenerates the per-tool bindings below
├── .claude/                   Claude Code binding
│   ├── settings.json          Permissions and hook wiring
│   ├── CLAUDE.md              One-line import of AGENTS.md
│   ├── hooks/                 Thin adapters: hook payload -> scripts/ checks
│   ├── agents/                (generated) subagents from agents/reviewers/
│   └── skills/                (generated) skills from agents/skills/
├── .agents/                   Google Antigravity binding
│   ├── rules/gaide.md         Workspace rules pointing at AGENTS.md
│   └── workflows/             (generated) /name workflows from agents/skills/
├── .github/workflows/         Guaranteed harness: CI security scans + adapter drift check
├── .pre-commit-config.yaml    Same scanners for human committers
├── .mcp.json                  MCP servers — canonical reference (see docs/mcp-setup.md)
├── specs/                     Spec-Driven Development
│   ├── constitution.md        Non-negotiable principles
│   ├── README.md              How to use the SDD flow
│   ├── template/              Spec / plan / tasks templates
│   └── example-feature/       Complete example (spec → plan → tasks)
├── docs/                      Project documentation
│   ├── adr/                   Architecture Decision Records
│   └── mcp-setup.md           Connecting the MCP servers in each tool
├── PROGRESS.md                Session log (local only, gitignored)
├── init.sh                    Session bootstrap: bring-up + health check
├── src/                       Source code (empty by design)
├── tests/                     Tests
├── LICENSE                    MIT
└── README.md                  This file
```

## Getting started

### 1. Use this template

On GitHub, click **"Use this template"**. Or clone manually:

```bash
git clone <this-repo-url> my-project
cd my-project
rm -rf .git && git init
```

### 2. Customize

- Edit `AGENTS.md` with your project briefing (every tool reads it — directly or via its binding)
- Adapt `specs/constitution.md` to your team's principles
- Edit `.mcp.json` to point at the systems you actually use (or remove servers you don't), then connect them in your tool per `docs/mcp-setup.md`
- Keep or drop skills as needed — edit `agents/skills/`, then run `scripts/sync-adapters.sh` to regenerate the per-tool bindings
- Install the security scanners so the inline security layer activates (hooks skip silently without them; CI still enforces):

  ```bash
  brew install semgrep gitleaks osv-scanner   # macOS
  # or: pipx install semgrep && go install github.com/zricethezav/gitleaks/v8@latest ...
  pipx install pre-commit && pre-commit install   # optional: same scanners for human commits
  ```

### 3. Open in your agentive IDE

- **Claude Code**: run `claude` in the project root — briefing, skills, subagents, hooks, and permissions all bind automatically
- **Google Antigravity**: open the folder — rules load from `.agents/rules/`, procedures are available as `/name` workflows; run the `scripts/` checks manually (no inline hooks)
- **Cursor / Codex / Zed / Copilot / Gemini CLI**: open the folder — all read `AGENTS.md` natively; run the `scripts/` checks manually

### 4. Start with the SDD flow

**Don't ask for code before writing a spec.** Use the `spec-writer` skill:

```text
/spec-writer I want to add: users can export their history as CSV
```

The skill walks you through: **spec → plan → tasks → implementation**, with a human gate at each step.

## The harness: what GAIDE uses and why

GAIDE applies **harness engineering** — the discipline of shaping the environment an AI agent operates in, popularized by Anthropic's work on [long-running agent harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) and [harness design](https://www.anthropic.com/engineering/harness-design-long-running-apps). The core insight: **instructions degrade, mechanisms don't**. An agent under context pressure will forget or rationalize away a rule written in prose; it cannot ignore a hook that rejects its tool call.

Each piece of the template exists for a specific failure mode of AI-assisted development:

| Mechanism | Failure mode it prevents |
| --- | --- |
| **Constitution** (`specs/constitution.md`) | Knowledge about "how we work here" living only in chat history |
| **Specs** (`specs/`) | Drift between what the app does and what people believe it does |
| **Enforcement checks** (`scripts/`, wired as hooks in `.claude/hooks/`) | The agent violating critical rules (e.g. committing secrets) under pressure — enforcement is deterministic, not trust-based |
| **Deny permissions** (`.claude/settings.json`) | The agent reading credentials or running destructive commands, even accidentally — policy stated for all tools in `AGENTS.md` ground rules; enforced mechanically where the tool supports it |
| **`PROGRESS.md`** session log | Each session starting blind — context windows die, durable artifacts don't |
| **`init.sh`** session bootstrap | Building on top of broken inherited state — every session proves the app runs *before* new work |
| **Task status lifecycle** (`specs/template/tasks.md`) | "Done" meaning "I wrote code" — `done` requires passing tests, `verified` requires independent checking against the spec |
| **Clean-context review** (`agents/reviewers/code-reviewer.md`) | Self-review bias — the context that wrote the code contains the rationalizations that produced its bugs, so the reviewer sees only the diff and the docs |
| **Sprint contracts** (`specs/template/plan.md`) | "Done" drifting during implementation — observable done-criteria are agreed before coding and checked one by one at review |
| **`verifier` skill** (+ Playwright MCP) | "Tests pass" being mistaken for "it works" — criteria reach `verified` only by exercising the running app as a user would |
| **ADRs** (`docs/adr/`) | Re-litigating settled decisions; losing the *why* behind the architecture |
| **Skills** (`agents/skills/`) | Reinventing procedures ad hoc, with quality varying per session |
| **Principle 9** (tests are load-bearing) | The agent editing tests or task lists to make work *appear* done — a failure mode Anthropic observed directly in long-running agents |
| **Security checks** (`scripts/check-security.sh`, gitleaks in `scripts/check-clean-state.sh`) | Vulnerable code or dependencies entering silently — semgrep/osv-scanner findings block the edit and feed back while context is fresh |
| **Principle 10** (security findings are load-bearing) | The agent silencing scanners (`# nosemgrep`, ignore files) instead of fixing the vulnerability — suppressions only in dedicated, justified commits |
| **Security considerations** in specs (`specs/template/spec.md`) | Logic-level flaws no scanner sees (IDOR, authz bypass, tenant leakage) — abuse cases become negative acceptance criteria, tested and verified |
| **`security-reviewer`** (`agents/reviewers/`) | Scanner blind spots at review time — authorization reasoning, abuse-case coverage, and diffs that quietly disarm the scanners |
| **CI + pre-commit** (`.github/workflows/security.yml`, `.pre-commit-config.yaml`) | Hooks only guard the agent's session — CI and pre-commit extend the same scanners to every commit from anyone |

The adoption of these practices is recorded in [ADR 0001](docs/adr/0001-adopt-harness-engineering-practices.md), [ADR 0002](docs/adr/0002-adopt-security-harness.md) (security harness), and [ADR 0003](docs/adr/0003-agent-agnostic-layout.md) (agent-agnostic layout).

## Portable by design

The template separates **portable policy** from **per-tool binding**, so switching (or mixing) agentive tools does not cost you the governed layer:

- **Portable, read by everything:** `AGENTS.md` (the open cross-tool briefing standard), `agents/` (skills and reviewer rubrics as plain Markdown), `scripts/` (enforcement checks as plain shell), `specs/`, `docs/adr/`, `init.sh`, pre-commit, CI.
- **Bindings, generated or thin:** `.claude/` (Claude Code) and `.agents/` (Antigravity) are dialect wrappers. `scripts/sync-adapters.sh` regenerates them from the portable sources — edit the source, run the sync, commit both; CI fails on drift.

One honest asymmetry: **inline enforcement** (a hook rejecting a bad edit the moment it happens) exists only where the tool has hook events — today, Claude Code. Everywhere else the same checks run at commit time (pre-commit) and push time (CI), which is the guaranteed floor for every agent and every human, and `AGENTS.md` instructs agents to run the `scripts/` checks themselves. Instructions degrade and mechanisms don't — which is exactly why the layer that works everywhere is git-level, not IDE-level.

## Philosophy

Vibe coding works best with guardrails. This template enforces a few non-negotiables (see `specs/constitution.md`):

1. **Spec before code** — describe observable behavior before generating implementation
2. **Tests track behavior** — every behavioral change needs tests
3. **Human approval before commit** — Human-In-Command (HIC) mode by default
4. **Comments explain *why*, not *what*** — naming documents the what
5. **Architectural decisions become ADRs** — immutable, traceable
6. **Secrets never enter the repo** — even in example files
7. **Atomic changes** — one concern per commit/PR
8. **Fail loudly, not silently** — no swallowed errors
9. **Tests and task lists are load-bearing** — never edited to make work *appear* done
10. **Security findings are load-bearing** — scanners are fixed against, never silenced

You can relax any of these as your team matures — but only via an explicit ADR.

## Suggested first steps after cloning

1. Read `specs/constitution.md` together as a team and edit it to match your beliefs.
2. Use `specs/example-feature/` as a reference for your first real spec.
3. Try one full loop: `spec-writer` → review → `test-generator` → implement → `code-reviewer`.
4. Document your first real architectural decision with the `adr-writer` skill.

## Contributing

This is a community template. PRs that improve the defaults, skills, or documentation are welcome. Please open an issue first to discuss substantial changes.

## License

[MIT](LICENSE) — free to use, modify, and distribute, including commercially.
