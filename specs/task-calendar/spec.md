# Spec: Task calendar, dates, recurrence, completion heatmap, and reminders

> **Status:** approved
> **Author:** enzofarina
> **Date:** 2026-09-15

## Context

The existing Tasks app (`specs/todo-app/spec.md`) lets the user create tasks with text, an optional description, and an urgency (red/yellow/green), shown as one flat list sorted by urgency. Every task today is "general" — it has no date.

The user wants to plan tasks ("goals") against specific days: give a task a date, optionally make it repeat on chosen weekdays within a date range, browse those dated tasks on a calendar (month by default, switchable to week or year), and see — at a glance, GitHub-contributions-style — how much of a given day's goals were completed, via a white-to-blue color on that day's square. They also want a lighter-weight way to leave a free-text note on a specific calendar day — a "reminder" — visually distinct from tasks (a small green or yellow post-it-style marker) and with no done/not-done state or bearing on the heatmap at all. This is for the same single user, same single device, same on-device storage model as the base app; nothing here introduces accounts, a server, or multi-device sync.

## Expected behavior

Tasks gain an optional **date**. A task is exactly one of three kinds:

- **General** (unchanged from today): no date, shown only in the existing urgency-sorted list.
- **Single-dated**: one specific date, no recurrence.
- **Recurring**: a recurrence rule instead of one date — one or more selected weekdays, plus a start date and an end date. The rule expands into one **occurrence** per date in `[start date, end date]` that falls on a selected weekday. Each occurrence has its own independent done/not-done state.

A single-dated task and each occurrence of a recurring task are collectively called **dated items**. Dated items:

- Appear in a new **Scheduled list**: all dated items, sorted by date ascending (earliest first, ties broken by creation order), shown alongside — not replacing — the existing general list. Like the general list today, nothing here disappears automatically: a dated item stays in the Scheduled list, done or not, until explicitly deleted.
- Appear on the **calendar**, on their date's square.
- Do **not** appear in the general (urgency-sorted) list — that list continues to show only tasks with no date, exactly as it behaves today.

A task's date (for a single-dated task) or recurrence rule (for a recurring task) can be changed or removed at any time after creation, the same way urgency can be changed today. Text and description remain immutable after creation (unchanged from the base spec). Removing a task's date converts it back to a general task.

The **calendar** shows one of three views — month (default, current month), week (current week), or year (current year) — switchable by the user, each navigable to the previous/next period and back to today. Every calendar view renders one square per day. Each day's square is colored on a 5-level white-to-blue scale by that day's completion ratio: `(done dated items on that day) / (total dated items on that day)`. A day with no dated items at all is shown at the lightest level (same as 0%).

| Band | Ratio | Shade |
| --- | --- | --- |
| 0 | no dated items, or 0% done | white |
| 1 | 1–25% done | lightest blue |
| 2 | 26–50% done | light-medium blue |
| 3 | 51–75% done | medium-dark blue |
| 4 | 76–99% done | dark blue |
| 5 | 100% done | darkest blue |

Every dated item in the Scheduled list — a single-dated task or a recurring occurrence — is deleted the same way general tasks are today: swipe to reveal a delete control, then tap it (no single tap alone deletes). Deletion is meant to be used freely to reclaim on-device space, but it behaves differently depending on the item's state:

- **Not done and not overdue** (dated today or later): deleting it erases it completely, with no trace — the same as removing something that was never scheduled.
- **Done, or overdue and not done**: deleting it removes it from the active Scheduled list and calendar, but **archives** a read-only historical record of it instead of erasing it outright — its text, its date, and whether it was done or missed. Everything else about it (description, urgency, and other metadata) is dropped, reclaiming most of the space, while still letting the user later see what that day's tasks were and whether they got done.

An item is **overdue** once its date is strictly before today and it is still not done. A day's completion ratio for the heatmap is always `(done items) / (total items)` scheduled for that date, counting archived records and still-existing dated items alike — archiving an item never changes it.

