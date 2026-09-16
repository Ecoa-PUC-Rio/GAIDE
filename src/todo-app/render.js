// DOM rendering + interaction wiring for the general (urgency-sorted) task
// list. Carved out of app.js (Task 10, module split) with no behavior
// change — data/storage logic lives in data.js, app.js is just the entry
// point. calendar/Scheduled-list/day-detail/reminder rendering are added
// here by later tasks (11+), not part of this split.

import {
  loadTasks, saveTasks, deleteTask, toggleDone, setUrgency, sortTasks,
  loadSeries, saveSeries, loadOccurrences, saveOccurrences, toggleOccurrenceDone,
  loadArchive, appendArchiveRecord, resolveDelete, clearTaskDate, setTaskDate, updateSeriesRule,
  loadReminders, saveReminders, createReminder, updateReminder, deleteReminder,
  toISODate,
} from './data.js';
import { buildGrid, shiftPeriod, referenceDateForToday } from './calendar.js';

// --- Storage-failure UX ----------------------------------------------------
// Constitution Principle 8: a failed write must be visible, never silent.
// Every mutation funnels through here instead of calling saveTasks directly.
export function persistTasks(doc, storage, tasks) {
  const banner = doc.querySelector('[data-testid="storage-error"]');
  const result = saveTasks(storage, tasks);
  banner.hidden = result.ok;
  if (!result.ok) banner.textContent = "Couldn't save your changes. Please try again.";
  return result;
}

// --- Rendering ---------------------------------------------------------
// Shapes, not just color, distinguish urgency (colorblind-accessible per the
// spec review); CSS layers color on top via .urgency-{level} on the row.
const URGENCY_ICON = { red: '▲', yellow: '■', green: '●' };
// No color name in the label — the color/icon already shows it visually,
// repeating it in text would be redundant.
const URGENCY_LABEL = { red: 'Urgent', yellow: 'Medium', green: 'Chill' };

function updateTask(doc, storage, id, updater) {
  const tasks = loadTasks(storage).map((t) => (t.id === id ? updater(t) : t));
  persistTasks(doc, storage, tasks);
  return tasks;
}

// One small builder per concern (code review finding, base app Task 15 —
// this used to be one large function). Each returns the element it builds
// and wires its own listeners; renderTaskRow just assembles them.

function buildDoneCheckbox(doc, storage, task, row) {
  const wrap = doc.createElement('span');
  wrap.className = 'task-done';
  const checkbox = doc.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = task.done;
  checkbox.setAttribute('aria-label', 'Mark done');
  // Updates this row in place rather than going through renderTaskList: done
  // never changes sort position, and interactions.test.js holds a reference
  // to this exact <li> across the click, so it must not be replaced.
  checkbox.addEventListener('click', () => {
    updateTask(doc, storage, task.id, toggleDone);
    row.classList.toggle('done', checkbox.checked);
  });
  wrap.appendChild(checkbox);
  return wrap;
}

function buildUrgencyIcon(doc, task) {
  const icon = doc.createElement('span');
  icon.className = 'urgency-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = URGENCY_ICON[task.urgency] ?? URGENCY_ICON.green;
  return icon;
}

function buildUrgencyPicker(doc, storage, task) {
  const picker = doc.createElement('select');
  picker.className = 'urgency-picker';
  picker.dataset.testid = 'urgency-picker';
  picker.setAttribute('aria-label', 'Change urgency');
  for (const level of ['red', 'yellow', 'green']) {
    const option = doc.createElement('option');
    option.value = level;
    option.textContent = URGENCY_LABEL[level];
    picker.appendChild(option);
  }
  picker.value = task.urgency;
  // Urgency changes sort position, so this goes through a full re-render
  // (unlike the done-toggle above); interactions.test.js re-queries the DOM
  // afterwards rather than holding a stale row reference across this one.
  picker.addEventListener('change', () => {
    const tasks = updateTask(doc, storage, task.id, (t) => setUrgency(t, picker.value));
    renderTaskList(doc, storage, tasks);
  });
  return picker;
}

