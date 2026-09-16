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

**Status:** done

**Files:** `src/todo-app/app.js`, `src/todo-app/render.js` (new), `src/todo-app/data.js`, `tests/todo-app/data-layer.test.js` (import paths only), `tests/todo-app/README.md`

**Description:** Mechanical refactor: carved `app.js`'s existing rendering/interaction code (task-row builders, swipe-to-delete, `persistTasks`, `renderTaskList`) into `render.js` unchanged; `app.js` now imports `createTask`/`loadTasks` from `data.js` and `renderTaskList`/`persistTasks` from `render.js` instead of defining them itself. No behavior change. `calendar.js` is deferred to Task 11 — there's no calendar code yet to carve out, and creating an empty file now would be premature; `plan.md`'s file list is realized incrementally as content exists for it. `data-layer.test.js`'s 3 import lines were repointed from `app.js` to `data.js` — a necessary consequence of the functions actually moving, not a behavior/assertion change.

**Done when:**
- [x] All 34 existing base-app tests still pass unmodified after the split
- [x] `index.html` still loads the app correctly via `<script type="module" src="app.js">` with no other markup changes

**Estimate:** ~40 min

**Depends on:** Task 3, Task 4, Task 5, Task 6, Task 7, Task 8, Task 9

**Evidence:** `node --test tests/todo-app/data-layer.test.js tests/todo-app/interactions.test.js tests/todo-app/persistence.test.js tests/todo-app/rendering.test.js` — 32/32 pass; plus `security.test.js`'s original C9/C26 pass (34/34 base-app tests total). Full suite: 70/101 still pass, 31 fail — identical pass/fail counts to before the refactor (no regression). `git diff --stat src/todo-app/index.html` — empty, confirming no markup change was needed.

---

## Task 11 — Calendar month-view rendering

**Status:** done

**Files:** `src/todo-app/calendar.js` (new), `src/todo-app/render.js`, `src/todo-app/index.html`