**Tapping any day on the calendar — past, present, or future — opens a read-only view of everything scheduled for that day:** every still-existing dated item (from the Scheduled list) plus every archived record for that date, each showing its text and done/not-done state. A day with nothing scheduled, live or archived, shows an empty state. This view is for looking, not acting: marking done, editing, and deleting still happen only from the Scheduled list; an archived record can never be un-archived, edited, or have its done state changed — archiving, like deletion elsewhere in this app, is permanent.

Deleting an occurrence of a recurring task, after the swipe, offers a choice: **this occurrence only** (follows the done/overdue/future rule above for that one occurrence; the rest of the series is unaffected) or **the whole series** (removes every occurrence, past and future — each past, done/overdue occurrence is archived individually exactly as a standalone delete would archive it; future, not-yet-due occurrences are erased with no trace).

Editing a recurring task's rule (weekdays and/or date range) only affects occurrences that have not yet elapsed (today or later): occurrences already in the past keep their existing date and done/not-done state regardless of a later rule change, so historical heatmap coloring for past days is never silently rewritten by an edit.

**Reminders** are a separate, simpler kind of calendar annotation — not a task, not a dated item, and never counted toward any day's heatmap ratio. A reminder has three fields: free-text content, a color (green or yellow, green by default), and a date. At most one reminder exists per date; creating one for a date that already has a reminder fails validation, directing the user to edit or delete the existing one instead. A reminder is created via its own form, separate from the task-creation form, where the user enters the text, optionally picks the color, and picks the date.

