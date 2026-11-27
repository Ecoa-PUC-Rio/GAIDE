# Tasks: <Feature name>

> **Prerequisite:** `plan.md` approved.
>
> Decomposition into **atomic** tasks (~30 min each). Each task has a verifiable completion criterion.
>
> **Slicing:** each task is a thin, complete path through the layers it needs (data, logic, interface, tests) that can be demonstrated on its own — not one layer at a time. Refactoring that makes the change easy goes first, as its own task.
>
> **Parallel execution:** a task is *ready* when every task in its `Depends on` is `done`. Ready tasks whose `Files` don't overlap may run in parallel, one subagent each. Only the coordinating session edits this file — subagents report back and the coordinator records the status, so there is never more than one writer.
>
> **Status lifecycle:** `pending → in-progress → done → verified`.
> `done` = implemented and its own tests pass. `verified` = checked against the spec's acceptance criteria by someone (or some agent) other than whoever implemented it.
> Status only moves forward when the work actually happened — re-marking tasks to make work *appear* done violates Constitution Principle 9.

---

## Task 1 — <Short imperative title>

**Status:** pending

**Files:** `src/...`, `tests/...`

**Description:** What needs to be done.

**Done when:**
- [ ] <testable condition>
- [ ] <testable condition>

**Estimate:** ~30 min

**Depends on:** —

---

## Task 2 — ...

**Status:** pending

**Files:** ...

**Description:** ...

**Done when:**
- [ ] ...

**Estimate:** ~30 min

**Depends on:** Task 1

---

## Traceability

| Spec criterion | Task(s) | Status |
| --- | --- | --- |
| Criterion 1 | Task 1, Task 2 | pending |
| Criterion 2 | Task 3 | pending |

> Update status as tasks progress, using the same lifecycle (`pending | in-progress | done | verified`). A criterion is `verified` only when exercised against the running application, not just by green unit tests.