function buildTaskText(doc, task) {
  const text = doc.createElement('span');
  text.className = 'task-text';
  text.textContent = task.text;
  return text;
}

// Returns null (not an element) when there's no description, so a plain
// task never renders a dead expand control (C25) — renderTaskRow only
// appends it when non-null.
function buildDescription(doc, task) {
  if (!task.description) return null;
  const description = doc.createElement('div');
  description.className = 'description';
  description.dataset.testid = 'description';
  description.hidden = true;
  description.textContent = task.description;
  return description;
}

// Ignore clicks that originate on an interactive control (checkbox, urgency
// picker, delete button) — only a tap on the row's own surface toggles the
// description. A task without one has nothing to toggle. If the delete
// control is currently revealed, a tap elsewhere on the row dismisses it
// instead of also toggling the description — otherwise there'd be no way
// to put it away short of a full reverse swipe.
function attachRowClickHandler(row) {
  row.addEventListener('click', (event) => {
    if (event.target.closest('input, select, button')) return;

    const deleteControl = row.querySelector('[data-testid="delete-control"]');
    if (deleteControl) {
      deleteControl.remove();
      return;
    }

    const description = row.querySelector('[data-testid="description"]');
    if (!description) return;
    description.hidden = !description.hidden;
  });
}

function renderTaskRow(doc, storage, task) {
  const row = doc.createElement('li');
  row.dataset.testid = 'task';
  row.dataset.taskId = task.id;
  row.className = `task urgency-${task.urgency}${task.done ? ' done' : ''}`;

  row.appendChild(buildDoneCheckbox(doc, storage, task, row));
  row.appendChild(buildUrgencyIcon(doc, task));
  row.appendChild(buildUrgencyPicker(doc, storage, task));
  row.appendChild(buildTaskText(doc, task));

  const description = buildDescription(doc, task);
  if (description) row.appendChild(description);

  attachSwipeToDelete(doc, storage, task, row);
  attachRowClickHandler(row);

  return row;
}

// --- Swipe-to-delete ---------------------------------------------------
const SWIPE_REVEAL_THRESHOLD = 40; // px of leftward drag before the delete control appears

// Real touch events carry event.touches; the DOM has no TouchEvent
// constructor in jsdom, so tests simulate touches via a CustomEvent with
// { detail: { touches } } instead — this reads either shape, so the same
// handler works against a real iPhone and against the test suite.
function touchX(event) {
  const touch = event.touches ? event.touches[0] : event.detail?.touches?.[0];
  return touch ? touch.clientX : null;
}

function createDeleteControl(doc, storage, task, row) {
  const deleteControl = doc.createElement('button');
  deleteControl.type = 'button';
  deleteControl.className = 'delete-control';
  deleteControl.dataset.testid = 'delete-control';
  deleteControl.setAttribute('aria-label', 'Delete task');
  deleteControl.textContent = 'Delete';
  deleteControl.addEventListener('click', () => {
    const tasks = deleteTask(loadTasks(storage), task.id);
    persistTasks(doc, storage, tasks);
    renderTaskList(doc, storage, tasks);
  });
  return deleteControl;
}

function attachSwipeToDelete(doc, storage, task, row) {
  let startX = null;

  row.addEventListener('touchstart', (event) => {
    startX = touchX(event);
  });

  row.addEventListener('touchmove', (event) => {
    if (startX === null) return;
    const currentX = touchX(event);
    if (currentX === null) return;

    // Synced continuously to the current drag, not just "reveal once and
    // never again" — swiping back right past the threshold within the same
    // gesture hides it, matching the standard swipe-to-delete pattern.
    const shouldReveal = startX - currentX >= SWIPE_REVEAL_THRESHOLD;
    const existing = row.querySelector('[data-testid="delete-control"]');
    if (shouldReveal && !existing) {
      row.appendChild(createDeleteControl(doc, storage, task, row));
    } else if (!shouldReveal && existing) {
      existing.remove();
    }
  });

  row.addEventListener('touchend', () => {
    startX = null;
  });
}

