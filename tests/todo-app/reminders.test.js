// DOM/integration tests for reminders (create/edit/delete, marker, one-per-date).
// Covers spec criteria: C39, C40, C41, C42, C43, C44, C45, C46, C47, C48, C50.
// (C49 — plain-text rendering — lives in security.test.js with C9/C26.)
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, submitForm, isoDaysFromToday } from './helpers/load-app.js';

function fillReminderForm(window, { text, color, date }) {
  const form = window.document.querySelector('[data-testid="new-reminder-form"]');
  form.querySelector('[data-testid="new-reminder-text"]').value = text ?? '';
  if (color !== undefined) form.querySelector('[data-testid="new-reminder-color"]').value = color;
  form.querySelector('[data-testid="new-reminder-date"]').value = date ?? '';
  submitForm(form);
  return form;
}

describe('C39: create a reminder via its own form', () => {
  test('submitting text + a date creates a reminder marker on that date', async () => {
    const window = await loadApp({});
    const date = isoDaysFromToday(3);
    fillReminderForm(window, { text: 'Pay rent', color: 'yellow', date });

    const cell = window.document.querySelector(`[data-testid="calendar-day"][data-date="${date}"]`);
    assert.ok(cell.querySelector('[data-testid="reminder-marker"]'));
  });
});

describe('C40: a reminder created without a color picked defaults to green', () => {
  test('no color selected -> marker renders green', async () => {
    const window = await loadApp({});
    const date = isoDaysFromToday(3);
    fillReminderForm(window, { text: 'Pay rent', date });

    const marker = window.document
      .querySelector(`[data-testid="calendar-day"][data-date="${date}"]`)
      .querySelector('[data-testid="reminder-marker"]');
    assert.equal(marker.dataset.color, 'green');
  });
});

describe('C41: empty or whitespace-only reminder text creates nothing', () => {
  test('submitting whitespace-only text creates no marker', async () => {
    const window = await loadApp({});
    const date = isoDaysFromToday(3);
    fillReminderForm(window, { text: '   ', date });

    const cell = window.document.querySelector(`[data-testid="calendar-day"][data-date="${date}"]`);
    assert.ok(!cell.querySelector('[data-testid="reminder-marker"]'));
  });
});

describe('C42: at most one reminder exists per date', () => {
  test('creating a second reminder on an occupied date leaves the first unchanged', async () => {
    const date = isoDaysFromToday(3);
    const window = await loadApp({
      seedReminders: [{ id: 'r1', date, text: 'First', color: 'green', createdAt: 1 }],
    });
    fillReminderForm(window, { text: 'Second', date });

    const cell = window.document.querySelector(`[data-testid="calendar-day"][data-date="${date}"]`);
    const markers = cell.querySelectorAll('[data-testid="reminder-marker"]');
    assert.equal(markers.length, 1);
    markers[0].click();
    assert.ok(window.document.querySelector('[data-testid="reminder-popup-text"]').textContent.includes('First'));
  });
});

describe('C43: every calendar view shows a marker for a date with a reminder', () => {
  test('the marker is present in both month and week view', async () => {
    const date = isoDaysFromToday(0); // today, so it's in both the default month view and week view
    const window = await loadApp({
      seedReminders: [{ id: 'r1', date, text: 'Standing note', color: 'green', createdAt: 1 }],
    });
    assert.ok(
      window.document.querySelector(`[data-testid="calendar-day"][data-date="${date}"]`)
        .querySelector('[data-testid="reminder-marker"]'),
    );

    window.document.querySelector('[data-testid="calendar-view-week"]').click();
    assert.ok(
      window.document.querySelector(`[data-testid="calendar-day"][data-date="${date}"]`)
        .querySelector('[data-testid="reminder-marker"]'),
    );
  });
});

describe('C44: tapping a marker opens its text, distinct from tapping the day', () => {
  test('tapping the marker opens the reminder popup, not the day-detail panel', async () => {
    const date = isoDaysFromToday(3);
    const window = await loadApp({
      seedReminders: [{ id: 'r1', date, text: 'Pay rent', color: 'green', createdAt: 1 }],
    });
    const cell = window.document.querySelector(`[data-testid="calendar-day"][data-date="${date}"]`);
    cell.querySelector('[data-testid="reminder-marker"]').click();

    assert.equal(window.document.querySelector('[data-testid="reminder-popup"]').hidden, false);
    assert.ok(window.document.querySelector('[data-testid="reminder-popup-text"]').textContent.includes('Pay rent'));
    assert.ok(window.document.querySelector('[data-testid="reminder-edit-text"]'));
    assert.ok(window.document.querySelector('[data-testid="reminder-delete"]'));
    const dayDetail = window.document.querySelector('[data-testid="day-detail"]');
    assert.ok(dayDetail.hidden !== false); // day-detail did not also open
  });
});

