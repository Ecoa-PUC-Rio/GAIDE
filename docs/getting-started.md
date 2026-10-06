# Getting started: your first feature

This walkthrough takes a fresh clone to a reviewed, verified feature. Allow about 30 minutes the first time. It assumes you finished the [quickstart](../README.md#quickstart) and `./init.sh` ended with `== init OK ==`.

The commands below use the `/name` form available in Claude Code and Google Antigravity. In tools that read `AGENTS.md` directly (Cursor, Codex, Zed, Copilot, Gemini CLI), ask the agent to follow the matching file instead — for example: *"Follow `agents/skills/spec-writer.md` for this feature."*

## Before you start

Fill in the bracketed fields of [`AGENTS.md`](../AGENTS.md) — at least the project name, stack, and test framework. The agent reads this file at the start of every session, and skills such as `test-generator` rely on it to pick your test framework rather than introduce a new one.

## 1. Describe the behavior, not the code

```text
/spec-writer I want to add: users can export their history as CSV
```

The agent confirms it will write a spec without touching code, then asks questions until the behavior is unambiguous. It does not guess: if something is unclear, it asks.

**You get:** `specs/<feature>/spec.md` with use cases (given / when / then), acceptance criteria, an explicit out-of-scope list, and security considerations whose abuse cases become negative acceptance criteria.

**Your job:** read it and push back. This is the cheapest moment to change your mind. Compare with the finished example in [`specs/example-feature/spec.md`](../specs/example-feature/spec.md).

## 2. Approve the plan and the tasks

Once you approve the spec, the same skill writes two more files, pausing for your approval after each:

- **`plan.md`** — architectural decisions, implementation order, risks, and the **sprint contract**: a list of observable behaviors, each with the concrete way to verify it (a command, a URL, a user action). This is what "done" will mean, agreed before any code exists.
- **`tasks.md`** — atomic tasks of roughly 30 minutes, each with its own "done when" conditions.

Nothing is implemented until you approve the task list.

## 3. Generate the tests first

```text
/test-generator
```

**You get:** at least one test per acceptance criterion — happy path, alternatives, errors, edge cases, and one test per abuse case proving the abuse is denied.

**Expect red.** The tests fail because the feature does not exist yet. That is the point: they are the contract the implementation must meet, written before the implementation can influence them.

## 4. Implement, one task at a time

```text
Implement task 1 from specs/<feature>/tasks.md
```

While the agent works, the enforcement checks run on every edit (automatically in Claude Code; run them yourself elsewhere):

| Check | What it catches |
| --- | --- |
| `scripts/check-secrets.sh < file` | Credentials about to be written into a file |
| `scripts/check-file.sh <file>` | Syntax errors in the file just edited |
| `scripts/check-security.sh <file>` | Vulnerable code (semgrep) or dependencies (osv-scanner), when installed |
| `scripts/check-clean-state.sh` | Ending a session with secrets in the diff or a failing test suite |

A task moves to `done` when its own tests pass — not before, and not by editing the tests.

## 5. Get an unbiased review

```text
/code-reviewer
```

The review is delegated to a reviewer that receives **only the diff and the governing documents** — never the conversation that produced the code. It checks the change against the spec, the sprint contract, and the constitution.

For changes touching authentication, sensitive data, external input, or new dependencies, also run `/security-reviewer`.

## 6. Verify against the running app

```text
/verifier
```

The agent brings the app up with `./init.sh` and exercises each acceptance criterion the way a user would: real HTTP requests, real CLI commands, or a real browser through the Playwright MCP server (enable `_playwright` in `.mcp.json` first — see [`mcp-setup.md`](mcp-setup.md)). It attempts the abuse cases too.

**You get:** a pass / fail verdict per criterion, with evidence. Only this step moves a task from `done` to `verified`.

## 7. Record the decisions and commit

If the feature involved an architectural choice — a library, a pattern, a significant trade-off — record it:

```text
/adr-writer We chose streaming over in-memory CSV generation
```

Then review the diff and approve the commit. The default mode is human-in-command: the agent proposes, you decide.

## What to do next

- Replace the auto-detection in [`init.sh`](../init.sh) with your project's real bring-up and health check.
- Install the security scanners and `pre-commit` (see [Make it yours](../README.md#make-it-yours)).
- Edit [`specs/constitution.md`](../specs/constitution.md) as a team until it reflects what you actually believe.
- Adjust a skill in `agents/skills/`, run `scripts/sync-adapters.sh`, and commit the source together with the regenerated bindings.

## Troubleshooting

**`./init.sh` fails at the start of a session.** The previous session left the project broken. Fix that before starting new work — that is what the script is for.

**CI fails on "Adapter drift".** A file under `agents/` changed without its generated bindings. Run `scripts/sync-adapters.sh` and commit the result. Never edit files under `.claude/skills/`, `.claude/agents/`, or `.agents/workflows/` directly.

**The security checks never report anything.** They skip silently when `semgrep` or `osv-scanner` is not installed. CI still runs them; install them locally to get the feedback while editing.

**The agent's write was rejected for a secret that is only an example.** Use an obvious placeholder (`YOUR_API_KEY`, `CHANGE_ME`, `<token>`); those are allowed.
