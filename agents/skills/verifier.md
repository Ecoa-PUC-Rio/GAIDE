---
name: verifier
description: Empirically verifies a feature against its spec's acceptance criteria and the plan's sprint contract by exercising the running application as a user would. The only path to marking a task or criterion as "verified". Use after implementation, before final review/merge.
---

# Skill: verifier

## Premise

"Tests pass" is not "the feature works". Unit tests verify the code the implementer thought to test; verification exercises the application the way a user will. A criterion only reaches `verified` status (see the task lifecycle in `specs/template/tasks.md`) through observation of the running app — never by inspection of the code.

## When to activate

- After a feature's tasks reach `done` (implemented, own tests green)
- Before final review and merge
- When the user asks "does it actually work?"

## Playbook

### 1. Load the criteria

- The feature's `specs/<feature>/spec.md` — acceptance criteria
- The feature's `plan.md` — sprint contract (each item names its own verification method)

### 2. Bring the app up

Run `./init.sh`. If it fails, stop: fix the environment first — verification against a half-running app produces false failures and, worse, false passes.

### 3. Exercise each criterion as a user

For each acceptance criterion and each sprint contract item:

- **Web UI:** drive the browser via the Playwright MCP (`_playwright` in `.mcp.json` — enable it and connect it in your tool, see `docs/mcp-setup.md`). Click, type, navigate; take a screenshot as evidence at the decisive moment.
- **API:** issue real requests (`curl`), assert on status, headers, and body.
- **CLI:** run the real command; assert on output and exit code.

Verify the *negative* cases too (the 401s, the empty states, the limits) — they are where implementations quietly lie. That includes the spec's **Security considerations** abuse cases: actually attempt the abuse against the running app (request another user's resource, replay an expired link) and confirm it is denied. Authorization bypasses live below the UI — no scanner or unit test observes them the way this does.

### 4. Record the verdict

For every criterion: **pass / fail**, with the evidence (command + output, or screenshot reference). On pass, update the task/criterion status to `verified` in the feature's `tasks.md`. On fail, the criterion stays at `done` and the failure goes back as a concrete reproduction recipe.

Never mark `verified` on the strength of green unit tests or code reading — that is exactly the shortcut Principle 9 exists to block.

## Expected output

A verification report: criterion → verdict → evidence, plus the status updates applied to `tasks.md`. No code changes — failures are reported, not silently fixed.
