# Tests: TODO app

Generated from `specs/todo-app/spec.md` (26 acceptance criteria) per Task 2 in `specs/todo-app/tasks.md`. Runner: Node's built-in `node --test` (no test framework dependency — matches the spirit of ADR 0004). One extra dev-only dependency, `jsdom`, gives these tests a real DOM without a browser; it never ships with the app itself.

Run with: `npm install && npm run test:todo-app`

At this stage (before Task 3+ implementation exists) every test in this directory is expected to fail with a "module/file not found" error — that **is** red, correctly, per the test-generator skill.

## Contract these tests assume `src/todo-app/app.js` will expose

Implementation (Tasks 3–12) must satisfy this interface for these tests to be meaningful — it is the executable contract derived from `plan.md`'s data-layer design:

- **No top-level `window`/`document` references.** `app.js` must be importable in plain Node (no DOM) without throwing, so the pure data-layer functions are unit-testable without jsdom. All DOM work happens inside functions called after the module loads (e.g. an `initApp(document, storage)` entry point), not at module-evaluation time.
- **Storage key:** a single fixed localStorage key, `"gaide-todo-tasks"`, holding a JSON array of task objects.
- **Task shape:** `{ id, text, description, urgency, done, createdAt }` — `urgency` is one of `"red" | "yellow" | "green"`.
- **Exported pure functions** (named exports from `app.js`):
  - `createTask({ text, description, urgency })` → a task object; `urgency` defaults to `"green"` (chill) when omitted/falsy; `description` defaults to `""`; throws/returns `null` for empty-or-whitespace `text`.
  - `sortTasks(tasks)` → new array, urgency rank (red → yellow → green) then stable creation order within a tie. Must use native `Array.prototype.sort` (per `plan.md`).
  - `toggleDone(task)` → new task with `done` flipped.
  - `setUrgency(task, urgency)` → new task with `urgency` changed.
  - `deleteTask(tasks, id)` → new array without the matching task.
  - `loadTasks(storage)` / `saveTasks(storage, tasks)` — `storage` is any object with `getItem`/`setItem` (so tests can inject an in-memory fake or jsdom's `localStorage`). `saveTasks` must not throw on a failing `storage.setItem`; instead it returns `{ ok: false }` (or equivalent) so the caller can show a visible error, per Constitution Principle 8.
- **DOM conventions** (for the integration tests that load `index.html` + `app.js` together via jsdom):
  - Each task renders as an element with `[data-testid="task"]`, containing a `input[type=checkbox]` (done toggle), an element with class `.urgency-icon` (text/attribute distinguishes red/yellow/green — never color alone), and, if it has a description, an element `[data-testid="description"]` that starts `hidden` and toggles on click of the task row.
  - Swipe-to-delete: a horizontal drag (simulated via `touchstart`/`touchmove`/`touchend`) past a threshold reveals `[data-testid="delete-control"]` inside the task; a plain `click` on the row must never remove the task on its own.
  - All user-supplied text (`text`, `description`) is set via `textContent`, never `innerHTML` — this is the mechanism the security tests check.

## Files

| File | Covers |
| --- | --- |
| `data-layer.test.js` | C1, C3, C13, C14, C15, C18, C19, C21 (pure logic, no DOM) |
| `rendering.test.js` | C2, C16, C17, C18, C22, C25 (DOM structure/visuals) |
| `interactions.test.js` | C4, C5, C10, C11, C12, C15, C23, C24 (event wiring) |
| `persistence.test.js` | C6, C11, C20, C26 (reload round-trip + storage-failure UX) |
| `security.test.js` | C9, C26 (XSS: rendered as text, never executed) |

## Known gap — not covered by these automated tests

Six criteria are device/browser-chrome facts that jsdom cannot represent and must stay manual, per `plan.md`'s Testing strategy and `tasks.md` Task 14:

- **C7** (installs to iPhone Home Screen, opens full-screen) and **C8** (works with no internet connection) — need a real Safari install and Airplane Mode, not simulable in jsdom.
- The safe-area/notch handling, the 44×44pt touch targets, and the swipe-vs-Safari-edge-navigation risk from `plan.md`'s Implementation risks — visual/physical device facts.

These remain in the Sprint Contract (`plan.md`) and Task 14's manual pass, not here.

---

## `specs/task-calendar/` addendum — dates, recurrence, heatmap, archive, reminders

Generated from `specs/task-calendar/spec.md` (50 acceptance criteria, C1–C50 as numbered in `specs/task-calendar/tasks.md`'s traceability table) per Task 2 in that file. Same runner, same `jsdom`-only dependency, same red-until-Tasks-3+ expectation. `data.js`/`calendar.js`/`render.js` don't exist yet (they're carved out of `app.js` in Task 10) — every test below fails with a module-not-found error until then, which is correct red.

### Contract these tests assume `src/todo-app/data.js` will expose

- **No top-level `window`/`document` reference**, same rule as `app.js` — pure functions must be importable and unit-testable in plain Node.
- **Storage keys:** `TASK_STORAGE_KEY = 'gaide-todo-tasks'` (existing, extended), `SERIES_STORAGE_KEY = 'gaide-todo-series'`, `OCCURRENCE_STORAGE_KEY = 'gaide-todo-occurrences'`, `ARCHIVE_STORAGE_KEY = 'gaide-todo-archive'`, `REMINDER_STORAGE_KEY = 'gaide-todo-reminders'`.
- **Dates are canonical `'YYYY-MM-DD'` strings** everywhere stored or compared (per `plan.md`'s architectural decision) — never raw `Date` arithmetic on a stored value.
- **Task shape extended:** `{ id, text, description, urgency, done, createdAt, date }` — `date` is `null`/absent for a general task, an ISO date string for a single-dated task. `createTask` gains a `date` option; `setTaskDate(task, date)` and `clearTaskDate(task)` change/remove it after creation.
- **Series shape** (`gaide-todo-series`): `{ id, text, description, urgency, weekdays, startDate, endDate, createdAt }` — `weekdays` is an array of ints, `0`–`6`, `Date#getDay()` convention (`0` = Sunday).
- **Occurrence shape** (`gaide-todo-occurrences`): `{ id, seriesId, date, done }` — no text/urgency of its own; looked up via `seriesId`.
- **Archived-record shape** (`gaide-todo-archive`, per ADR 0005): `{ id, date, text, done, archivedAt }` — no description, urgency, original id, or series linkage.
- **Reminder shape** (`gaide-todo-reminders`): `{ id, date, text, color, createdAt }` — `color` is `'green' | 'yellow'`.
- **Week view starts Monday** (ISO 8601 convention) — the spec leaves the exact day to implementation; this is the concrete choice `weekDates`/the calendar UI commit to.
- **Exported pure functions** (named exports from `data.js`):
  - `toISODate(date)`, `addDays(isoDate, n)`, `weekdayOf(isoDate)` — date-math, no timezone-sensitive `Date` arithmetic on stored values
  - `monthDates(year, month)` (month `1`–`12`) / `weekDates(isoDate)` (Monday-start week containing it) / `yearDates(year)` — each returns an array of ISO date strings for that grid
  - `band(done, total)` → `0`–`5` per the spec's fixed ratio table; `total === 0` → `0`
  - `dayRatio(date, { tasks, occurrences, archive })` → `{ done, total }`, merging still-existing single-dated tasks and occurrences for that date with archived records for that date
  - `generateOccurrences({ weekdays, startDate, endDate })` → array of ISO dates, or `{ error: 'invalid-range' }` (end before start), or `{ error: 'too-many-occurrences' }` (over the 730 cap, ADR 0005); a range with no matching weekday returns `[]`, not an error
  - `createSeries({ text, description, urgency, weekdays, startDate, endDate })` → `{ series, occurrences }` or `{ error }` (same error shapes as `generateOccurrences`)
  - `toggleOccurrenceDone(occurrence)` → new occurrence, `done` flipped, independent of siblings
  - `updateSeriesRule(series, occurrences, newRule, today)` → `{ series, occurrences }`; occurrences dated before `today` are returned unchanged; occurrences dated `today` or later are reconciled against `newRule`
  - `isOverdue({ date, done }, today)` → `true` iff `date < today && !done`
  - `resolveDelete({ date, text, done }, today)` → `{ archive: { date, text, done } }` when done-or-overdue, `{ erase: true }` otherwise (no archived record)
  - `createReminder({ text, color, date }, existingReminders)` → a reminder (`color` defaults to `'green'`) or `{ error: 'empty-text' }` / `{ error: 'date-occupied' }`
  - `updateReminder(reminder, changes, existingReminders)` → updated reminder or `{ error: 'date-occupied' }` (changing `date` onto one already occupied by a *different* reminder)
  - `deleteReminder(reminders, id)` → new array without it
  - `loadSeries`/`saveSeries`, `loadOccurrences`/`saveOccurrences`, `loadArchive`/`saveArchive`/`appendArchiveRecord`, `loadReminders`/`saveReminders` — same `storage.getItem`/`setItem` contract as the base app's `loadTasks`/`saveTasks`, same `{ ok, error? }` non-throwing result on a failing write (Principle 8)

### DOM conventions (`render.js`/`calendar.js`/`app.js`, for the integration tests)

- **Scheduled list:** `[data-testid="scheduled-list"]`; each row `[data-testid="scheduled-item"]` with `data-date` and `data-kind="single"|"occurrence"`, reusing the base app's done-checkbox and swipe-to-delete-control pattern; a single-dated row also carries `[data-testid="clear-date"]` (clears its date, converting it back to a general task) and `[data-testid="edit-date"]` (a date input; changing it moves the task to the new date, per C25); an occurrence row carries `[data-testid="edit-series"]` (reveals an inline rule editor: `[data-testid="edit-series-weekday"]` checkboxes, `[data-testid="edit-series-start-date"]`/`-end-date`, `[data-testid="edit-series-save"]`, `[data-testid="edit-series-error"]`) for editing the whole series' recurrence rule (C27/C28) — an invalid edited range (end before start, or over the 730 cap) surfaces in `edit-series-error` and saves nothing, same validation `createSeries` already enforces on create
- **New-task form additions:** `[data-testid="new-task-date"]` (single date); `[data-testid="new-task-weekday"]` (a checkbox per weekday, `value="0"`–`"6"`); `[data-testid="new-task-start-date"]` / `[data-testid="new-task-end-date"]`
- **Delete-scope choice:** after swipe-and-tap-delete on a `[data-kind="occurrence"]` row, `[data-testid="delete-scope-occurrence"]` and `[data-testid="delete-scope-series"]` controls appear instead of an immediate delete
- **Calendar:** `[data-testid="calendar"]`; `[data-testid="calendar-view-month"]` / `-week` / `-year` (switcher); `[data-testid="calendar-nav-prev"]` / `-next` / `-today`; `[data-testid="calendar-day"]` cells with `data-date`, `data-band` (`"0"`–`"5"`), and `data-today="true"` on today's cell; a day with a reminder nests `[data-testid="reminder-marker"]` (`data-color`) inside its cell
- **Day-detail panel:** `[data-testid="day-detail"]` (hidden until a day is tapped); `[data-testid="day-detail-item"]` per listed item (text + done state, no interactive controls); `[data-testid="day-detail-empty"]` when nothing is scheduled
- **New-reminder form:** `[data-testid="new-reminder-form"]`, `[data-testid="new-reminder-text"]`, `[data-testid="new-reminder-color"]`, `[data-testid="new-reminder-date"]`
- **Reminder popup** (opened by tapping `[data-testid="reminder-marker"]`, not the rest of the day cell): `[data-testid="reminder-popup"]`, `[data-testid="reminder-popup-text"]`, `[data-testid="reminder-edit-text"]` / `-color` / `-date`, `[data-testid="reminder-save"]`, `[data-testid="reminder-delete"]`

### Files

| File | Covers |
| --- | --- |
| `recurrence.test.js` | C1–C7, C25, C27, C28 (occurrence generation, validation, rule editing — pure logic) |
| `archive.test.js` | C14–C17, C20, C23, C24 (overdue definition, archive-vs-erase branching, ratio merge — pure logic) |
| `scheduled-list.test.js` | C8–C13, C22, C26 (list rendering/sort, delete gesture + scope choice, done-toggle independence, clear-date) |
| `calendar.test.js` | C18 (tap-opens wiring only), C29–C37 (grid construction, views, navigation, band rendering) |
| `day-detail.test.js` | C18, C19, C21 (tap-to-open, read-only, empty state) |
| `reminders.test.js` | C39–C48, C50 (create/edit/delete, one-per-date, marker, no heatmap effect) |
| `security.test.js` (extended) | C9, C26 (base app), C49 (reminder text renders as plain text) |

### Known gap — not covered by these automated tests

Touch-target sizing and tap precision for reminder markers and day cells in year view (smallest grid) are physical-device facts jsdom cannot represent — they stay in `plan.md`'s Sprint contract and Task 22's manual pass, per the same reasoning as C7/C8 above.
