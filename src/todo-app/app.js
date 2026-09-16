// Entry point. No top-level window/document reference — must be importable
// in plain Node (tests import initApp without a DOM present at module-eval
// time). All data/storage logic lives in data.js, calendar grid assembly in
// calendar.js, all DOM rendering in render.js — this file only wires them
// together (Task 10, module split; data.js/render.js do the work app.js
// used to do directly).

import { createTask, createSeries, loadTasks, loadSeries, saveSeries, loadOccurrences, saveOccurrences } from './data.js';
import { renderTaskList, persistTasks, renderScheduledList, renderCalendar, refreshDatedViews, initCalendarAndReminderControls } from './render.js';

// --- Create-task form (general / single-dated / recurring) ----------------

function handleCreateSubmit(event, doc, storage) {
  event.preventDefault();
  const form = event.currentTarget;
  const errorBox = doc.querySelector('[data-testid="new-task-error"]');
  errorBox.hidden = true;

  const text = form.querySelector('[data-testid="new-task-text"]').value;
  const description = form.querySelector('[data-testid="new-task-description"]').value;
  const urgency = form.querySelector('[data-testid="new-task-urgency"]').value;
  const date = form.querySelector('[data-testid="new-task-date"]').value;
  const weekdays = [...form.querySelectorAll('[data-testid="new-task-weekday"]:checked')].map((cb) => Number(cb.value));
  const startDate = form.querySelector('[data-testid="new-task-start-date"]').value;
  const endDate = form.querySelector('[data-testid="new-task-end-date"]').value;

  // Recurrence sub-fields take priority over the single-date field when
  // filled — a task is exactly one kind at a time (spec C3); the form
  // itself never submits both a date and a recurrence rule as the same task.
  if (weekdays.length > 0 || startDate || endDate) {
    // A partial recurrence (e.g. a weekday checked but no range picked) must
    // not silently fall through to createSeries: generateOccurrences would
    // treat empty date strings as a same-day, always-false range and return
    // zero occurrences (not an error), persisting a useless series with no
    // visible failure — caught by code review (Task 23), Constitution
    // Principle 8.
    if (weekdays.length === 0 || !startDate || !endDate) {
      errorBox.hidden = false;
      errorBox.textContent = 'Pick at least one weekday and both a start and end date to repeat a task.';
      return;
    }
    const result = createSeries({ text, description, urgency, weekdays, startDate, endDate });
    if (result.error) {
      errorBox.hidden = false;
      errorBox.textContent = result.error === 'invalid-range'
        ? 'End date must be on or after the start date.'
        : result.error === 'too-many-occurrences'
          ? 'That range repeats too many times — pick a shorter one.'
          : 'Enter some text for the task.';
      return;
    }
    saveSeries(storage, [...loadSeries(storage), result.series]);
    saveOccurrences(storage, [...loadOccurrences(storage), ...result.occurrences]);
    form.reset();
    refreshDatedViews(doc, storage);
    return;
  }

  const task = createTask({ text, description, urgency, date: date || null });
  if (!task) return; // empty/whitespace-only text (C3, base spec) — no-op, nothing to save or render

  const tasks = [...loadTasks(storage), task];
  persistTasks(doc, storage, tasks);
  renderTaskList(doc, storage, tasks);
  form.reset();
  if (task.date) refreshDatedViews(doc, storage);
}

export function initApp(doc, storage) {
  renderTaskList(doc, storage, loadTasks(storage));
  renderScheduledList(doc, storage);
  renderCalendar(doc, storage);
  initCalendarAndReminderControls(doc, storage);

  doc
    .querySelector('[data-testid="new-task-form"]')
    .addEventListener('submit', (event) => handleCreateSubmit(event, doc, storage));
}

if (typeof document !== 'undefined' && typeof localStorage !== 'undefined') {
  initApp(document, localStorage);

  // jsdom (this project's test DOM) has no Service Worker API at all, so
  // 'serviceWorker' in navigator is false there — this is a safe no-op
  // under tests, and only registers on an actual browser.
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
}