export function renderTaskList(doc, storage, tasks) {
  // General list shows only dateless tasks (spec C9) — filtered here, once,
  // rather than requiring every call site to remember to exclude dated ones.
  const generalTasks = tasks.filter((task) => !task.date);
  const list = doc.querySelector('[data-testid="task-list"]');
  list.replaceChildren(...sortTasks(generalTasks).map((task) => renderTaskRow(doc, storage, task)));
}

function today() {
  return toISODate(new Date());
}

// --- Scheduled list (dated tasks + occurrences) -----------------------

const SCHEDULED_SWIPE_THRESHOLD = 40;

function scheduledTouchX(event) {
  const touch = event.touches ? event.touches[0] : event.detail?.touches?.[0];
  return touch ? touch.clientX : null;
}

// Archives (done/overdue) or erases (future, not-due) the item per the
// spec's rule (data.js's resolveDelete) — persistence of the item itself
// (removing it from tasks/occurrences) is the caller's job, since that
// differs between a single-dated task and an occurrence.
function archiveOrErase(storage, { date, text, done }) {
  const decision = resolveDelete({ date, text, done }, today());
  if (decision.archive) appendArchiveRecord(storage, decision.archive);
}

function buildDeleteScopeChoice(doc, storage, item) {
  const wrap = doc.createElement('span');
  wrap.className = 'delete-scope-choice';

  const occurrenceBtn = doc.createElement('button');
  occurrenceBtn.type = 'button';
  occurrenceBtn.dataset.testid = 'delete-scope-occurrence';
  occurrenceBtn.textContent = 'This occurrence';
  occurrenceBtn.addEventListener('click', () => {
    archiveOrErase(storage, item);
    const occurrences = loadOccurrences(storage).filter((o) => o.id !== item.ref.id);
    saveOccurrences(storage, occurrences);
    refreshDatedViews(doc, storage);
  });

  const seriesBtn = doc.createElement('button');
  seriesBtn.type = 'button';
  seriesBtn.dataset.testid = 'delete-scope-series';
  seriesBtn.textContent = 'Whole series';
  seriesBtn.addEventListener('click', () => {
    const allOccurrences = loadOccurrences(storage);
    const seriesOccurrences = allOccurrences.filter((o) => o.seriesId === item.seriesId);
    const series = loadSeries(storage).find((s) => s.id === item.seriesId);
    for (const occurrence of seriesOccurrences) {
      archiveOrErase(storage, { date: occurrence.date, text: series ? series.text : '', done: occurrence.done });
    }
    saveOccurrences(storage, allOccurrences.filter((o) => o.seriesId !== item.seriesId));
    saveSeries(storage, loadSeries(storage).filter((s) => s.id !== item.seriesId));
    refreshDatedViews(doc, storage);
  });

  wrap.appendChild(occurrenceBtn);
  wrap.appendChild(seriesBtn);
  return wrap;
}

function buildScheduledDeleteControl(doc, storage, item, row) {
  const control = doc.createElement('button');
  control.type = 'button';
  control.className = 'delete-control';
  control.dataset.testid = 'delete-control';
  control.setAttribute('aria-label', 'Delete');
  control.textContent = 'Delete';
  control.addEventListener('click', () => {
    if (item.kind === 'single') {
      archiveOrErase(storage, item);
      saveTasks(storage, deleteTask(loadTasks(storage), item.ref.id));
      refreshDatedViews(doc, storage);
      return;
    }
    // A recurring occurrence: offer the this-occurrence/whole-series choice
    // instead of deleting immediately.
    control.remove();
    row.appendChild(buildDeleteScopeChoice(doc, storage, item));
  });
  return control;
}