On the calendar, every view (month, week, year) shows a small colored marker on a date's square when that date has a reminder — alongside, not replacing, the day's heatmap color. Tapping the marker itself (distinct from tapping elsewhere on the day, which opens that day's dated-item detail view, described above) opens the reminder's full text, along with controls to edit or delete it. Editing a reminder can change its text, its color, or its date — moving it to a different date is subject to the same one-per-date rule as creation. Deleting a reminder removes it immediately and permanently, with no undo, consistent with deletion everywhere else in this app. Reminders never appear in the Scheduled list or the general urgency-sorted list, and they are never included in any heatmap calculation.

### Use cases

1. **Main case — add a single-dated task**
   - Given: the user is creating a new task
   - When: the user enters text and picks a specific date (no recurrence)
   - Then: the task is created as single-dated; it appears in the Scheduled list at its date's position, and on the calendar on that date; it does not appear in the general list

2. **Main case — add a recurring task**
   - Given: the user is creating a new task
   - When: the user selects one or more weekdays and a start date and end date, instead of a single date
   - Then: one occurrence is created for every date in range on a selected weekday; each occurrence appears in the Scheduled list and on the calendar on its own date, with its own independent done/not-done state

3. **Alternative case — leave a task general**
   - Given: the user is creating a new task
   - When: the user sets no date and no recurrence
   - Then: the task is created exactly as today — general, shown only in the urgency-sorted list, absent from the Scheduled list and the calendar

4. **Error case — end date before start date**
   - Given: the user is setting a recurrence rule
   - When: the chosen end date is earlier than the chosen start date
   - Then: the task is not created; the user sees the range is invalid

5. **Edge case — recurrence range with no matching weekday**
   - Given: the user sets a valid start/end date range and selects weekdays
   - When: no date in that range falls on any selected weekday
   - Then: the task is created with zero occurrences (nothing appears on the Scheduled list or calendar for it) rather than erroring

6. **Main case — complete one occurrence**
   - Given: a recurring task has multiple occurrences, all not done
   - When: the user marks one specific occurrence done
   - Then: only that occurrence becomes done; the other occurrences of the same series remain not done; the completion ratio (and color) of only that occurrence's day changes

7. **Alternative case — uncomplete an occurrence**
   - Given: an occurrence is marked done
   - When: the user unmarks it
   - Then: it returns to not-done, and its day's completion ratio/color updates accordingly

8. **Alternative case — delete a done dated item (archives it)**
   - Given: a dated item (a single-dated task, or one occurrence of a recurring series) is marked done
   - When: the user swipes it to reveal the delete control, then taps it (choosing "this occurrence only" if it belongs to a series)
   - Then: it disappears from the Scheduled list, but an archived record (text, date, done) is kept; its day's completion ratio and color remain exactly as before; tapping that day on the calendar shows it, marked done

9. **Alternative case — delete an overdue, not-done dated item (archives it)**
   - Given: a dated item's date has already passed and it was never marked done
   - When: the user swipes it to reveal the delete control, then taps it (choosing "this occurrence only" if it belongs to a series)
   - Then: it disappears from the Scheduled list, but an archived record is kept, marked not done; its day's completion ratio and color remain exactly as before — still reflecting it as missed, not silently forgiven; tapping that day on the calendar shows it, marked not done

10. **Alternative case — delete a future, not-yet-due dated item (no trace)**
    - Given: a dated item's date is today or later, and it is not done
    - When: the user swipes it to reveal the delete control, then taps it
    - Then: it is erased completely — no archived record is created; its day's completion ratio is recalculated without it; tapping that day afterward will not show it at all

11. **Alternative case — delete a single occurrence ("this occurrence only")**
    - Given: a recurring task has multiple occurrences
    - When: the user deletes one occurrence and chooses "this occurrence only"
    - Then: only that occurrence is removed from the series; its outcome follows the done/overdue/future rule above (cases 8–10) — archived if it was done or overdue, erased with no trace otherwise; the rest of the series is untouched

12. **Alternative case — delete a whole recurring series**
    - Given: a recurring task has past occurrences (some done, some overdue and missed) and future occurrences
    - When: the user deletes the series and chooses "the whole series"
    - Then: every occurrence is removed from the Scheduled list; each past (done or overdue) occurrence becomes its own archived record, exactly as if deleted individually; future, not-yet-due occurrences are erased with no trace

13. **Error case — deletion requires the swipe gesture first**
    - Given: a dated item (single-dated task or occurrence) exists in the Scheduled list
    - When: the user taps it without swiping first
    - Then: it is not deleted (a single tap toggles/expands the item at most, matching the base app's task-row tap behavior; it never deletes)

14. **Main case — view a past day's detail**
    - Given: a past day has 2 archived records (1 done, 1 missed) and 1 still-existing dated item marked done
    - When: the user taps that day on the calendar
    - Then: a read-only view lists all 3 items, each showing its text and done/not-done state

15. **Edge case — view an empty day**
    - Given: a day has nothing scheduled, live or archived
    - When: the user taps it on the calendar
    - Then: the day's detail view opens showing an empty state (no items)

16. **Edge case — archived records are read-only**
    - Given: the day-detail view is open, showing an archived record
    - When: the user looks for a way to mark it undone, edit it, or restore it
    - Then: no such control exists — archived records offer no interaction, only text and done/not-done state

17. **Alternative case — view a future day**
    - Given: a future day has a live, not-yet-done dated item scheduled
    - When: the user taps that day on the calendar
    - Then: the detail view shows the item and its not-done state, but no control to complete, edit, or delete it there — those actions remain available only from the Scheduled list

18. **Alternative case — edit a recurrence rule going forward**
    - Given: a recurring task has 3 past occurrences (already elapsed, one marked done) and future occurrences remaining
    - When: the user changes the weekdays or shortens the date range
    - Then: only occurrences dated today or later are added/removed to match the new rule; the 3 past occurrences and their done/not-done state are unchanged, and their days' heatmap colors are unchanged

19. **Alternative case — change a single-dated task's date**
    - Given: a single-dated task exists on one date
    - When: the user changes it to a different date
    - Then: it disappears from the old date's square/ratio and appears on the new date's square/ratio; its position in the Scheduled list updates to match

20. **Alternative case — remove a task's date**
    - Given: a single-dated task exists
    - When: the user clears its date
    - Then: it becomes a general task — removed from the Scheduled list and the calendar, added to the general urgency-sorted list

21. **Main case — default calendar view**
    - Given: the user opens the calendar
    - When: no view has been chosen yet
    - Then: it shows the month containing today's date, with today's square visually distinguishable, each day square colored per the completion-ratio scale

22. **Alternative case — switch to week view**
    - Given: the calendar is open
    - When: the user switches to week view
    - Then: it shows the 7 days of the current week, each colored the same way

23. **Alternative case — switch to year view**
    - Given: the calendar is open
    - When: the user switches to year view
    - Then: it shows every day of the current year, each colored the same way

24. **Alternative case — navigate between periods**
    - Given: the calendar is showing a given month, week, or year
    - When: the user navigates to the previous or next period
    - Then: the calendar shows that adjacent period, still in the same view mode (month/week/year), correctly colored

25. **Edge case — day with no dated items**
    - Given: a day has no single-dated task and no recurring occurrence scheduled on it, live or archived
    - When: the user views that day's square on the calendar
    - Then: it is shown at the lightest (band 0 / white) shade, same as a day where 0% of items are done

26. **Edge case — day fully completed**
    - Given: a day has one or more dated items (live, archived, or both), and all are done
    - When: the user views that day's square
    - Then: it is shown at the darkest (band 5 / 100%) shade

27. **Edge case — general tasks never affect the heatmap**
    - Given: a general (dateless) task is marked done on a given day
    - When: the user views that day's square on the calendar
    - Then: the general task's completion has no effect on that day's ratio or color — only dated items on that specific date count

28. **Main case — create a reminder**
    - Given: the user opens the new-reminder form
    - When: the user enters text, optionally picks a color, and picks a date with no existing reminder
    - Then: the reminder is created; its colored marker appears on that date's square in every calendar view

29. **Alternative case — create a reminder with the default color**
    - Given: the user is creating a reminder
    - When: the user does not pick a color
    - Then: the reminder is created green

30. **Error case — a date can only have one reminder**
    - Given: a date already has a reminder
    - When: the user tries to create another reminder on that same date
    - Then: the new reminder is not created; the user is directed to edit or delete the existing one instead

31. **Error case — empty reminder text**
    - Given: the user is creating a reminder
    - When: the text field is empty or whitespace-only
    - Then: no reminder is created

32. **Main case — view a reminder's text**
    - Given: a date has a reminder
    - When: the user taps its marker on the calendar
    - Then: the reminder's full text opens, along with edit and delete controls

33. **Alternative case — edit a reminder's text**
    - Given: a reminder's content is open
    - When: the user changes its text and saves
    - Then: the reminder's text is updated; it still shows on the same date

34. **Alternative case — edit a reminder's color**
    - Given: a reminder's content is open
    - When: the user changes it from green to yellow (or vice versa)
    - Then: the marker's color updates on the calendar

35. **Alternative case — move a reminder to a different date**
    - Given: a reminder's content is open, and the target date has no reminder of its own
    - When: the user changes its date
    - Then: the marker disappears from the old date's square and appears on the new date's square

36. **Error case — moving a reminder onto an occupied date**
    - Given: a reminder's content is open
    - When: the user tries to change its date to one that already has a different reminder
    - Then: the move is rejected; the reminder keeps its original date

37. **Alternative case — delete a reminder**
    - Given: a reminder's content is open
    - When: the user deletes it
    - Then: it is permanently removed; its marker disappears from the calendar, with no undo

38. **Edge case — reminders never affect the heatmap**
    - Given: a date has a reminder (either color) and zero, one, or more dated items
    - When: the user views that date's square
    - Then: the heatmap color reflects only the dated items' completion ratio, exactly as if the reminder did not exist

39. **Edge case — a reminder marker coexists with the day-detail view**
    - Given: a date has both a reminder and one or more dated items (live or archived)
    - When: the user taps the date but not the marker itself
    - Then: the day-detail view opens showing the dated items, as already specified, without showing or affecting the reminder

## Acceptance criteria

- [ ] User can give a new task a single specific date at creation time, instead of leaving it general
- [ ] User can give a new task a recurrence rule at creation time (one or more weekdays + a start date + an end date), instead of a single date
- [ ] A task is exactly one kind at a time — general, single-dated, or recurring — never more than one
- [ ] A recurring task expands into one independent occurrence per date in its range that falls on a selected weekday
- [ ] Each occurrence of a recurring task has its own independent done/not-done state
- [ ] Creating a recurrence with an end date before the start date fails validation; no task is created
- [ ] Creating a recurrence whose range contains no date on a selected weekday succeeds with zero occurrences (not an error)
- [ ] A new "Scheduled" list shows every dated item (single-dated tasks + all occurrences of recurring tasks), sorted by date ascending, distinct from the general urgency-sorted list
- [ ] Dated items never appear in the general urgency-sorted list; general (dateless) tasks never appear in the Scheduled list or on the calendar
- [ ] A dated item remains visible in the Scheduled list (done or not) until explicitly deleted — nothing disappears automatically based on its date passing
- [ ] User can mark/unmark a single occurrence done without affecting other occurrences in the same series
- [ ] User can delete any dated item (single-dated task or occurrence) from the Scheduled list, removing it from that list immediately
- [ ] Deleting any dated item from the Scheduled list requires the same swipe-to-reveal delete control as the base app's general list — a single tap alone never deletes it
- [ ] An item is considered overdue once its date is strictly before today and it is not marked done
- [ ] Deleting a dated item that is done, or overdue, archives it: its text, date, and done/not-done state are kept in a read-only record, while its description and other metadata are dropped; the underlying task is removed from the Scheduled list and cannot be edited or completed anymore
- [ ] Deleting a dated item that is not done and not overdue (dated today or later) erases it completely — no archived record is created, and no trace of it remains
- [ ] Archiving an item never changes its day's completion ratio or color — an archived record counts toward that day's ratio exactly as the live item did
- [ ] Tapping any day on the calendar — past, present, or future — opens a read-only view listing every dated item scheduled for that day, both still-existing (live) items and archived records, each showing its text and done/not-done state
- [ ] A day with nothing scheduled, live or archived, shows an empty state when tapped
- [ ] An archived record cannot be edited, un-archived, or have its done/not-done state changed, from the day-detail view or anywhere else
- [ ] The day-detail view is read-only: marking an item done/not-done, editing its date or recurrence, and deleting it remain actions available only from the Scheduled list
- [ ] Deleting one occurrence of a recurring task offers a choice between "this occurrence only" and "the whole series"
- [ ] Choosing "this occurrence only" removes just that date's occurrence; the rest of the series is unaffected; it is archived or erased following the same done/overdue/future rule as a standalone delete
- [ ] Choosing "the whole series" removes every occurrence from the Scheduled list; each past (done or overdue) occurrence becomes its own archived record; future, not-yet-due occurrences are erased with no trace
- [ ] A single-dated task's date can be changed after creation; it moves from its old date to the new one everywhere it is shown (Scheduled list, calendar, heatmap)
- [ ] Clearing a single-dated task's date converts it back to a general task, moving it into the urgency-sorted list
- [ ] A recurring task's weekdays and/or date range can be edited after creation
- [ ] Editing a recurring task's rule only adds/removes occurrences dated today or later; already-elapsed occurrences and their done/not-done state are never altered by a later rule edit
- [ ] The calendar defaults to month view, showing the month containing today's date, with today's square visually distinguishable from other days
- [ ] The calendar can be switched between month, week, and year views
- [ ] The calendar can be navigated to the previous/next period (month, week, or year, matching the current view) and back to today
- [ ] Every calendar view (month/week/year) renders one square per day, colored using the same 5-level white-to-blue scale
- [ ] A day's completion ratio is: (dated items marked done that day) / (total dated items that day)
- [ ] A day with zero dated items is shown at the lightest band (same visual level as 0% done)
- [ ] A day with all dated items done is shown at the darkest band (100%)
- [ ] The 5 color bands map to fixed ratio ranges: 0% / 1–25% / 26–50% / 51–75% / 76–99% / 100% (6 named thresholds across 5 non-zero-inclusive bands, per the table above)
- [ ] Marking a general (dateless) task done or not done never changes any day's calendar color
- [ ] All existing base-app acceptance criteria (`specs/todo-app/spec.md`) continue to pass unmodified for general tasks
- [ ] User can create a reminder via a dedicated reminder form: free text, a color (green or yellow), and a date
- [ ] A reminder created without picking a color defaults to green
- [ ] Submitting empty or whitespace-only reminder text does not create a reminder
- [ ] At most one reminder exists per date; creating a second one for an already-occupied date fails, leaving the existing reminder unchanged
- [ ] Every calendar view (month/week/year) shows a small colored marker on a date's square when that date has a reminder, alongside its heatmap color
- [ ] Tapping a reminder's marker opens its full text along with edit and delete controls, distinct from tapping elsewhere on the day (which opens the dated-item day-detail view)
- [ ] A reminder's text, color, and date can each be edited after creation
- [ ] Editing a reminder's date to one that already has a different reminder fails, leaving both reminders unchanged
- [ ] A reminder can be deleted; it is removed immediately and permanently, with no undo
- [ ] A reminder never affects any day's heatmap ratio or color, regardless of its own color
- [ ] A reminder's text is rendered as plain text, never interpreted as HTML/script
- [ ] A reminder never appears in the Scheduled list or the general urgency-sorted list — it is not a task and has no done/not-done state

## Out of scope

- Editing a task's text or description after creation (unchanged from the base spec — only date/recurrence and urgency are editable)
- Undo/recovery after any deletion, including "delete whole series" (deletion remains immediate and permanent, per the base spec)
- Reminders, notifications, or alarms tied to a task's date
- Time-of-day scheduling — dates have no associated time, only a calendar day
- Recurrence patterns other than "selected weekdays within a start/end date range" (e.g., "every N days," monthly-by-date, custom RRULE-style patterns)
- Creating a new task directly from the day-detail view (it is read-only; new tasks are still created via the existing new-task form)
- Marking done/not-done, editing, or deleting anything from the day-detail view — all actions on live items remain in the Scheduled list; the day-detail view only ever displays
- Un-archiving, editing, or restoring an archived record to an active task — archiving, like deletion elsewhere in this app, is permanent
- Translating the app's UI to Portuguese (the feature was described in Portuguese, but the existing app UI is English; no localization work is requested here)
- Multi-user accounts, login, authentication, or cross-device sync (unchanged from the base spec)
- Any backend server, database, or external calendar integration (e.g., syncing with Google/Apple Calendar)
- A configurable color scale (only white-to-blue, 5 bands, as specified)
- A dedicated bulk "clear all done/overdue items" action — deletion remains one swipe-and-tap per item, as in the base app; this spec only changes what happens when an individual item is deleted
- Preserving an archived record's description or urgency — only its text, date, and done/not-done state survive deletion
- More than 2 reminder colors, or a custom/configurable color
- More than one reminder per date
- Recurring reminders — a reminder is always tied to exactly one date, never a weekday/range rule like recurring tasks
- Reminders triggering notifications, alerts, or any form of push — "reminder" here names the post-it visual metaphor, not a notification feature
- Undo/recovery after deleting a reminder (deletion remains immediate and permanent, per the base spec)
- A reminder ever counting toward, or appearing in, the Scheduled list or the heatmap

## Security considerations

- **Data sensitivity:** dates, recurrence rules, and archived records' text are user-entered scheduling/task metadata with the same sensitivity profile as existing task text — no credentials, financial data, or regulated data involved.
- **Authentication / authorization:** unchanged from the base spec — no login, single device, on-device storage only. Archived records are readable by anyone with access to the unlocked device, same as any other task data (documented, not solved, here — matching the base spec's stance).
- **Abuse cases:**
  - A pathologically large recurrence range (e.g., a decades-long daily rule) generating enough occurrences to freeze the UI or exhaust on-device storage → the app must remain responsive; deleting done/overdue items to archive them (this spec) is the user's primary mitigation once occurrences pile up, but a hard cap or lazy/virtualized rendering for very large ranges is still an implementation decision for `plan.md`
  - Archived records (one per calendar day that has ever had a done or overdue item deleted, holding that day's archived items) accumulate indefinitely and are never themselves deleted — by design, since they are what keeps both the heatmap and the day-detail view accurate — but each drops description, urgency, id, and other metadata, keeping only text/date/done-state, so it is still meaningfully smaller than the live task record it replaces
  - Archived text is subject to the same plain-text rendering guarantee as existing task fields — no HTML/script execution from an archived record's text, exactly as for a live task's
  - Deleting a whole series is a destructive, irreversible action affecting potentially many days of history at once; the choice between "this occurrence" and "the whole series" must be an explicit, distinct user action (never the default of a generic delete) so a series is never wiped by an action the user intended for a single occurrence
  - Reminder text is user-entered free text with the same sensitivity profile as task text; it is subject to the same plain-text rendering guarantee — no HTML/script execution from a reminder's content

## Dependencies

- **Other specs:** `specs/todo-app/spec.md` — this spec extends that task model (general tasks, urgency, done/not-done, on-device storage) rather than replacing it; all its acceptance criteria remain binding
- **External systems:** none — no backend, no third-party APIs, no external calendar sync
- **Libraries:** none required beyond what the base app already uses; any date-handling approach is an implementation decision for `plan.md`

## Constitution adherence

- **Principle 1 (Spec before code):** this spec is written and must be approved before implementation
- **Principle 2 (Tests track behavior):** the acceptance criteria above will be mapped to tests via the `test-generator` skill before implementation is marked complete; the base app's existing test suite (`tests/todo-app/`) must continue to pass unmodified
- **Principle 3 (Human approval):** HIC mode preserved — implementation waits for explicit approval of this spec, then of `plan.md` and `tasks.md`
- **Principle 6 (Secrets):** no secrets are introduced; dates/recurrence rules are stored on-device alongside existing task data
- **Principle 7 (Atomic changes):** this spec is intentionally unified (dates, recurrence, calendar, and heatmap are interdependent), but `tasks.md` will decompose implementation into atomic, independently committable tasks
- **Principle 8 (Fail visibly):** storage-write failures for the new date/recurrence fields, archived records, and reminders must surface the same visible error banner the base app already uses for task saves — no silent data loss
- **Principle 9 (Tests/tasks load-bearing):** unchanged — no re-marking tasks or weakening tests to fake progress

## Identified risks

- **Risk:** a large recurring series could degrade UI performance or bloat on-device storage → **Mitigation:** the user can now delete done/overdue occurrences, archiving them at a fraction of their live size, without losing heatmap or day-detail history (this spec); `plan.md` still sizes a concrete cap or lazy-generation strategy for the unbounded case
- **Risk:** deleting a whole series used to retroactively erase historical heatmap colors, which could surprise a user who only meant to stop future occurrences → **Resolved by this spec:** deletion now archives each past (done or overdue) occurrence individually, so a day's color and detail view never change as a side effect of deleting done/overdue work; only genuinely future, not-yet-due occurrences are erased without a trace
- **Risk:** archiving keeps a dated item's text (not just a count), so the space reclaimed per item is more modest than a bare tally would give — description, urgency, and id are still dropped, which is the bulk of most task records, but very long task text itself is not trimmed → **Mitigation:** accepted for this spec; a cap on archived text length, if ever needed, is a `plan.md` decision
- **Risk:** iOS Safari on-device storage eviction (already an accepted risk in the base spec) now also covers date/recurrence data and archived records, not just live task text → **Mitigation:** no new mitigation beyond what the base spec already accepts; archived records are smaller than the live records they replace, so this is not meaningfully compounded
