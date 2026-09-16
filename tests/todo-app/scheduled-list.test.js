// DOM/integration tests for the Scheduled list (dated tasks + occurrences).
// Covers spec criteria: C8, C9, C10, C11, C12, C13, C22, C26.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, isoDaysFromToday } from './helpers/load-app.js';

function swipeAndReveal(window, row) {
  const touch = (type, clientX) =>
    row.dispatchEvent(
      new window.CustomEvent(type, { bubbles: true, detail: { touches: [{ clientX, clientY: 10 }] } }),
    );
  touch('touchstart', 200);
  touch('touchmove', 40);
  touch('touchend', 40);
  return row.querySelector('[data-testid="delete-control"]');
}

describe('C8: the Scheduled list shows every dated item, sorted by date ascending', () => {
  test('single-dated tasks and occurrences interleave in date order', async () => {
    const window = await loadApp({
      seedTasks: [
        { id: 't1', text: 'Later', description: '', urgency: 'green', done: false, createdAt: 1, date: isoDaysFromToday(5) },
        { id: 't2', text: 'Sooner', description: '', urgency: 'green', done: false, createdAt: 2, date: isoDaysFromToday(1) },
      ],
      seedOccurrences: [
        { id: 'o1', seriesId: 's1', date: isoDaysFromToday(3), done: false },
      ],
      seedSeries: [
        { id: 's1', text: 'Middle', description: '', urgency: 'green', weekdays: [0, 1, 2, 3, 4, 5, 6], startDate: isoDaysFromToday(3), endDate: isoDaysFromToday(3), createdAt: 1 },
      ],
    });
    const items = [...window.document.querySelectorAll('[data-testid="scheduled-item"]')];
    assert.equal(items.length, 3);
    assert.deepEqual(
      items.map((item) => item.dataset.date),
      [isoDaysFromToday(1), isoDaysFromToday(3), isoDaysFromToday(5)],
    );
  });
});

describe('C9: dated items and general tasks never mix lists', () => {
  test('a dated task is absent from the general list; a general task is absent from the Scheduled list', async () => {
    const window = await loadApp({
      seedTasks: [
        { id: 't1', text: 'Dated', description: '', urgency: 'green', done: false, createdAt: 1, date: isoDaysFromToday(1) },
        { id: 't2', text: 'General', description: '', urgency: 'green', done: false, createdAt: 2, date: null },
      ],
    });
    const generalList = window.document.querySelector('[data-testid="task-list"]');
    const scheduledList = window.document.querySelector('[data-testid="scheduled-list"]');
    assert.ok(!generalList.textContent.includes('Dated'));
    assert.ok(generalList.textContent.includes('General'));
    assert.ok(scheduledList.textContent.includes('Dated'));
    assert.ok(!scheduledList.textContent.includes('General'));
  });
});

describe('C10: a dated item stays visible (done or not) until explicitly deleted', () => {
  test('marking a dated item done keeps it in the Scheduled list', async () => {
    const window = await loadApp({
      seedTasks: [
        { id: 't1', text: 'Dated', description: '', urgency: 'green', done: false, createdAt: 1, date: isoDaysFromToday(1) },
      ],
    });
    const row = window.document.querySelector('[data-testid="scheduled-item"]');
    row.querySelector('input[type=checkbox]').click();
    assert.equal(window.document.querySelectorAll('[data-testid="scheduled-item"]').length, 1);
  });
});