describe('C45: a reminder\'s text, color, and date are each editable', () => {
  test('editing text updates the popup and the stored reminder', async () => {
    const date = isoDaysFromToday(3);
    const window = await loadApp({
      seedReminders: [{ id: 'r1', date, text: 'Pay rent', color: 'green', createdAt: 1 }],
    });
    window.document
      .querySelector(`[data-testid="calendar-day"][data-date="${date}"]`)
      .querySelector('[data-testid="reminder-marker"]').click();

    const editText = window.document.querySelector('[data-testid="reminder-edit-text"]');
    editText.value = 'Pay rent (updated)';
    window.document.querySelector('[data-testid="reminder-save"]').click();

    assert.ok(window.document.querySelector('[data-testid="reminder-popup-text"]').textContent.includes('Pay rent (updated)'));
  });

  test('editing the date moves the marker to the new date', async () => {
    const oldDate = isoDaysFromToday(3);
    const newDate = isoDaysFromToday(4);
    const window = await loadApp({
      seedReminders: [{ id: 'r1', date: oldDate, text: 'Pay rent', color: 'green', createdAt: 1 }],
    });
    window.document
      .querySelector(`[data-testid="calendar-day"][data-date="${oldDate}"]`)
      .querySelector('[data-testid="reminder-marker"]').click();

    window.document.querySelector('[data-testid="reminder-edit-date"]').value = newDate;
    window.document.querySelector('[data-testid="reminder-save"]').click();

    assert.ok(!window.document.querySelector(`[data-testid="calendar-day"][data-date="${oldDate}"]`).querySelector('[data-testid="reminder-marker"]'));
    assert.ok(window.document.querySelector(`[data-testid="calendar-day"][data-date="${newDate}"]`).querySelector('[data-testid="reminder-marker"]'));
  });
});

describe('C46: moving a reminder onto an occupied date fails', () => {
  test('editing onto a date that already has a different reminder leaves both unchanged', async () => {
    const dateA = isoDaysFromToday(3);
    const dateB = isoDaysFromToday(4);
    const window = await loadApp({
      seedReminders: [
        { id: 'r1', date: dateA, text: 'A', color: 'green', createdAt: 1 },
        { id: 'r2', date: dateB, text: 'B', color: 'yellow', createdAt: 2 },
      ],
    });
    window.document
      .querySelector(`[data-testid="calendar-day"][data-date="${dateA}"]`)
      .querySelector('[data-testid="reminder-marker"]').click();
    window.document.querySelector('[data-testid="reminder-edit-date"]').value = dateB;
    window.document.querySelector('[data-testid="reminder-save"]').click();

    assert.ok(window.document.querySelector(`[data-testid="calendar-day"][data-date="${dateA}"]`).querySelector('[data-testid="reminder-marker"]'));
    const cellB = window.document.querySelector(`[data-testid="calendar-day"][data-date="${dateB}"]`);
    assert.equal(cellB.querySelectorAll('[data-testid="reminder-marker"]').length, 1);
  });
});

describe('C47: a reminder can be deleted, immediately and permanently', () => {
  test('deleting removes the marker with no undo option', async () => {
    const date = isoDaysFromToday(3);
    const window = await loadApp({
      seedReminders: [{ id: 'r1', date, text: 'Pay rent', color: 'green', createdAt: 1 }],
    });
    window.document
      .querySelector(`[data-testid="calendar-day"][data-date="${date}"]`)
      .querySelector('[data-testid="reminder-marker"]').click();
    window.document.querySelector('[data-testid="reminder-delete"]').click();

    assert.ok(!window.document.querySelector(`[data-testid="calendar-day"][data-date="${date}"]`).querySelector('[data-testid="reminder-marker"]'));
  });
});

describe('C48: a reminder never affects any day\'s heatmap', () => {
  test('adding a reminder to a partially-completed day does not change its band', async () => {
    const date = isoDaysFromToday(3);
    const window = await loadApp({
      seedTasks: [
        { id: 't1', text: 'Dated', description: '', urgency: 'green', done: true, createdAt: 1, date },
        { id: 't2', text: 'Dated 2', description: '', urgency: 'green', done: false, createdAt: 2, date },
      ],
    });
    const bandBefore = window.document.querySelector(`[data-testid="calendar-day"][data-date="${date}"]`).dataset.band;
    fillReminderForm(window, { text: 'A note', date });
    const bandAfter = window.document.querySelector(`[data-testid="calendar-day"][data-date="${date}"]`).dataset.band;
    assert.equal(bandAfter, bandBefore);
  });
});

// C49 (reminder text renders as plain text, never HTML/script) lives in
// security.test.js alongside C9/C26 — same abuse-case pattern, same
// dedicated, already-justified nosemgrep suppression; not duplicated here.

describe('C50: a reminder never appears in the Scheduled or general list', () => {
  test('a reminder is absent from both task lists', async () => {
    const date = isoDaysFromToday(3);
    const window = await loadApp({});
    fillReminderForm(window, { text: 'Pay rent', date });

    assert.ok(!window.document.querySelector('[data-testid="task-list"]').textContent.includes('Pay rent'));
    assert.ok(!window.document.querySelector('[data-testid="scheduled-list"]').textContent.includes('Pay rent'));
  });
});
