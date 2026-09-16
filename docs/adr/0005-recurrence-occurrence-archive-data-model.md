# ADR 0005 — Recurrence, occurrence, and archive data model

- **Status:** accepted
- **Date:** 2026-09-16
- **Decision-makers:** enzofarina

## Context

`specs/task-calendar/spec.md` extends the TODO app (ADR 0004: vanilla JS, static, no build step, `localStorage`-backed) with dated and recurring tasks, a completion heatmap, a read-only day-detail view, and space-saving deletion that must not erase heatmap or day-detail history. Three data-modeling questions fall directly out of that spec and need an answer before implementation:

1. How is a recurring task's set of occurrences represented — computed on demand from its rule, or written out as individual records?
2. Is there any limit on how large a recurrence range can be?
3. What, exactly, survives when a done or overdue dated item is deleted to reclaim space?

None of these are addressed by ADR 0004, which only covers the base app's single flat task list. They are answered together here because they are one question in practice — "how do we represent time-based task data without a framework or a database" — the same way ADR 0004 answered "how do we run this app at all."

## Decision

**Occurrences are materialized, not computed on the fly.** A recurring task is split into two records: a series (`gaide-todo-series`: `{id, text, description, urgency, weekdays, startDate, endDate, createdAt}`) holding the rule and the shared display fields, and one occurrence per matching date (`gaide-todo-occurrences`: `{id, seriesId, date, done}`) written immediately when the series is created or its rule is edited. Occurrences carry no text/urgency of their own — those are looked up by `seriesId` on the series record.

**Occurrence generation is capped at 730 per rule** (roughly 2 years of a daily recurrence, or ~4 years of a twice-weekly one), enforced as a validation error at creation/edit time, the same way an end-date-before-start-date is rejected.

**An archived record is `{id, date, text, done, archivedAt}`.** Deleting a done or overdue dated item writes exactly this shape and discards the live record; description, urgency, the original task/occurrence id, and any series linkage are all dropped. A deleted item that is neither done nor overdue produces no archived record at all — it is erased with no trace, since there is no outcome yet to preserve.

## Alternatives considered

- **Virtual expansion (compute occurrences from the rule at render time, with a sparse exceptions list for done/deleted occurrences):** more storage-efficient for very large ranges, since nothing is written until an occurrence's state actually diverges from "not done, still exists." Rejected: it needs its own materialization-window logic to paint a calendar view, its own exception-merging logic to answer "is this occurrence done," and turns "delete this occurrence only" into a special case instead of a plain record delete. Given occurrence records are already tiny (4 fields), the storage saved doesn't offset the added structural complexity, and ADR 0004's bias is toward the smallest architecture that satisfies the spec.
- **No cap on generated occurrences:** simplest, and most personal use (the spec's own example — two weekdays across three months — is ~26 occurrences) would never notice a cap. Rejected as the sole answer: the spec explicitly flags a decades-long daily rule as an abuse case that must not freeze the UI or exhaust on-device storage, and an unbounded write at creation time is the most direct way that happens. 730 is generous enough not to bother realistic use, and is a one-line change to raise later if it does.
- **Archived record keeps more fields (e.g., urgency, description):** would make the day-detail view richer and let a restored task (if that were ever added) come back complete. Rejected for now: the spec's explicit motivation for archiving is reclaiming phone storage, and urgency/description are exactly the fields with no bearing on what the day-detail view or the heatmap need to show (text + done/not-done). Nothing here prevents adding fields later if a future spec needs them; nothing currently reads them back.
- **Archived record keyed by date instead of its own id (one aggregate row per date):** would save a little more space (no per-item `id`/`archivedAt`) but can't represent multiple archived items on the same date independently, which the spec's day-detail view requires (it lists each item separately, not just a count). Rejected.

## Consequences

### Positive
- Occurrence records are small and uniform, so the existing flat-array `loadTasks`/`saveTasks`-style CRUD pattern from `app.js` (ADR 0004) extends directly to `gaide-todo-series`/`gaide-todo-occurrences`/`gaide-todo-archive` — no new persistence mechanism, just three more arrays under three more `localStorage` keys
- "Delete this occurrence only" is a plain record operation (archive-or-erase one occurrence row), not a computed diff against a rule
- The cap turns an open-ended abuse case into a validation error a test can assert directly, the same shape as the existing end-before-start check
- An archived record answers exactly the two questions the spec needs answered later (what was it, was it done) and nothing else, keeping the space savings real rather than nominal

### Negative (accepted costs)
- A very active user (many long-running recurring tasks, run for years without ever archiving anything) will accumulate more `localStorage` rows than a virtual-expansion design would — accepted, since `localStorage` is typically several MB and personal-task-list volumes are nowhere near that ceiling
- Editing a series' rule must reconcile the occurrence set (add newly-in-range dates, remove newly-out-of-range future dates) rather than just re-evaluating the rule at read time — a real but bounded piece of logic, isolated to `generateOccurrences`/rule-edit in `data.js`
- 730 is a judgment call, not a number the user chose explicitly — flagged here and in `specs/task-calendar/plan.md`'s Implementation risks for visibility, not hidden in code

### Neutral
- Four `localStorage` keys now exist instead of one (`gaide-todo-tasks`, `-series`, `-occurrences`, `-archive`, plus `-reminders` from the same plan for an unrelated feature) — more moving parts than the base app, but each is a flat array following the same shape, not a new persistence paradigm

## Constitution adherence

- **Principle 1 (Spec before code):** this ADR implements decisions `specs/task-calendar/spec.md` explicitly left to `plan.md`/an ADR (see spec's Security considerations and Identified risks)
- **Principle 5 (Architectural decisions become ADRs):** recorded before implementation (Task 1 of `specs/task-calendar/tasks.md`), per `specs/task-calendar/plan.md`
- **Principle 7 (Atomic changes) / bias against premature abstraction:** materialization was chosen specifically because it needs no new abstraction beyond the base app's existing flat-array-in-`localStorage` pattern; virtual expansion was rejected largely because it would introduce one

## Future review

Revisit this decision if any of the following happen:
- The 730 cap turns out too low for real usage (a concrete sign: a user hits the validation error while describing a genuinely reasonable recurrence)
- `localStorage` size becomes a real constraint for a single user (a concrete sign: the storage-error banner from Constitution Principle 8 starts firing under normal use, not just in tests)
- A future spec needs an archived record to carry more than text/date/done (e.g., "restore this archived item"), which would need revisiting what archiving discards