function attachScheduledSwipeToDelete(doc, storage, item, row) {
  let startX = null;

  row.addEventListener('touchstart', (event) => {
    startX = scheduledTouchX(event);
  });

  row.addEventListener('touchmove', (event) => {
    if (startX === null) return;
    const currentX = scheduledTouchX(event);
    if (currentX === null) return;
    const shouldReveal = startX - currentX >= SCHEDULED_SWIPE_THRESHOLD;
    const existing = row.querySelector('[data-testid="delete-control"]');
    if (shouldReveal && !existing) {
      row.appendChild(buildScheduledDeleteControl(doc, storage, item, row));
    } else if (!shouldReveal && existing) {
      existing.remove();
    }
  });

  row.addEventListener('touchend', () => {
    startX = null;
  });
}

function buildScheduledRow(doc, storage, item) {
  const row = doc.createElement('li');
  row.dataset.testid = 'scheduled-item';
  row.dataset.date = item.date;
  row.dataset.kind = item.kind;
  row.className = `scheduled-item${item.done ? ' done' : ''}`;

  const checkbox = doc.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = item.done;
  checkbox.setAttribute('aria-label', 'Mark done');
  checkbox.addEventListener('click', () => {
    if (item.kind === 'single') {
      saveTasks(storage, loadTasks(storage).map((t) => (t.id === item.ref.id ? toggleDone(t) : t)));
    } else {
      saveOccurrences(
        storage,
        loadOccurrences(storage).map((o) => (o.id === item.ref.id ? toggleOccurrenceDone(o) : o)),
      );
    }
    row.classList.toggle('done', checkbox.checked);
    renderCalendar(doc, storage);
    refreshOpenDayDetail(doc, storage);
  });
  row.appendChild(checkbox);

  const text = doc.createElement('span');
  text.className = 'scheduled-text';
  text.textContent = `${item.text} (${item.date})`;
  row.appendChild(text);

  if (item.kind === 'single') {
    // C25: the date can be changed after creation, like urgency can today.
    const editDate = doc.createElement('input');
    editDate.type = 'date';
    editDate.dataset.testid = 'edit-date';
    editDate.setAttribute('aria-label', 'Change date');
    editDate.value = item.date;
    editDate.addEventListener('change', () => {
      const tasks = loadTasks(storage).map((t) => (t.id === item.ref.id ? setTaskDate(t, editDate.value) : t));
      saveTasks(storage, tasks);
      refreshDatedViews(doc, storage);
    });
    row.appendChild(editDate);

    const clearDateButton = doc.createElement('button');
    clearDateButton.type = 'button';
    clearDateButton.dataset.testid = 'clear-date';
    clearDateButton.setAttribute('aria-label', 'Clear date');
    clearDateButton.textContent = 'Clear date';
    clearDateButton.addEventListener('click', () => {
      const tasks = loadTasks(storage).map((t) => (t.id === item.ref.id ? clearTaskDate(t) : t));
      persistTasks(doc, storage, tasks);
      renderTaskList(doc, storage, tasks);
      refreshDatedViews(doc, storage);
    });
    row.appendChild(clearDateButton);
  } else {
    row.appendChild(buildEditSeriesControl(doc, storage, item));
  }

  attachScheduledSwipeToDelete(doc, storage, item, row);

  return row;
}