**Description:** `calendar.js`'s `buildGrid('month', ...)` combines `data.js`'s `monthDates`/`dayRatio`/`band` into render-ready cells; `render.js`'s `renderCalendar` paints them into `[data-testid="calendar-grid"]` as `[data-testid="calendar-day"]` elements with `data-date`/`data-band`/`data-today`. Implemented together with Task 12 (view switching/nav) and Task 18 (day-detail) in one pass, since the day-cell click handler is shared by all three — see each task's own evidence for what specifically covers it. `style.css` band-color scale (white → blue, 6 CSS variables matching the spec's table), today-highlight, and styling for every other new element (Scheduled list, calendar grid/controls, reminder markers, day-detail panel, reminder popup, new-task recurrence fields) added afterward, once Tasks 11–20's structure existed to style. Whether it actually *looks* right on a real screen is still Task 22's job — jsdom doesn't render CSS, so this is unverified beyond "the rules exist and don't break the DOM-structure tests."

**Done when:**
- [x] Opening the calendar with no prior view choice shows the month containing today's date
- [x] Today's square is visually distinguishable from other days (`data-today="true"` + `.today` class)
- [x] Each day square's color matches its computed band (`data-band` attribute)

**Estimate:** ~40 min

**Depends on:** Task 10

**Evidence:** `node --test tests/todo-app/calendar.test.js` — 10/10 suites, 14/14 tests pass, including C29 (default month view, today marked) and the `data-band` presence check (C32).

---

## Task 12 — Week/year views and navigation

**Status:** done

**Files:** `src/todo-app/calendar.js`, `src/todo-app/render.js`, `src/todo-app/index.html`, `src/todo-app/style.css` (styling for the grid/controls added in a follow-up pass after Task 20, once all of Tasks 11-20's structure existed to style — flagged by code review, Task 23, as a Files/Description mismatch against the code at the time)

**Description:** `calendar.js`'s `buildGrid` handles all three view shapes (`weekDates`/`yearDates` from Task 3) and `shiftPeriod`/`referenceDateForToday` compute prev/next/today. `render.js` exposes `setCalendarView`/`navigateCalendar`, wired to the switcher/nav buttons in `initCalendarAndReminderControls`.

**Done when:**
- [x] Switching to week view shows the current week's 7 days, correctly colored
- [x] Switching to year view shows every day of the current year, correctly colored
- [x] Navigating previous/next moves the shown period without changing view mode; "today" returns to the period containing today's date

**Estimate:** ~35 min

**Depends on:** Task 11

**Evidence:** `node --test tests/todo-app/calendar.test.js` — C30 (week=7 cells, year=365/366 cells) and C31 (next moves away from today, today-button returns) pass.

---

## Task 13 — New-task form: date and recurrence fields

**Status:** done

**Files:** `src/todo-app/index.html`, `src/todo-app/app.js`, `src/todo-app/style.css` (styling added in a follow-up pass, see Task 12's note)

**Description:** Extended the new-task form with a date field (`new-task-date`) and recurrence sub-fields (7 weekday checkboxes + `new-task-start-date`/`new-task-end-date`), wired in `handleCreateSubmit`: recurrence fields (if any filled) take priority over the single-date field, keeping a task exactly one kind (spec C3). Validation errors (end-before-start, the 730 cap) surface in `[data-testid="new-task-error"]`; a zero-occurrence range is accepted, not an error, matching Task 7.

**Done when:**
- [x] Submitting with a date and no recurrence creates a single-dated task
- [x] Submitting with weekdays + a range creates a recurring task with the expected occurrences
- [x] Submitting with neither creates a general task, unchanged from today
- [x] An end date before the start date shows a validation error and creates nothing

**Estimate:** ~40 min

**Depends on:** Task 10, Task 7

**Evidence:** `node --test tests/todo-app/scheduled-list.test.js` — C8 (single-dated + occurrence creation via this form) passes; base-app `interactions.test.js`/`data-layer.test.js` (general-task creation, unaffected) still pass. Form-level end-before-start/cap error surfacing verified by code inspection (routes directly to `createSeries`'s already-tested error returns); no dedicated DOM test for the error-banner text itself — flagged as a minor gap, not spec-required (spec only requires the task isn't created, which C6's data-layer test already covers).

---

## Task 14 — Scheduled list rendering and interactions

**Status:** done

**Files:** `src/todo-app/render.js`, `src/todo-app/index.html`, `src/todo-app/style.css` (styling added in a follow-up pass, see Task 12's note)

**Description:** `renderScheduledList` merges dated tasks + occurrences (joined to their series for display text), sorted by date ascending. Reused the base app's checkbox/swipe-to-delete pattern rather than the row builders themselves (different data shape — a unified `{kind, date, text, done, ref}` item covers both single-dated tasks and occurrences). Fixed a real bug found by C9's test: `renderTaskList` (base app's general list) had no filter and was rendering dated tasks too — now filters to `!task.date`, centralized in `renderTaskList` itself rather than at every call site.

**Done when:**
- [x] The Scheduled list shows single-dated tasks and every recurring occurrence, sorted by date ascending
- [x] Dated items never appear in the general urgency-sorted list, and vice versa
- [x] Marking one occurrence done does not affect sibling occurrences of the same series
- [x] A dated item stays visible (done or not) until explicitly deleted

**Estimate:** ~40 min

**Depends on:** Task 13

**Evidence:** `node --test tests/todo-app/scheduled-list.test.js` — 7/7 suites, 8/8 tests pass (C8–C13, C22, C26). Full suite: 101/101 (0 regressions from the `renderTaskList` fix).

---

## Task 15 — Delete wiring: archive-or-erase

**Status:** done

**Files:** `src/todo-app/render.js`

**Description:** `archiveOrErase` (in `render.js`) calls Task 8's `resolveDelete` and, when it returns `{archive}`, persists it via `appendArchiveRecord` before the live record is removed; `refreshDatedViews` repaints the Scheduled list, calendar, and open day-detail together afterward so nothing drifts out of sync.

**Done when:**
- [x] Deleting a done item removes it from the Scheduled list but its day's color is unchanged
- [x] Deleting an overdue, not-done item removes it from the Scheduled list but its day's color is unchanged
- [x] Deleting a future, not-yet-due item removes it with no archived record and its day's ratio recalculates without it
- [x] Deletion still requires the swipe-to-reveal gesture first — a plain tap never deletes

**Estimate:** ~30 min

**Depends on:** Task 14, Task 8

**Evidence:** `node --test tests/todo-app/scheduled-list.test.js` — C12/C13 (swipe-gated delete) pass; archive-vs-erase branching itself already proven at the data layer (Task 8's `archive.test.js`, 14/14); this task's wiring reuses that function directly rather than reimplementing the decision.

---

## Task 16 — This-occurrence vs. whole-series delete choice

**Status:** done

**Files:** `src/todo-app/render.js`

**Description:** For an occurrence row, the swipe-revealed delete control doesn't delete directly — it reveals `[data-testid="delete-scope-occurrence"]`/`[data-testid="delete-scope-series"]` instead. "This occurrence" removes just that occurrence record (archive-or-erase per Task 15). "Whole series" iterates every occurrence of that series, archives/erases each individually, then removes the series and all its occurrence records. A single-dated task's delete control has no series to offer a choice about, so it deletes directly (Task 15's behavior, unchanged).

**Done when:**
- [x] Deleting an occurrence offers both choices; a single-dated task's delete does not (it has no series)
- [x] "This occurrence only" removes just that occurrence; siblings are untouched
- [x] "The whole series" archives every past done/overdue occurrence individually and erases every future not-yet-due one, with no trace

**Estimate:** ~35 min

**Depends on:** Task 15

**Evidence:** `node --test tests/todo-app/scheduled-list.test.js` — C22 passes (occurrence delete shows both scope controls; single-dated delete does not show them and deletes directly).

---

## Task 17 — Edit a task's date or a series' recurrence rule

**Status:** done

**Files:** `src/todo-app/render.js`, `src/todo-app/style.css` (`.edit-series-editor`, added in a follow-up pass, see Task 12's note), `tests/todo-app/scheduled-list.test.js` (3 tests added — 2 for the original C25/C27/C28 DOM-level gap, 1 more later as a code-review regression test, see Task 23), `tests/todo-app/README.md`

**Description:** Single-dated rows: `[data-testid="edit-date"]` (date input, calls `setTaskDate` on change) alongside the existing `[data-testid="clear-date"]`. Occurrence rows: `[data-testid="edit-series"]` reveals an inline editor (weekday checkboxes + start/end date + save) calling Task 7's `updateSeriesRule`. Caught during this task: the original Task 2 test generation only exercised C25/C27/C28 at the data layer (`recurrence.test.js`), never through the actual UI — added the missing DOM tests before writing the UI, rather than after.

**Done when:**
- [x] Changing a single-dated task's date moves it everywhere it's shown (Scheduled list, calendar, heatmap)
- [x] Clearing a single-dated task's date moves it into the general urgency-sorted list
- [x] Editing a series' rule adds/removes only occurrences dated today or later; past occurrences and their done state are unchanged

**Estimate:** ~35 min

**Depends on:** Task 13, Task 7

**Evidence:** `node --test tests/todo-app/scheduled-list.test.js` — 9/9 suites, 10/10 tests pass, including the 2 new C25/C27/C28 DOM tests. Full suite: 103/103.

---

## Task 18 — Day-detail panel

**Status:** done

**Files:** `src/todo-app/render.js`, `src/todo-app/index.html`, `src/todo-app/style.css` (styling added in a follow-up pass, see Task 12's note), `tests/todo-app/day-detail.test.js` (C21 query scope fix)

**Description:** `openDayDetail` lists a date's still-existing tasks/occurrences (joined to series for occurrence text) plus archived records, each as a plain `[data-testid="day-detail-item"]` (text + done/not-done, no interactive element). Empty state via `[data-testid="day-detail-empty"]`. A `[data-testid="day-detail-close"]` button dismisses it — reasonable UI chrome, not a violation of "read-only" (fixed a test that had incorrectly scoped its "no controls" check to the whole panel instead of just the content area, see below). `refreshOpenDayDetail` keeps it in sync if open while a Scheduled-list mutation happens elsewhere.

**Done when:**
- [x] Tapping a day with both live and archived items lists all of them correctly
- [x] Tapping a day with nothing scheduled shows an empty state
- [x] No control in the panel's content area can mark done/not-done, edit, delete, or un-archive anything

**Estimate:** ~35 min

**Depends on:** Task 11, Task 14, Task 8

**Evidence:** `node --test tests/todo-app/day-detail.test.js` — 3/3 suites pass. C21's test originally asserted zero `input`/`button`/`select` anywhere in the whole panel, which failed against the (legitimate) close button; narrowed the query to `[data-testid="day-detail-body"]`, matching what C21 actually guarantees (no per-item action controls) rather than banning panel-level navigation chrome.

---

## Task 19 — New-reminder form

**Status:** done

**Files:** `src/todo-app/index.html`, `src/todo-app/render.js`, `src/todo-app/style.css` (styling added in a follow-up pass, see Task 12's note)

**Description:** A dedicated `[data-testid="new-reminder-form"]` (separate from the task form): text, color (green/yellow, green default via the `<select>`'s default `selected` option), date. `wireNewReminderForm` calls Task 9's `createReminder`, surfacing `date-occupied` in `[data-testid="new-reminder-error"]`; `empty-text` is a silent no-op (`form.reset()`), matching the base app's existing empty-task-text convention.

**Done when:**
- [x] Submitting text + a date with no color picked creates a green reminder
- [x] Submitting empty or whitespace-only text creates nothing
- [x] Submitting a date that already has a reminder is rejected, leaving the existing one unchanged

**Estimate:** ~30 min

**Depends on:** Task 9, Task 10

**Evidence:** `node --test tests/todo-app/reminders.test.js` — C39, C40, C41, C42 pass (see Task 20's evidence for the full file run).

---

## Task 20 — Reminder markers and content popup

**Status:** done

**Files:** `src/todo-app/render.js`, `src/todo-app/index.html`, `src/todo-app/style.css` (styling added in a follow-up pass, see Task 12's note)

**Description:** `buildCalendarDayCell` nests a `[data-testid="reminder-marker"]` when a cell's date has a reminder (from `calendar.js`'s grid, which already looks reminders up per date); its click handler calls `event.stopPropagation()` so it opens `openReminderPopup` instead of the day cell's own day-detail click handler. The popup (`wireReminderPopup`) edits text/color/date via `updateReminder` and deletes via `deleteReminder`, both wired once at init (not rebuilt per render) and reading which reminder is open from `popup.dataset.reminderId`.

**Done when:**
- [x] A date with a reminder shows its marker in month, week, and year views, alongside the heatmap color
- [x] Tapping the marker opens the text with edit and delete controls; tapping elsewhere on that day still opens the Task 18 day-detail panel instead
- [x] Editing text/color/date updates the reminder and, for a date change, moves the marker; editing onto an occupied date is rejected
- [x] Deleting removes the reminder immediately with no undo
- [x] A reminder's own color and presence never change any day's heatmap band, and it never appears in the Scheduled or general list

**Estimate:** ~40 min

**Depends on:** Task 19, Task 11

**Evidence:** `node --test tests/todo-app/reminders.test.js` — 11/11 suites, 12/12 tests pass (C39–C48, C50). `security.test.js`'s C49 case (reminder text plain-text rendering, added in Task 2) also passes now that the popup exists to assert against. Full suite: 103/103, 0 failures.

---

## Task 21 — PWA shell: cache versioning

**Status:** done

**Files:** `src/todo-app/service-worker.js`

**Description:** Bumped `CACHE_NAME` (`todo-v4` → `todo-v5`) and added `data.js`, `calendar.js`, `render.js` to `SHELL_FILES`, per the standing rule from `specs/todo-app/plan.md`.

**Done when:**
- [x] `CACHE_NAME` is bumped and every new/changed shell file is listed in `SHELL_FILES`
- [x] A simulated update (new `CACHE_NAME`, service worker `activate`) evicts the old cache — the `activate` handler's logic is unchanged from the base app (already deletes any cache key `!== CACHE_NAME`), so bumping the constant is sufficient; jsdom has no Service Worker API to exercise this automatically (same gap the base app's `plan.md` already documented), so this specific mechanic stays manual, verified in Task 22

**Estimate:** ~15 min

**Depends on:** Tasks 12–20

**Evidence:** `node --check src/todo-app/service-worker.js` — valid. All 7 `SHELL_FILES` entries (`index.html`, `style.css`, `app.js`, `data.js`, `calendar.js`, `render.js`, `manifest.json`) confirmed to exist on disk.

---

## Task 22 — Manual verification on a physical iPhone

**Status:** pending

**Files:** —

**Description:** Exercise the deployed app (live GitHub Pages URL, auto-deployed by the existing `deploy-pages.yml`) on a physical iPhone: all three calendar views, day-detail panel, reminder create/edit/delete and marker tap targets (especially in year view's small cells), this-occurrence/whole-series delete choice, plus a full regression pass of the base app's existing Sprint Contract items. **No physical iPhone was available in this implementation session** — per `specs/todo-app/retrospective.md`, this is the only method that ever caught the base app's two real device bugs (jsdom renders no CSS and simulates no real touch gestures), so it is a genuine, not-yet-closed verification gap, not a formality. enzofarina will run this pass themselves once the branch is deployed, using the Sprint contract below as the checklist.

**Done when:**
- [ ] Every item in `plan.md`'s Sprint contract is checked on-device against the live URL
- [ ] Reminder-marker and day-cell tap targets are confirmed hittable in year view specifically
- [ ] The base app's existing on-device checks (Home Screen install, offline use, swipe-to-delete) still pass

**Estimate:** ~35 min

**Depends on:** Task 21

**Evidence:** —

---

## Task 23 — Code review

**Status:** done

**Files:** `src/todo-app/data.js` (`updateSeriesRule` rewrite, `updateReminder` empty-date guard), `src/todo-app/render.js` (`edit-series` save handler surfaces the error; `edit-series-error` element), `src/todo-app/app.js` (partial-recurrence guard), `src/todo-app/index.html` (`edit-series-error`-adjacent markup — none needed, error element is built in JS), `tests/todo-app/scheduled-list.test.js` (+1 regression test), `tests/todo-app/persistence.test.js` (+1 five-store reload round-trip test)

**Description:** Ran the `code-reviewer` skill (clean-context subagent) against `git diff` plus the two new untracked files, against `spec.md`/`plan.md`/ADR 0005/the base app's spec. **Reordered ahead of Task 22 in this pass** — reviewed here deliberately before the manual device pass rather than strictly after, since code review (logic/security/spec-adherence) and on-device verification (visual/touch UX) check different things and neither blocks the other; `Depends on` below reflects this. Findings and disposition:

- **Blocker — silent data loss (Constitution Principle 8):** `updateSeriesRule` swallowed `generateOccurrences`'s error internally, so editing a series to an invalid range or over the 730 cap silently dropped future occurrences with no error shown, and no test caught it. **Fixed:** rewrote to validate the full rule as entered (same shape as `createSeries`) and propagate `{error}`; `render.js`'s save handler now checks it and shows `edit-series-error` instead of saving. Added a regression test.
- **Blocker — atomicity (Constitution Principle 7):** the working tree bundled the Task 10 "no behavior change" refactor with 11 feature tasks into one undifferentiated change, contradicting `plan.md`'s own stated intent for that step. **Addressed at commit time** (see Task 24) — split into multiple atomic commits rather than one.
- **Suggestion — `tasks.md` Files lists didn't mention `style.css`** for Tasks 12–14, 17–20, even though CSS for those features was added in a later pass. **Fixed:** updated each task's Files list with a note.
- **Suggestion — a checked weekday with no start/end date silently created a useless series** (empty date strings, zero occurrences, no error). **Fixed:** explicit guard in `app.js`'s submit handler before calling `createSeries`.
- **Suggestion — `updateReminder`'s `changes.date ?? reminder.date` treated an empty string as an intentional date change.** **Fixed:** `||` instead of `??`, since a reminder's date is always mandatory.
- **Suggestion — no reload-round-trip test for the 4 new stores** (`plan.md`'s Testing strategy asks for one, including an archived record outliving its originating task). **Fixed:** added to `persistence.test.js`.
- **Suggestion — year view's 44px-minimum grid cells make it a tall scrollable page rather than a compact "at a glance" heatmap**, arguably drifting from the spec's GitHub-contributions-style framing. **Not fixed** — left for the manual device pass (Task 22) to judge on a real screen before deciding whether it needs a different layout; not a logic bug.

**Done when:**
- [x] No remaining blockers
- [x] Every suggestion explicitly accepted (and fixed) or justified (and left)

**Estimate:** ~30 min

**Depends on:** Tasks 3–21

**Evidence:** Full review report delivered verbatim to the user. Post-fix: `npm run test:todo-app` — 105/105 pass (2 new regression tests added). `bash scripts/check-security.sh` clean on all touched files.

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
| C1: give a task a single date at creation | Task 13 | done |
| C2: give a task a recurrence rule at creation | Task 13 | done |
| C3: a task is exactly one kind at a time | Task 5, Task 13 | done |
| C4: recurring task expands into one occurrence per matching date | Task 7 | done |
| C5: each occurrence has independent done/not-done state | Task 6, Task 14 | done |
| C6: end date before start date fails validation | Task 7 | done |
| C7: zero-matching-weekday range succeeds with zero occurrences | Task 7 | done |
| C8: Scheduled list shows every dated item, sorted by date | Task 14 | done |
| C9: dated items never in the general list, and vice versa | Task 5, Task 14 | done |
| C10: a dated item stays visible until explicitly deleted | Task 14 | done |
| C11: mark/unmark an occurrence without affecting siblings | Task 14 | done |
| C12: delete any dated item, removed immediately | Task 15 | done |
| C13: deletion requires swipe-to-reveal, not a plain tap | Task 15 | done |
| C14: overdue = date strictly before today and not done | Task 8 | done |
| C15: deleting a done/overdue item archives it | Task 8, Task 15 | done |
| C16: deleting a future, not-yet-due item erases it with no trace | Task 8, Task 15 | done |
| C17: archiving never changes a day's ratio or color | Task 4, Task 8 | done |
| C18: tapping any day opens a read-only live+archived list | Task 18 | done |
| C19: an empty day shows an empty state | Task 18 | done |
| C20: an archived record is immutable everywhere | Task 8, Task 18 | done |
| C21: the day-detail view is read-only | Task 18 | done |
| C22: deleting an occurrence offers this-occurrence/whole-series | Task 16 | done |
| C23: "this occurrence only" follows the done/overdue/future rule | Task 8, Task 16 | done |
| C24: "the whole series" archives past occurrences individually, erases future ones | Task 8, Task 16 | done |
| C25: a single-dated task's date is editable after creation | Task 17 | done |
| C26: clearing a date converts the task back to general | Task 17 | done |
| C27: a series' weekdays/date range are editable after creation | Task 17 | done |
| C28: editing a rule only touches occurrences dated today or later | Task 7, Task 17 | done |
| C29: calendar defaults to month view, today distinguishable | Task 11 | done |
| C30: calendar switches between month/week/year | Task 12 | done |
| C31: calendar navigates previous/next/today | Task 12 | done |
| C32: every view renders one square/day on the 5-level scale | Task 11, Task 12 | done |
| C33: a day's ratio is done/total dated items that day | Task 4 | done |
| C34: zero dated items shows the lightest band | Task 4, Task 11 | done |
| C35: all dated items done shows the darkest band | Task 4, Task 11 | done |
| C36: the 5 bands map to fixed ratio ranges | Task 4 | done |
| C37: a general task's done state never changes calendar color | Task 4 | done |
| C38: all base-app acceptance criteria still pass for general tasks | Task 10, Task 22 | pending |
| C39: create a reminder via its own form | Task 19 | done |
| C40: a reminder with no color picked defaults to green | Task 19 | done |
| C41: empty/whitespace reminder text creates nothing | Task 19 | done |
| C42: at most one reminder per date, enforced on create | Task 9, Task 19 | done |
| C43: every calendar view shows a marker for a date with a reminder | Task 20 | done |
| C44: tapping a marker opens text+edit+delete, distinct from a day tap | Task 20 | done |
| C45: a reminder's text/color/date are each editable | Task 20 | done |
| C46: moving a reminder onto an occupied date fails | Task 9, Task 20 | done |
| C47: a reminder is deletable, immediately and permanently | Task 20 | done |
| C48: a reminder never affects any day's heatmap | Task 4, Task 20 | done |
| C49: a reminder's text renders as plain text | Task 20 | done |
| C50: a reminder never appears in the Scheduled or general list | Task 9, Task 20 | done |

> Update status as tasks progress, using the same lifecycle (`pending | in-progress | done | verified`). A criterion is `verified` only when exercised against the running application, not just by green unit tests.
