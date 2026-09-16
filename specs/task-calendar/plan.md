# Plan: Task calendar, dates, recurrence, completion heatmap, and reminders

> **Prerequisite:** `spec.md` approved.

## Architectural decisions

- **Recurrence is materialized, not virtual — a new `gaide-todo-series` store holds the rule, a new `gaide-todo-occurrences` store holds one lightweight record per generated day.** When a recurring task is created, every occurrence date is computed immediately and written as `{id, seriesId, date, done}`; text/description/urgency live once on the series record and are looked up by `seriesId` for display, never copied per occurrence. The alternative (compute occurrences on the fly from the rule at render time, with a sparse exceptions list for per-occurrence done/delete) is more storage-efficient for very large ranges but is a meaningfully more complex structural pattern — it needs its own materialization-window logic to render a calendar view, its own exception-merging logic, and makes "delete this occurrence only" a special case instead of a plain record delete. Given ADR 0004's bias toward the smallest architecture that satisfies the spec, and that occurrence records are tiny (4 fields), materializing wins. — **ADR required** (structural pattern with a real trade-off, Constitution Principle 5). Bundled into one new ADR (0005) alongside the two decisions immediately below, since all three answer the same question — "how do we represent time-based task data without a framework or a database" — the way ADR 0004 answered "how do we run this app at all."
- **A hard cap of 730 generated occurrences per recurrence rule (roughly 2 years of a daily rule, or ~4 years of a twice-weekly one), enforced as a validation error at creation/edit time.** The spec explicitly left this number to `plan.md` (see its Security considerations). 730 comfortably covers realistic personal use (the spec's own example — two weekdays across 3 months — is ~26 occurrences) while keeping worst-case storage and render cost bounded on a phone. Raising it later is a one-line change, not a redesign. — bundled into ADR 0005, no separate ADR.
- **An archived record drops to `{id, date, text, done, archivedAt}` — description, urgency, id-of-the-original-task, and series linkage are all discarded on archive.** This is the concrete shape behind the spec's "everything except text/date/done-state is dropped" rule. — bundled into ADR 0005, no separate ADR.
- **Reminders get their own store, `gaide-todo-reminders`: `{id, date, text, color, createdAt}`, with the one-per-date rule enforced in the data layer (reject a write whose date collides with an existing reminder), not at the storage layer.** Minor decision, no ADR — this is a straightforward sibling to the existing task store, not a new structural pattern.
- **Dates are canonical `YYYY-MM-DD` strings everywhere data is stored or compared, never JS `Date` arithmetic across stored values.** `Date` is used only to render a given date and to compute "today" once per render pass. This sidesteps the classic timezone/DST off-by-one bugs that come from doing month/week arithmetic on `Date` objects directly. Minor decision, no ADR, but explicitly called out because it's the single most common source of calendar bugs and needs a unit-tested date-math module, not ad hoc arithmetic scattered through rendering code.
- **`app.js` is split into ES modules — `data.js` (all five stores' CRUD + date-math + occurrence-generation + band computation), `calendar.js` (month/week/year grid builders), `render.js` (list/calendar/day-detail/reminder DOM building), `app.js` (entry point, event wiring).** The app already loads via `<script type="module">`, so the browser resolves `import`/`export` natively — no bundler, no build step, ADR 0004 stays intact. This directly answers ADR 0004's own "Future review" trigger — *"`app.js` becomes hard to maintain by hand"* — which this feature would otherwise hit hard: the file would roughly quadruple in scope (dates, recurrence, archive, two calendar views' worth of rendering, two new interactive panels). Splitting by concern, not by framework, keeps ADR 0004 valid without revisiting it. Minor decision, no ADR (it doesn't change the stack, only internal file layout) — but flagged explicitly in `docs/adr/0004-vanilla-js-static-pwa.md`'s own terms, so a future reader sees this was a conscious response to that ADR's stated revisit condition, not an oversight.
- **Month/week/year are three render modes of one page and one in-memory state, not routes.** This also brushes against ADR 0004's *"the spec grows to need multiple views"* trigger. Assessed and **not** treated as triggering a framework reconsideration: there is no URL/history change, no independent page lifecycle, and no shared state to coordinate across routes — just three different grid-shape functions over the same underlying data, switched by re-rendering one container. No ADR.
- **The day-detail panel and the reminder-content popup are plain hidden/shown DOM elements (same `hidden` attribute + `data-testid` pattern the base app already uses for the storage-error banner and collapsible descriptions), not a new UI primitive.** Minor decision, no ADR.

## Affected components

- `src/todo-app/index.html` — add the Scheduled list section, the calendar container (view switcher, nav controls, grid mount point), the new-task form's date/recurrence sub-fields, the new-reminder form, and mount points for the day-detail panel and reminder popup
- `src/todo-app/style.css` — calendar grid layout (month/week/year), the 5-band heatmap palette (white → blue), today/selected-day states, reminder marker styling (green/yellow), day-detail and reminder-popup panel styles; must hold up at year-view's much smaller per-day squares (44×44pt touch-target risk flagged below)
- `src/todo-app/data.js` *(new)* — extends `createTask`/`loadTasks`/`saveTasks` for the `date` field on `gaide-todo-tasks`; adds CRUD + `persist*` (Principle 8 error-banner) helpers for `gaide-todo-series`, `gaide-todo-occurrences`, `gaide-todo-archive`, `gaide-todo-reminders`; adds pure functions: date-math (`toISODate`, `addDays`, `weekdayOf`, month/week/year grid builders), `generateOccurrences(rule)` (capped at 730, per ADR 0005), `dayRatio(date)` (merges live + archived counts), `band(ratio)` (→ 0–5)
- `src/todo-app/calendar.js` *(new)* — month/week/year grid construction (array of `{date, isToday, band}` per cell) and prev/next/today navigation, built on `data.js`'s date-math
- `src/todo-app/render.js` *(new)* — Scheduled-list rendering (reusing/generalizing the existing swipe-to-delete and done-checkbox row builders from `app.js`), calendar grid DOM rendering + reminder markers, day-detail panel rendering, reminder-popup rendering
- `src/todo-app/app.js` — becomes the entry point: imports the above, wires the new-task form's date/recurrence sub-fields, the new-reminder form, the this-occurrence/whole-series delete choice, view-switcher and nav-button listeners, day-cell and reminder-marker click handlers
- `src/todo-app/service-worker.js` — bump `CACHE_NAME` (currently `todo-v4` → `todo-v5`) and add `data.js`, `calendar.js`, `render.js` to `SHELL_FILES`
- `tests/todo-app/calendar.test.js` *(new)* — month/week/year grid construction, navigation, band computation, today-highlighting
- `tests/todo-app/recurrence.test.js` *(new)* — occurrence generation (including the 730 cap, the zero-match edge case, end-before-start validation), per-occurrence done/not-done independence, rule editing (future-only)
- `tests/todo-app/archive.test.js` *(new)* — done/overdue archiving vs future erase-with-no-trace, day-ratio merging of live + archived, whole-series delete archiving each past occurrence individually
- `tests/todo-app/day-detail.test.js` *(new)* — tap-to-open, live + archived items listed, read-only (no controls), empty-day state
- `tests/todo-app/reminders.test.js` *(new)* — create/edit/delete, default color, one-per-date validation (create and move), plain-text rendering, no effect on heatmap or lists
- `tests/todo-app/scheduled-list.test.js` *(new)* — date-ascending sort, dated items excluded from the general list and vice versa
- `docs/adr/0005-recurrence-occurrence-archive-data-model.md` *(new)* — the materialized-occurrences / cap / archive-shape decision above
- No changes needed to `.github/workflows/test.yml` or `deploy-pages.yml` — both already glob `src/todo-app/**` and `tests/todo-app/**`, so new files under those paths run and deploy automatically

## Implementation sequence

1. **ADR 0005** — record the recurrence/occurrence/archive data-model decision via the `adr-writer` skill
2. **Red tests** — generate tests via the `test-generator` skill from `spec.md`'s acceptance criteria
3. **Date-math + band foundation** (`data.js`) — `toISODate`/`addDays`/`weekdayOf`, month/week/year cell-array builders, `band(ratio)`; pure and unit-testable before anything touches storage
4. **Storage layer** (`data.js`) — extend `gaide-todo-tasks` with `date`; add `gaide-todo-series`, `gaide-todo-occurrences`, `gaide-todo-archive`, `gaide-todo-reminders` CRUD + `persist*` error-banner wiring
5. **Occurrence generation** (`data.js`) — `generateOccurrences(rule)` with the 730 cap and end-before-start / zero-match handling; `dayRatio(date)` merging live occurrences/single-dated tasks with archived records
6. **Module split** — carve `app.js`'s existing rendering/interaction code into `render.js`/`calendar.js`, `app.js` becomes the entry point (mechanical refactor, base-app tests must stay green throughout)
7. **Calendar rendering** (`calendar.js` + `render.js`) — month view (default) + grid painting with band colors and today-highlight
8. **View switching + navigation** — week/year views, prev/next/today controls
9. **New-task form extension** — date field, recurrence sub-fields (weekday picker + start/end date), validation; Scheduled list rendering (date-ascending), reusing the existing swipe-to-delete/done-checkbox row builders
10. **Delete → archive/erase branching** — done-or-overdue archives, future-and-not-done erases with no trace; wire into the existing swipe-to-delete control
11. **This-occurrence vs whole-series delete choice** — UI + logic for recurring-task deletion
12. **Recurrence rule editing** — weekday/date-range edit for a series, regenerating only occurrences dated today or later
13. **Day-detail panel** — tap a day (not a reminder marker) → read-only list of that date's live + archived items; empty-day state
14. **Reminders** — new-reminder form, calendar markers, reminder-content popup (view/edit/delete), one-per-date validation on create and on date-edit
15. **PWA shell** — bump `CACHE_NAME`, update `SHELL_FILES` for the new JS modules
16. **Verification** — all tests green; manual pass on a physical iPhone (calendar navigation, day-detail and reminder-popup tap targets — especially in year view — and the existing base-app regression checks); `code-reviewer` skill

## Testing strategy

- **Unit (`data.js`):** date-math across month/year boundaries and leap years; `generateOccurrences` (normal range, zero-weekday-match, end-before-start, at and one-over the 730 cap); `band()` boundary values (0%, 1%, 25%, 26%, 50%, 51%, 75%, 76%, 99%, 100%); `dayRatio()` merging live-only, archived-only, and mixed
- **DOM/integration:** calendar renders correct cells and bands for month/week/year; navigation moves the shown period without changing view mode; new-task form creates general/single-dated/recurring tasks correctly (`scheduled-list.test.js`, `recurrence.test.js`); marking one occurrence done doesn't touch siblings; delete branches correctly by done/overdue/future (`archive.test.js`); this-occurrence vs whole-series delete; editing a recurrence rule only touches future occurrences; day-detail panel shows the right mix of live + archived items and offers no controls (`day-detail.test.js`); reminder CRUD, default color, one-per-date on create and move, marker rendering, no heatmap/list effect (`reminders.test.js`)
- **Persistence:** reload and confirm all five stores (tasks, series, occurrences, archive, reminders) round-trip exactly, including archived records surviving a reload with their originating task long gone
- **Security:** `<script>` tags in dated-task text, archived-record text, and reminder text all render as literal text, matching the base app's existing `security.test.js` pattern
- **Manual (device):** calendar readable and navigable on a physical iPhone in all three views; day-detail and reminder-marker tap targets hittable in year view specifically (smallest cells); swipe-to-delete still works for dated items in the Scheduled list; this-occurrence/whole-series choice usable with a thumb; reminder popup readable and editable; full regression of the base app's existing on-device checks (per `specs/todo-app/retrospective.md`, this is the only method that ever caught the base app's two real device bugs — jsdom cannot)

## Implementation risks

- **Risk:** date arithmetic bugs (timezone/DST, month-length, leap-year edge cases) are the single most likely source of subtle calendar defects → **Mitigation:** all storage/comparison uses canonical `YYYY-MM-DD` strings (Architectural decisions above), `Date` only for single-point rendering; dedicated unit tests for month/year boundaries and Feb 29
- **Risk:** the 730-occurrence cap is a judgment call, not something the user explicitly signed off on a specific number → **Mitigation:** documented here in `plan.md` (which the user is approving) and in ADR 0005; trivially raisable later if it turns out too low for real use
- **Risk:** `app.js`'s split into 4 modules could regress the base app's existing 34 passing tests if the refactor changes behavior incidentally → **Mitigation:** step 6 in the sequence above is a standalone, test-covered refactor commit before any new feature code lands on top of it — base-app tests must stay green at that checkpoint before proceeding
- **Risk:** year view's ~365 day-cells make reminder markers and day taps small targets, risking the same class of on-device-only bug the base app hit twice (`specs/todo-app/retrospective.md` #4 — CSS/touch issues jsdom cannot catch) → **Mitigation:** explicit manual on-device check called out in the Sprint contract below, not left implicit
- **Risk:** a change to any of `index.html`/`style.css`/`app.js`/`data.js`/`calendar.js`/`render.js` ships without a `CACHE_NAME` bump, silently stranding installed phones on stale code (the exact mechanism `specs/todo-app/plan.md` already flagged) → **Mitigation:** step 15 is a dedicated task; `code-reviewer` checks for it explicitly, same as the base app's process
- **Risk:** the archive/erase branching logic (done-or-overdue vs future-not-done) is the most behaviorally intricate part of this feature and easy to get subtly wrong (e.g., archiving something that should have erased, or vice versa) → **Mitigation:** `archive.test.js` is written first from the spec's use cases 8–12 before the branching code, not after

## Sprint contract

> Agreed before implementation; the reviewer checks each item one by one.

- [ ] Create a task with a specific date, no recurrence → appears in the Scheduled list at that date, on the calendar on that date, absent from the general list — verify by: manual creation + inspection
- [ ] Create a recurring task (2 weekdays, a 3-month range) → occurrences appear in the Scheduled list and on the calendar on every matching date — verify by: manual creation, spot-check dates
- [ ] Mark one occurrence done → only that occurrence and its day's color change, siblings untouched — verify by: manual test
- [ ] Delete a done dated item → disappears from the Scheduled list, its day's color is unchanged, and tapping that day still shows it (archived, marked done) — verify by: manual test
- [ ] Delete an overdue not-done dated item → same as above but shown as missed when the day is tapped — verify by: manual test
- [ ] Delete a future, not-yet-due item → disappears with no trace; tapping that day afterward never shows it — verify by: manual test
- [ ] Delete one occurrence of a series choosing "this occurrence only" → only that date is affected, rest of the series intact — verify by: manual test
- [ ] Delete a whole series with a mix of past-done, past-missed, and future occurrences → every past occurrence is individually archived (visible via day-detail), future ones vanish with no trace — verify by: manual test
- [ ] Switch the calendar between month/week/year and navigate prev/next/today in each — verify by: manual test
- [ ] A day with 3 of 4 items done shows the correct band (51–75% range) — verify by: manual test against the band table in `spec.md`
- [ ] Tap a day with both live and archived items → read-only list shows all of them correctly, no edit/complete/delete controls present — verify by: manual test
- [ ] Create a reminder, tap its marker → text shown with edit/delete controls; edit its text/color/date; delete it → marker disappears, no undo — verify by: manual test
- [ ] Try to create a second reminder on an occupied date, and try to move a reminder onto one → both rejected, existing reminders unchanged — verify by: manual test
- [ ] A reminder never changes any day's heatmap color — verify by: manual test (add a reminder to a day with a partially-completed heatmap, confirm color unchanged)
- [ ] Reload the app → tasks, series, occurrences (with done-state), archived records, and reminders all match exactly what was left — verify by: reload and compare
- [ ] All base-app Sprint-contract items from `specs/todo-app/plan.md` still pass unmodified — verify by: re-running that checklist
- [ ] Install/reopen on a physical iPhone after the change → still installs, still works offline, calendar and reminder tap targets are usable in year view — verify by: manual test on-device

## Definition of Done

- [ ] All of `spec.md`'s acceptance criteria have green tests
- [ ] ADR 0005 recorded and cross-referenced from `data.js`
- [ ] `code-reviewer` skill ran without unresolved blockers
- [ ] Human review approved
- [ ] `CACHE_NAME` bumped and `SHELL_FILES` updated; verified an already-installed phone picks up the change
- [ ] Manually verified on a physical iPhone (all three calendar views, day-detail, reminders, and the full base-app regression pass)
- [ ] No secrets, no new external dependencies (still zero runtime dependencies, `jsdom` remains dev-only)
- [ ] Constitution respected, including Principle 9 — no task or test quietly weakened to appear done