// C27 + C28: a series' weekdays/date range can be edited after creation,
// affecting only occurrences dated today or later (data.js's
// updateSeriesRule already implements the today-or-later reconciliation).
function buildEditSeriesControl(doc, storage, item) {
  const wrap = doc.createElement('span');

  const editButton = doc.createElement('button');
  editButton.type = 'button';
  editButton.dataset.testid = 'edit-series';
  editButton.setAttribute('aria-label', 'Edit repeat rule');
  editButton.textContent = 'Edit repeat';
  wrap.appendChild(editButton);

  editButton.addEventListener('click', () => {
    if (wrap.querySelector('[data-testid="edit-series-save"]')) return; // already open
    const series = loadSeries(storage).find((s) => s.id === item.seriesId);
    if (!series) return;

    const editor = doc.createElement('span');
    editor.className = 'edit-series-editor';

    for (let day = 0; day <= 6; day += 1) {
      const label = doc.createElement('label');
      const checkbox = doc.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.testid = 'edit-series-weekday';
      checkbox.value = String(day);
      checkbox.checked = series.weekdays.includes(day);
      label.appendChild(checkbox);
      editor.appendChild(label);
    }

    const startInput = doc.createElement('input');
    startInput.type = 'date';
    startInput.dataset.testid = 'edit-series-start-date';
    startInput.value = series.startDate;
    editor.appendChild(startInput);

    const endInput = doc.createElement('input');
    endInput.type = 'date';
    endInput.dataset.testid = 'edit-series-end-date';
    endInput.value = series.endDate;
    editor.appendChild(endInput);

    const errorBox = doc.createElement('span');
    errorBox.className = 'form-error';
    errorBox.dataset.testid = 'edit-series-error';
    errorBox.hidden = true;
    editor.appendChild(errorBox);

    const saveButton = doc.createElement('button');
    saveButton.type = 'button';
    saveButton.dataset.testid = 'edit-series-save';
    saveButton.textContent = 'Save';
    saveButton.addEventListener('click', () => {
      const weekdays = [...editor.querySelectorAll('[data-testid="edit-series-weekday"]:checked')]
        .map((cb) => Number(cb.value));
      const newRule = { weekdays, startDate: startInput.value, endDate: endInput.value };
      const allOccurrences = loadOccurrences(storage);
      const seriesOccurrences = allOccurrences.filter((o) => o.seriesId === series.id);
      const otherOccurrences = allOccurrences.filter((o) => o.seriesId !== series.id);
      const result = updateSeriesRule(series, seriesOccurrences, newRule, today());
      // Fail visibly (Constitution Principle 8): an invalid edited range or
      // one over the 730-occurrence cap must not silently drop future
      // occurrences — code review (Task 23) caught this as a real
      // data-loss bug in an earlier version of updateSeriesRule.
      if (result.error) {
        errorBox.hidden = false;
        errorBox.textContent = result.error === 'invalid-range'
          ? 'End date must be on or after the start date.'
          : 'That range repeats too many times — pick a shorter one.';
        return;
      }
      errorBox.hidden = true;
      saveSeries(storage, loadSeries(storage).map((s) => (s.id === series.id ? result.series : s)));
      saveOccurrences(storage, [...otherOccurrences, ...result.occurrences]);
      refreshDatedViews(doc, storage);
    });
    editor.appendChild(saveButton);

    wrap.appendChild(editor);
  });

  return wrap;
}