describe('C11: mark/unmark one occurrence done without affecting siblings', () => {
  test('toggling one occurrence leaves the other occurrence of the same series untouched', async () => {
    const window = await loadApp({
      seedSeries: [
        { id: 's1', text: 'Ler', description: '', urgency: 'green', weekdays: [0, 1, 2, 3, 4, 5, 6], startDate: isoDaysFromToday(0), endDate: isoDaysFromToday(1), createdAt: 1 },
      ],
      seedOccurrences: [
        { id: 'o1', seriesId: 's1', date: isoDaysFromToday(0), done: false },
        { id: 'o2', seriesId: 's1', date: isoDaysFromToday(1), done: false },
      ],
    });
    const rows = [...window.document.querySelectorAll('[data-testid="scheduled-item"]')];
    const first = rows.find((row) => row.dataset.date === isoDaysFromToday(0));
    const second = rows.find((row) => row.dataset.date === isoDaysFromToday(1));

    first.querySelector('input[type=checkbox]').click();

    assert.equal(first.querySelector('input[type=checkbox]').checked, true);
    assert.equal(second.querySelector('input[type=checkbox]').checked, false);
  });
});

describe('C12 + C13: deleting a dated item requires the swipe gesture, not a plain tap', () => {
  test('a plain click on a Scheduled row never deletes it', async () => {
    const window = await loadApp({
      seedTasks: [
        { id: 't1', text: 'Dated', description: '', urgency: 'green', done: false, createdAt: 1, date: isoDaysFromToday(1) },
      ],
    });
    const row = window.document.querySelector('[data-testid="scheduled-item"]');
    row.click();
    assert.equal(window.document.querySelectorAll('[data-testid="scheduled-item"]').length, 1);
  });

  test('a future, not-done single-dated task: swipe + tap delete removes it immediately', async () => {
    const window = await loadApp({
      seedTasks: [
        { id: 't1', text: 'Dated', description: '', urgency: 'green', done: false, createdAt: 1, date: isoDaysFromToday(1) },
      ],
    });
    const row = window.document.querySelector('[data-testid="scheduled-item"]');
    const deleteControl = swipeAndReveal(window, row);
    assert.ok(deleteControl, 'delete control should be revealed after the swipe');
    deleteControl.click();
    assert.equal(window.document.querySelectorAll('[data-testid="scheduled-item"]').length, 0);
  });
});

describe('C22: deleting an occurrence offers a this-occurrence/whole-series choice', () => {
  test('deleting an occurrence shows both scope controls; a single-dated task shows neither', async () => {
    const window = await loadApp({
      seedTasks: [
        { id: 't1', text: 'Single', description: '', urgency: 'green', done: false, createdAt: 1, date: isoDaysFromToday(1) },
      ],
      seedSeries: [
        { id: 's1', text: 'Ler', description: '', urgency: 'green', weekdays: [0, 1, 2, 3, 4, 5, 6], startDate: isoDaysFromToday(1), endDate: isoDaysFromToday(2), createdAt: 1 },
      ],
      seedOccurrences: [
        { id: 'o1', seriesId: 's1', date: isoDaysFromToday(1), done: false },
      ],
    });
    const rows = [...window.document.querySelectorAll('[data-testid="scheduled-item"]')];
    const occurrenceRow = rows.find((row) => row.dataset.kind === 'occurrence');
    const singleRow = rows.find((row) => row.dataset.kind === 'single');

    swipeAndReveal(window, occurrenceRow).click();
    assert.ok(window.document.querySelector('[data-testid="delete-scope-occurrence"]'));
    assert.ok(window.document.querySelector('[data-testid="delete-scope-series"]'));

    swipeAndReveal(window, singleRow).click();
    assert.equal(window.document.querySelectorAll('[data-testid="scheduled-item"]').length, 1); // only the single-dated task deleted, no scope prompt needed
  });
});

describe('C25: a single-dated task\'s date can be changed after creation', () => {
  test('changing the date input moves the task to the new date everywhere', async () => {
    const oldDate = isoDaysFromToday(1);
    const newDate = isoDaysFromToday(5);
    const window = await loadApp({
      seedTasks: [
        { id: 't1', text: 'Dated', description: '', urgency: 'green', done: false, createdAt: 1, date: oldDate },
      ],
    });
    const row = window.document.querySelector('[data-testid="scheduled-item"]');
    const editDate = row.querySelector('[data-testid="edit-date"]');
    editDate.value = newDate;
    editDate.dispatchEvent(new window.Event('change', { bubbles: true }));

    const updatedRow = window.document.querySelector('[data-testid="scheduled-item"]');
    assert.equal(updatedRow.dataset.date, newDate);
  });
});

