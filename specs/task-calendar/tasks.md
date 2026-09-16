# Tasks: Task calendar, dates, recurrence, completion heatmap, and reminders

> **Prerequisite:** `plan.md` approved.
>
> Decomposition into **atomic** tasks (~30 min each). Each task has a verifiable completion criterion.
>
> **Status lifecycle:** `pending → in-progress → done → verified`.
> `done` = implemented and its own tests pass. `verified` = checked against the spec's acceptance criteria by someone (or some agent) other than whoever implemented it.
> Status only moves forward when the work actually happened — re-marking tasks to make work *appear* done violates Constitution Principle 9.

---

## Task 1 — Record ADR 0005 (recurrence/occurrence/archive data model)

**Status:** done

**Files:** `docs/adr/0005-recurrence-occurrence-archive-data-model.md`

**Description:** Record, via the `adr-writer` skill, the three bundled decisions from `plan.md`: materialized occurrences (vs. virtual expansion), the 730-occurrence generation cap, and the archived-record shape (`{id, date, text, done, archivedAt}`).

**Done when:**
- [x] ADR follows the project template (context, decision, alternatives considered, consequences)
- [x] All three bundled decisions and their trade-offs are documented, referencing `specs/task-calendar/plan.md`

**Estimate:** ~25 min

**Depends on:** —

**Evidence:** `docs/adr/0005-recurrence-occurrence-archive-data-model.md` created — Status/Date/Decision-makers, Context, Decision, 4 alternatives considered (each with rejection reasoning), Consequences (positive/negative/neutral), Constitution adherence, Future review, matching ADR 0004's structure.

---

## Task 2 — Generate tests from the spec

**Status:** done

**Files:** `tests/todo-app/calendar.test.js`, `tests/todo-app/recurrence.test.js`, `tests/todo-app/archive.test.js`, `tests/todo-app/day-detail.test.js`, `tests/todo-app/reminders.test.js`, `tests/todo-app/scheduled-list.test.js` (all new), `tests/todo-app/security.test.js` (extended with C49), `tests/todo-app/helpers/load-app.js` (extended: new storage-key seeding + `isoDaysFromToday` clock-relative helper, since the app has no clock-injection mechanism), `tests/todo-app/README.md` (extended: full interface/DOM contract for `data.js`/`calendar.js`/`render.js`)

**Description:** Generated the red test suite against `specs/task-calendar/spec.md`'s 50 acceptance criteria (C1–C50), producing the interface contract Tasks 3–20 implement against (documented in `tests/todo-app/README.md`'s addendum). C49 (reminder text is plain-text) was placed in `security.test.js` alongside C9/C26 rather than duplicated in `reminders.test.js` — same abuse-case pattern, same already-justified `nosemgrep` suppression (Constitution Principle 10), avoiding a second suppression for the same finding.

**Done when:**
- [x] Each automatable acceptance criterion has at least one matching test; touch-target/tap-precision criteria are logged as manual-only in the README, not silently skipped
- [x] All new tests are red and the existing 34 base-app tests still pass unmodified

**Estimate:** ~40 min

**Depends on:** —