export function renderScheduledList(doc, storage) {
  const tasks = loadTasks(storage).filter((task) => task.date);
  const occurrences = loadOccurrences(storage);
  const series = loadSeries(storage);

  const items = [
    ...tasks.map((task) => ({
      kind: 'single', date: task.date, text: task.text, done: task.done, ref: task,
    })),
    ...occurrences.map((occurrence) => {
      const parentSeries = series.find((s) => s.id === occurrence.seriesId);
      return {
        kind: 'occurrence',
        date: occurrence.date,
        text: parentSeries ? parentSeries.text : '',
        done: occurrence.done,
        ref: occurrence,
        seriesId: occurrence.seriesId,
      };
    }),
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const list = doc.querySelector('[data-testid="scheduled-list"]');
  list.replaceChildren(...items.map((item) => buildScheduledRow(doc, storage, item)));
}

// --- Calendar ------------------------------------------------------------

const calendarState = { view: 'month', referenceDate: null };

function ensureReferenceDate() {
  if (!calendarState.referenceDate) {
    calendarState.referenceDate = referenceDateForToday(calendarState.view, today());
  }
}

export function setCalendarView(view) {
  calendarState.view = view;
  calendarState.referenceDate = referenceDateForToday(view, today());
}

export function navigateCalendar(direction) {
  ensureReferenceDate();
  calendarState.referenceDate = direction === 'today'
    ? referenceDateForToday(calendarState.view, today())
    : shiftPeriod(calendarState.referenceDate, calendarState.view, direction);
}

function buildCalendarDayCell(doc, storage, cell) {
  const el = doc.createElement('div');
  el.dataset.testid = 'calendar-day';
  el.dataset.date = cell.date;
  el.dataset.band = String(cell.band);
  if (cell.isToday) el.dataset.today = 'true';
  el.className = `calendar-day band-${cell.band}${cell.isToday ? ' today' : ''}`;

  if (cell.reminder) {
    const marker = doc.createElement('span');
    marker.dataset.testid = 'reminder-marker';
    marker.dataset.color = cell.reminder.color;
    marker.className = `reminder-marker reminder-${cell.reminder.color}`;
    // stopPropagation: a marker tap opens the reminder popup, not the day
    // cell's own click handler (which opens the day-detail view instead).
    marker.addEventListener('click', (event) => {
      event.stopPropagation();
      openReminderPopup(doc, cell.reminder);
    });
    el.appendChild(marker);
  }

  el.addEventListener('click', () => openDayDetail(doc, storage, cell.date));

  return el;
}

export function renderCalendar(doc, storage) {
  ensureReferenceDate();
  const stores = {
    tasks: loadTasks(storage),
    occurrences: loadOccurrences(storage),
    archive: loadArchive(storage),
  };
  const reminders = loadReminders(storage);
  const cells = buildGrid(calendarState.view, calendarState.referenceDate, today(), stores, reminders);

  const grid = doc.querySelector('[data-testid="calendar-grid"]');
  grid.replaceChildren(...cells.map((cell) => buildCalendarDayCell(doc, storage, cell)));
}

// --- Day-detail panel (read-only) -----------------------------------------

function openDayDetail(doc, storage, date) {
  const panel = doc.querySelector('[data-testid="day-detail"]');
  const body = doc.querySelector('[data-testid="day-detail-body"]');
  panel.dataset.date = date;

  const series = loadSeries(storage);
  const items = [
    ...loadTasks(storage).filter((t) => t.date === date).map((t) => ({ text: t.text, done: t.done })),
    ...loadOccurrences(storage).filter((o) => o.date === date).map((o) => {
      const parentSeries = series.find((s) => s.id === o.seriesId);
      return { text: parentSeries ? parentSeries.text : '', done: o.done };
    }),
    ...loadArchive(storage).filter((a) => a.date === date).map((a) => ({ text: a.text, done: a.done })),
  ];

  body.replaceChildren();
  if (items.length === 0) {
    const empty = doc.createElement('p');
    empty.dataset.testid = 'day-detail-empty';
    empty.textContent = 'Nothing scheduled.';
    body.appendChild(empty);
  } else {
    for (const item of items) {
      const row = doc.createElement('p');
      row.dataset.testid = 'day-detail-item';
      row.textContent = `${item.text} — ${item.done ? 'done' : 'not done'}`;
      body.appendChild(row);
    }
  }

  panel.hidden = false;
}

function refreshOpenDayDetail(doc, storage) {
  const panel = doc.querySelector('[data-testid="day-detail"]');
  if (panel.hidden) return;
  openDayDetail(doc, storage, panel.dataset.date);
}

// --- Reminders -------------------------------------------------------------

function openReminderPopup(doc, reminder) {
  const popup = doc.querySelector('[data-testid="reminder-popup"]');
  popup.dataset.reminderId = reminder.id;
  doc.querySelector('[data-testid="reminder-popup-text"]').textContent = reminder.text;
  doc.querySelector('[data-testid="reminder-edit-text"]').value = reminder.text;
  doc.querySelector('[data-testid="reminder-edit-color"]').value = reminder.color;
  doc.querySelector('[data-testid="reminder-edit-date"]').value = reminder.date;
  doc.querySelector('[data-testid="reminder-edit-error"]').hidden = true;
  popup.hidden = false;
}

function wireReminderPopup(doc, storage) {
  doc.querySelector('[data-testid="reminder-save"]').addEventListener('click', () => {
    const popup = doc.querySelector('[data-testid="reminder-popup"]');
    const id = popup.dataset.reminderId;
    const reminders = loadReminders(storage);
    const reminder = reminders.find((r) => r.id === id);
    const changes = {
      text: doc.querySelector('[data-testid="reminder-edit-text"]').value,
      color: doc.querySelector('[data-testid="reminder-edit-color"]').value,
      date: doc.querySelector('[data-testid="reminder-edit-date"]').value,
    };
    const result = updateReminder(reminder, changes, reminders);
    const errorBox = doc.querySelector('[data-testid="reminder-edit-error"]');
    if (result.error) {
      errorBox.hidden = false;
      errorBox.textContent = 'That date already has a reminder.';
      return;
    }
    errorBox.hidden = true;
    saveReminders(storage, reminders.map((r) => (r.id === id ? result : r)));
    doc.querySelector('[data-testid="reminder-popup-text"]').textContent = result.text;
    refreshDatedViews(doc, storage);
  });

  doc.querySelector('[data-testid="reminder-delete"]').addEventListener('click', () => {
    const popup = doc.querySelector('[data-testid="reminder-popup"]');
    const id = popup.dataset.reminderId;
    saveReminders(storage, deleteReminder(loadReminders(storage), id));
    popup.hidden = true;
    refreshDatedViews(doc, storage);
  });
}

function wireNewReminderForm(doc, storage) {
  doc.querySelector('[data-testid="new-reminder-form"]').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const text = form.querySelector('[data-testid="new-reminder-text"]').value;
    const color = form.querySelector('[data-testid="new-reminder-color"]').value;
    const date = form.querySelector('[data-testid="new-reminder-date"]').value;
    const reminders = loadReminders(storage);
    const result = createReminder({ text, color, date }, reminders);
    const errorBox = doc.querySelector('[data-testid="new-reminder-error"]');
    if (result.error) {
      if (result.error === 'empty-text') {
        form.reset(); // C41: no-op, nothing to save
        return;
      }
      errorBox.hidden = false;
      errorBox.textContent = 'That date already has a reminder.';
      return;
    }
    errorBox.hidden = true;
    saveReminders(storage, [...reminders, result]);
    form.reset();
    refreshDatedViews(doc, storage);
  });
}