describe('C27 + C28: a series\' recurrence rule can be edited after creation', () => {
  test('editing the weekday/range via the inline editor updates future occurrences only', async () => {
    const window = await loadApp({
      seedSeries: [
        { id: 's1', text: 'Ler', description: '', urgency: 'green', weekdays: [1], startDate: isoDaysFromToday(-7), endDate: isoDaysFromToday(30), createdAt: 1 },
      ],
      seedOccurrences: [
        { id: 'o1', seriesId: 's1', date: isoDaysFromToday(-7), done: true },
      ],
    });
    const row = window.document.querySelector('[data-testid="scheduled-item"][data-kind="occurrence"]');
    row.querySelector('[data-testid="edit-series"]').click();

    const weekdayCheckbox = window.document.querySelector('[data-testid="edit-series-weekday"][value="1"]');
    weekdayCheckbox.checked = true;
    window.document.querySelector('[data-testid="edit-series-end-date"]').value = isoDaysFromToday(7);
    window.document.querySelector('[data-testid="edit-series-save"]').click();

    const rows = [...window.document.querySelectorAll('[data-testid="scheduled-item"]')];
    // The past, already-done occurrence (7 days ago) survives the edit untouched.
    assert.ok(rows.some((r) => r.dataset.date === isoDaysFromToday(-7)));
    // No occurrence beyond the new, shortened end date.
    assert.ok(!rows.some((r) => r.dataset.date > isoDaysFromToday(7)));
  });

  test('editing to an invalid range (end before start) shows an error and drops nothing (regression: code review Task 23)', async () => {
    const window = await loadApp({
      seedSeries: [
        { id: 's1', text: 'Ler', description: '', urgency: 'green', weekdays: [0, 1, 2, 3, 4, 5, 6], startDate: isoDaysFromToday(0), endDate: isoDaysFromToday(30), createdAt: 1 },
      ],
      seedOccurrences: [
        { id: 'o1', seriesId: 's1', date: isoDaysFromToday(1), done: false },
        { id: 'o2', seriesId: 's1', date: isoDaysFromToday(2), done: false },
      ],
    });
    const row = window.document.querySelector('[data-testid="scheduled-item"][data-kind="occurrence"]');
    row.querySelector('[data-testid="edit-series"]').click();

    // Shortened end date lands before the (unchanged) start date.
    window.document.querySelector('[data-testid="edit-series-end-date"]').value = isoDaysFromToday(-5);
    window.document.querySelector('[data-testid="edit-series-save"]').click();

    assert.equal(window.document.querySelector('[data-testid="edit-series-error"]').hidden, false);
    // Nothing was silently dropped — both future occurrences are still there.
    const rows = [...window.document.querySelectorAll('[data-testid="scheduled-item"]')];
    assert.equal(rows.filter((r) => r.dataset.kind === 'occurrence').length, 2);
  });
});

describe('C26: clearing a single-dated task\'s date converts it back to general', () => {
  test('after clearing the date, the task moves from the Scheduled list to the general list', async () => {
    const window = await loadApp({
      seedTasks: [
        { id: 't1', text: 'Dated', description: '', urgency: 'green', done: false, createdAt: 1, date: isoDaysFromToday(1) },
      ],
    });
    const row = window.document.querySelector('[data-testid="scheduled-item"]');
    row.querySelector('[data-testid="clear-date"]').click();

    assert.equal(window.document.querySelectorAll('[data-testid="scheduled-item"]').length, 0);
    const generalList = window.document.querySelector('[data-testid="task-list"]');
    assert.ok(generalList.textContent.includes('Dated'));
  });
});