**Evidence:** `npm run test:todo-app` — 61 tests, 34 pass (all pre-existing base-app tests, unmodified), 27 fail (all new: `archive.test.js`/`calendar.test.js`/`recurrence.test.js` fail at module load — `src/todo-app/data.js` does not exist yet; `scheduled-list.test.js`/`day-detail.test.js`/`reminders.test.js`/the new C49 case fail on null DOM selectors — the UI they target isn't built yet). 0 unexpected passes.

---

## Task 3 — Date-math module

**Status:** done

**Files:** `src/todo-app/data.js` (new)

**Description:** Pure functions: `toISODate`, `addDays`, `weekdayOf`, and month/week/year cell-array builders (given a reference date, return the grid of dates for that view). Canonical `YYYY-MM-DD` strings throughout, per `plan.md`'s architectural decision — no stored-value arithmetic on raw `Date` objects. Week view commits to a Monday start (ISO 8601), the concrete choice `tests/todo-app/README.md` documents as left to implementation by the spec.

**Done when:**
- [x] Month/week/year grid builders return the correct dates across a month boundary, a year boundary, and February in a leap year
- [x] `addDays`/`weekdayOf` are correct across a leap day (DST not applicable — dates are constructed at local midnight via year/month/day components, never by adding milliseconds across a stored instant)

**Estimate:** ~35 min

**Depends on:** Task 2

**Evidence:** `node --test tests/todo-app/calendar.test.js` — "grid construction (pure)" suite: 4/4 pass (`monthDates` Feb non-leap/leap, `weekDates` Monday-start, `yearDates` 365/366).

---

## Task 4 — Band computation and day-ratio merge

**Status:** done

**Files:** `src/todo-app/data.js`

**Description:** `band(done, total)` → 0–5 per the spec's fixed ratio table (0% / 1–25% / 26–50% / 51–75% / 76–99% / 100%). `dayRatio(date, {tasks, occurrences, archive})` merges still-existing dated items for that date with any archived records for that date into one `{done, total}` pair.

**Done when:**
- [x] `band()` is correct at every boundary value (0%, 1%, 25%, 26%, 50%, 51%, 75%, 76%, 99%, 100%)
- [x] `dayRatio()` is correct for live-only, archived-only, and mixed live+archived days, and for a day with zero items of either kind

**Estimate:** ~30 min

**Depends on:** Task 2

**Evidence:** `node --test tests/todo-app/calendar.test.js tests/todo-app/archive.test.js` — band boundary suite, C34/C35 (calendar.test.js), C17 dayRatio-merge suite (archive.test.js): all pass.

---

## Task 5 — Extend the task store with `date`

**Status:** done

**Files:** `src/todo-app/data.js`

**Description:** Added an optional `date` field to `gaide-todo-tasks` records (single-dated tasks), plus `setTaskDate`/`clearTaskDate`. "A task is exactly one kind at a time" is enforced by construction, not a runtime check: `createTask` has no `seriesId` parameter at all — a task record can never carry one, since recurring items live entirely as separate occurrence records (ADR 0005), never as task records with a series link.

**Done when:**
- [x] A task can be created with a `date` and no recurrence (single-dated)
- [x] A task can still be created with neither (general), unchanged from the base app
- [x] A task record can never carry a series link — structurally impossible, not just rejected at runtime

**Estimate:** ~25 min

**Depends on:** Task 2

**Evidence:** `node --test tests/todo-app/recurrence.test.js` — C1, C3 suites pass (single-dated creation, general-by-default, no `seriesId` on a task).

---

## Task 6 — Series and occurrences stores

**Status:** done

**Files:** `src/todo-app/data.js`

**Description:** CRUD (`loadSeries`/`saveSeries`, `loadOccurrences`/`saveOccurrences`, non-throwing `{ok, error?}` on a failing write, Principle 8) for two new stores: `gaide-todo-series` and `gaide-todo-occurrences`. `toggleOccurrenceDone` flips one occurrence independently of its siblings. The visible-error-banner *wiring* (connecting a failed `{ok:false}` to the UI) is `render.js`/`app.js` work, covered in later tasks — this task is the storage/CRUD layer the banner will call into, same split as the base app's `saveTasks`/`persistTasks`.

**Done when:**
- [x] A series can be created, read, updated, and deleted (create via Task 7's `createSeries`; read/save/delete are plain array CRUD)
- [x] An occurrence can be created, toggled done/not-done independently of its siblings, and deleted
- [x] `saveSeries`/`saveOccurrences` return `{ok:false}` on a failing write, non-throwing, same contract as the base app's `saveTasks`

**Estimate:** ~35 min

**Depends on:** Task 2

**Evidence:** `node --test tests/todo-app/recurrence.test.js` — C5 suite (independent per-occurrence done state) passes; `saveJSONArray`'s try/catch (shared by all 5 stores) is the same code path `data-layer.test.js`'s existing storage-failure test already exercises for tasks.

---

## Task 7 — Occurrence generation

**Status:** done

**Files:** `src/todo-app/data.js`

**Description:** `generateOccurrences(rule)`: expands weekdays + date range into occurrence dates, capped at 730 (ADR 0005), `{error:'invalid-range'}` for end-before-start, `[]` (not an error) for zero matching weekdays. `createSeries` wraps it plus series-record creation. Also implemented `updateSeriesRule` here (pure reconciliation logic) rather than deferring it to Task 17 — it's data-layer logic through and through, and `recurrence.test.js` (Task 2) already exercises it directly; Task 17 wires the UI to call it, not to write it.

**Done when:**
- [x] A normal range (e.g., 2 weekdays over 3 months) generates exactly the expected dates
- [x] An end date before the start date is rejected before any occurrences are written
- [x] A range with no date on any selected weekday succeeds with zero occurrences
- [x] A range that would generate more than 730 occurrences is rejected with a clear validation error

**Estimate:** ~35 min

**Depends on:** Task 6

**Evidence:** `node --test tests/todo-app/recurrence.test.js` — 10/10 suites, 15/15 tests pass, including the 730-cap boundary (exactly 730 accepted, more rejected), C6/C7 validation, and both `updateSeriesRule` reconciliation cases.

---

## Task 8 — Archive store and archive/erase branching

**Status:** done

**Files:** `src/todo-app/data.js`

**Description:** `isOverdue`/`resolveDelete` (pure decision: done-or-overdue → `{archive: {date, text, done}}`; otherwise → `{erase: true}`, per ADR 0005) plus CRUD for `gaide-todo-archive` — `loadArchive`/`saveArchive` (plain array CRUD) and `appendArchiveRecord` (adds `id`/`archivedAt`, persists). `resolveDelete` itself is the pure decision and doesn't touch storage; Task 15 wires it to the actual delete action.

**Done when:**
- [x] A done item's delete produces an archived record with `done: true` and drops the live record
- [x] An overdue, not-done item's delete produces an archived record with `done: false`
- [x] A future, not-yet-due item's delete produces no archived record at all
- [x] An archived record has no `description`, `urgency`, `id`-of-original, or series linkage — only `{date, text, done}` from `resolveDelete` (`appendArchiveRecord` then adds `id`/`archivedAt` on persist)

**Estimate:** ~35 min

**Depends on:** Task 2

**Evidence:** `node --test tests/todo-app/archive.test.js` — 7/7 suites, 14/14 tests pass, including C14 (overdue definition, all 4 cases), C15/C16 (archive-vs-erase branching), C17 (ratio merge before/after a simulated delete), C20 (archived payload has exactly `date`/`done`/`text`, nothing else), C23/C24 (per-occurrence and whole-series outcomes).

---

## Task 9 — Reminders store

**Status:** done

**Files:** `src/todo-app/data.js`

**Description:** `createReminder`/`updateReminder`/`deleteReminder` (pure, take the existing-reminders array as a parameter so the one-per-date check doesn't need a storage round-trip) plus `loadReminders`/`saveReminders` CRUD for `gaide-todo-reminders`. `createReminder` rejects empty/whitespace text (`{error:'empty-text'}`) and an occupied date (`{error:'date-occupied'}`); `updateReminder` rejects moving onto a date occupied by a *different* reminder; a reminder created without a color defaults to green.

**Done when:**
- [x] A reminder can be created, read, updated (text/color/date), and deleted
- [x] Creating a second reminder on an occupied date is rejected, leaving the existing one unchanged
- [x] Moving a reminder onto a date that already has a different reminder is rejected, leaving both unchanged
- [x] A reminder created without a color defaults to green

**Estimate:** ~30 min

**Depends on:** Task 2

**Evidence:** No dedicated pure-logic test file exists for this (`reminders.test.js` from Task 2 exercises it end-to-end through the DOM, which needs Task 19/20's form/popup wiring to go green) — ran a standalone script directly against `data.js` instead: default-green, date-collision on create, empty-text rejection, move-onto-occupied-date rejection, move-to-a-free-date, and delete all confirmed PASS. Full DOM-level pass-through verification happens when `reminders.test.js` goes green at Task 20.

---

## Task 10 — Module split refactor

**Status:** pending

**Files:** `src/todo-app/app.js`, `src/todo-app/calendar.js` (new), `src/todo-app/render.js` (new), `src/todo-app/data.js`

**Description:** Mechanical refactor: carve the base app's existing rendering/interaction code out of `app.js` into `render.js` (DOM building) and `calendar.js` (grid construction, imports `data.js`'s date-math), leaving `app.js` as the entry point that wires everything together via native ES module `import`/`export`. No behavior change.

**Done when:**
- [ ] All 34 existing base-app tests still pass unmodified after the split
- [ ] `index.html` still loads the app correctly via `<script type="module" src="app.js">` with no other markup changes

**Estimate:** ~40 min

**Depends on:** Task 3, Task 4, Task 5, Task 6, Task 7, Task 8, Task 9

**Evidence:** —

---

## Task 11 — Calendar month-view rendering

**Status:** pending

**Files:** `src/todo-app/calendar.js`, `src/todo-app/render.js`, `src/todo-app/index.html`, `src/todo-app/style.css`

**Description:** Render the month view (default, current month): one square per day, colored via `band()`/`dayRatio()` from Task 4, today's square visually distinguishable.

**Done when:**
- [ ] Opening the calendar with no prior view choice shows the month containing today's date
- [ ] Today's square is visually distinguishable from other days
- [ ] Each day square's color matches its computed band

**Estimate:** ~40 min

**Depends on:** Task 10

**Evidence:** —

---

## Task 12 — Week/year views and navigation

**Status:** pending

**Files:** `src/todo-app/calendar.js`, `src/todo-app/render.js`, `src/todo-app/index.html`, `src/todo-app/style.css`

**Description:** View-switcher control (month/week/year) and previous/next/today navigation, reusing Task 11's per-day rendering across all three grid shapes.

**Done when:**
- [ ] Switching to week view shows the current week's 7 days, correctly colored
- [ ] Switching to year view shows every day of the current year, correctly colored
- [ ] Navigating previous/next moves the shown period without changing view mode; "today" returns to the period containing today's date

**Estimate:** ~35 min

**Depends on:** Task 11

**Evidence:** —

---

## Task 13 — New-task form: date and recurrence fields

**Status:** pending

**Files:** `src/todo-app/index.html`, `src/todo-app/app.js`, `src/todo-app/style.css`

**Description:** Extend the existing new-task form with a date field (single-dated) and recurrence sub-fields (weekday checkboxes, start date, end date), wired to Task 5/7's data layer. Validation errors (end-before-start, zero-occurrence range is *not* an error) surface in the UI.

**Done when:**
- [ ] Submitting with a date and no recurrence creates a single-dated task
- [ ] Submitting with weekdays + a range creates a recurring task with the expected occurrences
- [ ] Submitting with neither creates a general task, unchanged from today
- [ ] An end date before the start date shows a validation error and creates nothing

**Estimate:** ~40 min

**Depends on:** Task 10, Task 7

**Evidence:** —

---

## Task 14 — Scheduled list rendering and interactions

**Status:** pending

**Files:** `src/todo-app/render.js`, `src/todo-app/app.js`, `src/todo-app/index.html`, `src/todo-app/style.css`

**Description:** Render the Scheduled list (all dated items, date-ascending, ties by creation order), reusing the base app's swipe-to-delete and done-checkbox row builders. Wire per-occurrence done/not-done toggling.

**Done when:**
- [ ] The Scheduled list shows single-dated tasks and every recurring occurrence, sorted by date ascending
- [ ] Dated items never appear in the general urgency-sorted list, and vice versa
- [ ] Marking one occurrence done does not affect sibling occurrences of the same series
- [ ] A dated item stays visible (done or not) until explicitly deleted

**Estimate:** ~40 min

**Depends on:** Task 13

**Evidence:** —

---

## Task 15 — Delete wiring: archive-or-erase

**Status:** pending

**Files:** `src/todo-app/app.js`, `src/todo-app/render.js`

**Description:** Wire the Scheduled list's swipe-to-delete control to Task 8's `resolveDelete`, so deleting a dated item archives or erases it per the done/overdue/future rule, and re-renders the calendar's affected day.

**Done when:**
- [ ] Deleting a done item removes it from the Scheduled list but its day's color is unchanged
- [ ] Deleting an overdue, not-done item removes it from the Scheduled list but its day's color is unchanged
- [ ] Deleting a future, not-yet-due item removes it with no archived record and its day's ratio recalculates without it
- [ ] Deletion still requires the swipe-to-reveal gesture first — a plain tap never deletes

**Estimate:** ~30 min

**Depends on:** Task 14, Task 8

**Evidence:** —

---

## Task 16 — This-occurrence vs. whole-series delete choice

**Status:** pending

**Files:** `src/todo-app/app.js`, `src/todo-app/render.js`, `src/todo-app/index.html`

**Description:** When deleting an occurrence of a recurring task, present the "this occurrence only" / "the whole series" choice; wire "whole series" to archive/erase every occurrence individually per Task 15's rule.

**Done when:**
- [ ] Deleting an occurrence offers both choices; a single-dated task's delete does not (it has no series)
- [ ] "This occurrence only" removes just that occurrence; siblings are untouched
- [ ] "The whole series" archives every past done/overdue occurrence individually and erases every future not-yet-due one, with no trace

**Estimate:** ~35 min

**Depends on:** Task 15

**Evidence:** —

---

## Task 17 — Edit a task's date or a series' recurrence rule

**Status:** pending

**Files:** `src/todo-app/app.js`, `src/todo-app/render.js`, `src/todo-app/index.html`

**Description:** Single-dated tasks: edit or clear the date (clearing converts it back to a general task, via Task 5's `clearTaskDate`). Recurring tasks: UI wiring to call Task 7's already-implemented `updateSeriesRule` (weekday/date-range edit, regenerating only occurrences dated today or later) — the reconciliation logic itself was built and tested in Task 7, not here.

**Done when:**
- [ ] Changing a single-dated task's date moves it everywhere it's shown (Scheduled list, calendar, heatmap)
- [ ] Clearing a single-dated task's date moves it into the general urgency-sorted list
- [ ] Editing a series' rule adds/removes only occurrences dated today or later; past occurrences and their done state are unchanged

**Estimate:** ~35 min

**Depends on:** Task 13, Task 7

**Evidence:** —

---

## Task 18 — Day-detail panel

**Status:** pending

**Files:** `src/todo-app/render.js`, `src/todo-app/app.js`, `src/todo-app/index.html`, `src/todo-app/style.css`

**Description:** Tapping any day on the calendar (not a reminder marker) opens a read-only panel listing that date's still-existing dated items plus its archived records, each showing text and done/not-done state. No edit/complete/delete controls in this panel.

**Done when:**
- [ ] Tapping a day with both live and archived items lists all of them correctly
- [ ] Tapping a day with nothing scheduled shows an empty state
- [ ] No control in the panel can mark done/not-done, edit, delete, or un-archive anything

**Estimate:** ~35 min

**Depends on:** Task 11, Task 14, Task 8

**Evidence:** —

---

## Task 19 — New-reminder form

**Status:** pending

**Files:** `src/todo-app/index.html`, `src/todo-app/app.js`, `src/todo-app/style.css`

**Description:** A dedicated form (separate from the task form) for creating a reminder: text, color (green/yellow, green default), date. Wired to Task 9's data layer, surfacing its validation errors (empty text, occupied date).

**Done when:**
- [ ] Submitting text + a date with no color picked creates a green reminder
- [ ] Submitting empty or whitespace-only text creates nothing
- [ ] Submitting a date that already has a reminder is rejected, leaving the existing one unchanged

**Estimate:** ~30 min

**Depends on:** Task 9, Task 10

**Evidence:** —

---

## Task 20 — Reminder markers and content popup

**Status:** pending

**Files:** `src/todo-app/render.js`, `src/todo-app/app.js`, `src/todo-app/index.html`, `src/todo-app/style.css`

**Description:** Render a small colored marker on a date's calendar square when it has a reminder, in every view. Tapping the marker (distinct from tapping elsewhere on the day) opens its text with edit (text/color/date) and delete controls.

**Done when:**
- [ ] A date with a reminder shows its marker in month, week, and year views, alongside the heatmap color
- [ ] Tapping the marker opens the text with edit and delete controls; tapping elsewhere on that day still opens the Task 18 day-detail panel instead
- [ ] Editing text/color/date updates the reminder and, for a date change, moves the marker; editing onto an occupied date is rejected
- [ ] Deleting removes the reminder immediately with no undo
- [ ] A reminder's own color and presence never change any day's heatmap band, and it never appears in the Scheduled or general list

**Estimate:** ~40 min

**Depends on:** Task 19, Task 11

**Evidence:** —

---

## Task 21 — PWA shell: cache versioning

**Status:** pending

**Files:** `src/todo-app/service-worker.js`

**Description:** Bump `CACHE_NAME` (`todo-v4` → `todo-v5`) and add `data.js`, `calendar.js`, `render.js` to `SHELL_FILES`, per the standing rule from `specs/todo-app/plan.md`.

**Done when:**
- [ ] `CACHE_NAME` is bumped and every new/changed shell file is listed in `SHELL_FILES`
- [ ] A simulated update (new `CACHE_NAME`, service worker `activate`) evicts the old cache

**Estimate:** ~15 min

**Depends on:** Tasks 12–20

**Evidence:** —

---

## Task 22 — Manual verification on a physical iPhone

**Status:** pending

**Files:** —

**Description:** Exercise the deployed app (live GitHub Pages URL, auto-deployed by the existing `deploy-pages.yml`) on a physical iPhone: all three calendar views, day-detail panel, reminder create/edit/delete and marker tap targets (especially in year view's small cells), this-occurrence/whole-series delete choice, plus a full regression pass of the base app's existing Sprint Contract items.

**Done when:**
- [ ] Every item in `plan.md`'s Sprint contract is checked on-device against the live URL
- [ ] Reminder-marker and day-cell tap targets are confirmed hittable in year view specifically
- [ ] The base app's existing on-device checks (Home Screen install, offline use, swipe-to-delete) still pass

**Estimate:** ~35 min

**Depends on:** Task 21

**Evidence:** —

---

## Task 23 — Code review

**Status:** pending

**Files:** —

**Description:** Run the `code-reviewer` skill (clean-context subagent) over the full diff. Address every blocker; assess and accept or justify every suggestion, each in its own dedicated commit (per the process `specs/todo-app/retrospective.md` #1 and #5 learned the hard way).

**Done when:**
- [ ] No remaining blockers
- [ ] Every suggestion explicitly accepted (and fixed) or justified (and left)

**Estimate:** ~30 min

**Depends on:** Tasks 3–22

**Evidence:** —

---

## Task 24 — Final verification and merge

**Status:** pending

**Files:** `specs/task-calendar/tasks.md` (traceability table → `verified`), `specs/task-calendar/plan.md` (Sprint Contract + Definition of Done → all checked)

**Description:** Confirm all 50 spec criteria are verified and `plan.md`'s Definition of Done is complete, get human approval, then commit.

**Done when:**
- [ ] All 50 acceptance criteria verified (traceability table below fully `verified`)
- [ ] `plan.md`'s Definition of Done is complete

**Estimate:** ~25 min

**Depends on:** Task 23

**Evidence:** —

---

## Traceability

| Spec criterion | Task(s) | Status |
| --- | --- | --- |
| C1: give a task a single date at creation | Task 13 | pending |
| C2: give a task a recurrence rule at creation | Task 13 | pending |
| C3: a task is exactly one kind at a time | Task 5, Task 13 | pending |
| C4: recurring task expands into one occurrence per matching date | Task 7 | pending |
| C5: each occurrence has independent done/not-done state | Task 6, Task 14 | pending |
| C6: end date before start date fails validation | Task 7 | pending |
| C7: zero-matching-weekday range succeeds with zero occurrences | Task 7 | pending |
| C8: Scheduled list shows every dated item, sorted by date | Task 14 | pending |
| C9: dated items never in the general list, and vice versa | Task 5, Task 14 | pending |
| C10: a dated item stays visible until explicitly deleted | Task 14 | pending |
| C11: mark/unmark an occurrence without affecting siblings | Task 14 | pending |
| C12: delete any dated item, removed immediately | Task 15 | pending |
| C13: deletion requires swipe-to-reveal, not a plain tap | Task 15 | pending |
| C14: overdue = date strictly before today and not done | Task 8 | pending |
| C15: deleting a done/overdue item archives it | Task 8, Task 15 | pending |
| C16: deleting a future, not-yet-due item erases it with no trace | Task 8, Task 15 | pending |
| C17: archiving never changes a day's ratio or color | Task 4, Task 8 | pending |
| C18: tapping any day opens a read-only live+archived list | Task 18 | pending |
| C19: an empty day shows an empty state | Task 18 | pending |
| C20: an archived record is immutable everywhere | Task 8, Task 18 | pending |
| C21: the day-detail view is read-only | Task 18 | pending |
| C22: deleting an occurrence offers this-occurrence/whole-series | Task 16 | pending |
| C23: "this occurrence only" follows the done/overdue/future rule | Task 8, Task 16 | pending |
| C24: "the whole series" archives past occurrences individually, erases future ones | Task 8, Task 16 | pending |
| C25: a single-dated task's date is editable after creation | Task 17 | pending |
| C26: clearing a date converts the task back to general | Task 17 | pending |
| C27: a series' weekdays/date range are editable after creation | Task 17 | pending |
| C28: editing a rule only touches occurrences dated today or later | Task 7, Task 17 | pending |
| C29: calendar defaults to month view, today distinguishable | Task 11 | pending |
| C30: calendar switches between month/week/year | Task 12 | pending |
| C31: calendar navigates previous/next/today | Task 12 | pending |
| C32: every view renders one square/day on the 5-level scale | Task 11, Task 12 | pending |
| C33: a day's ratio is done/total dated items that day | Task 4 | pending |
| C34: zero dated items shows the lightest band | Task 4, Task 11 | pending |
| C35: all dated items done shows the darkest band | Task 4, Task 11 | pending |
| C36: the 5 bands map to fixed ratio ranges | Task 4 | pending |
| C37: a general task's done state never changes calendar color | Task 4 | pending |
| C38: all base-app acceptance criteria still pass for general tasks | Task 10, Task 22 | pending |
| C39: create a reminder via its own form | Task 19 | pending |
| C40: a reminder with no color picked defaults to green | Task 19 | pending |
| C41: empty/whitespace reminder text creates nothing | Task 19 | pending |
| C42: at most one reminder per date, enforced on create | Task 9, Task 19 | pending |
| C43: every calendar view shows a marker for a date with a reminder | Task 20 | pending |
| C44: tapping a marker opens text+edit+delete, distinct from a day tap | Task 20 | pending |
| C45: a reminder's text/color/date are each editable | Task 20 | pending |
| C46: moving a reminder onto an occupied date fails | Task 9, Task 20 | pending |
| C47: a reminder is deletable, immediately and permanently | Task 20 | pending |
| C48: a reminder never affects any day's heatmap | Task 4, Task 20 | pending |
| C49: a reminder's text renders as plain text | Task 20 | pending |
| C50: a reminder never appears in the Scheduled or general list | Task 9, Task 20 | pending |

> Update status as tasks progress, using the same lifecycle (`pending | in-progress | done | verified`). A criterion is `verified` only when exercised against the running application, not just by green unit tests.