// --- Cross-cutting refresh + one-time control wiring ------------------

// Anything that changes a dated item, an occurrence, an archived record, or
// a reminder can affect the Scheduled list, the calendar's heatmap, and (if
// open) the day-detail panel — refreshed together so they never drift out
// of sync with each other. The general (urgency-sorted) list never needs
// this: general tasks never touch any of the three (spec C37).
export function refreshDatedViews(doc, storage) {
  renderScheduledList(doc, storage);
  renderCalendar(doc, storage);
  refreshOpenDayDetail(doc, storage);
}

// One-time listener wiring for controls that exist once in the page (not
// rebuilt per render, unlike per-row/per-cell listeners above).
export function initCalendarAndReminderControls(doc, storage) {
  doc.querySelector('[data-testid="calendar-view-month"]').addEventListener('click', () => {
    setCalendarView('month');
    renderCalendar(doc, storage);
  });
  doc.querySelector('[data-testid="calendar-view-week"]').addEventListener('click', () => {
    setCalendarView('week');
    renderCalendar(doc, storage);
  });
  doc.querySelector('[data-testid="calendar-view-year"]').addEventListener('click', () => {
    setCalendarView('year');
    renderCalendar(doc, storage);
  });
  doc.querySelector('[data-testid="calendar-nav-prev"]').addEventListener('click', () => {
    navigateCalendar(-1);
    renderCalendar(doc, storage);
  });
  doc.querySelector('[data-testid="calendar-nav-next"]').addEventListener('click', () => {
    navigateCalendar(1);
    renderCalendar(doc, storage);
  });
  doc.querySelector('[data-testid="calendar-nav-today"]').addEventListener('click', () => {
    navigateCalendar('today');
    renderCalendar(doc, storage);
  });
  doc.querySelector('[data-testid="day-detail-close"]').addEventListener('click', () => {
    doc.querySelector('[data-testid="day-detail"]').hidden = true;
  });
  wireReminderPopup(doc, storage);
  wireNewReminderForm(doc, storage);
}
