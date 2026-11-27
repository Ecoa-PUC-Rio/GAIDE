# Plan: <Feature name>

> **Prerequisite:** `spec.md` approved.

## Architectural decisions

For each relevant decision, indicate whether it requires an ADR:

- Decision 1: <description> — [ADR required | minor decision]
- Decision 2: ...

## Affected components

- `src/<path>/<file>` — <nature of the change>
- `tests/...` — tests to create/modify
- `docs/...` — doc updates

## Implementation sequence

Proposed order (each item becomes an atomic task in `tasks.md`):

1. Generate tests from the spec (red)
2. Refactoring that makes the change easy (if any)
3. Slice 1 — the thinnest end-to-end path through every layer it needs
4. Slice 2 — the next behavior, again end to end
5. Verify tests pass (green)
6. Documentation and ADRs

## Testing strategy

- Unit tests: <where, which>
- Integration tests: <where, which>
- Manual tests: <if any, describe>

## Implementation risks

- Risk: <technical, not spec-level> | Mitigation: ...

## Sprint contract

> Agreed **before** implementation starts, between whoever implements and whoever reviews (human or the `code-reviewer` subagent). This is the operational meaning of "done": each item is an **observable behavior** with a concrete way to verify it — a command, a URL to hit, a user action to perform. The reviewer checks the items one by one; a failure comes back as detailed feedback, not as a renegotiation. Changing the contract mid-implementation requires re-approving the plan.

- [ ] `<observable behavior>` — verify by: `<command / URL / user action>`
- [ ] `<observable behavior>` — verify by: ...

## Definition of Done

- [ ] All tests derived from the spec pass
- [ ] Code review approved (`code-reviewer` skill + human review)
- [ ] ADRs recorded for relevant decisions
- [ ] Documentation updated
- [ ] No secrets in the diff
- [ ] Constitution respected
