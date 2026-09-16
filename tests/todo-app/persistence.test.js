// Covers spec criteria: C6, C11, C20, C26 (reload round-trip), plus
// Constitution Principle 8 (fail visibly) via the storage-failure UX check.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadApp, STORAGE_KEY, SERIES_STORAGE_KEY, OCCURRENCE_STORAGE_KEY,
  ARCHIVE_STORAGE_KEY, REMINDER_STORAGE_KEY, submitForm, isoDaysFromToday,
} from './helpers/load-app.js';

describe('C6 + C20: done-state and urgency/sort order survive a reload', () => {
  test('a fresh load reproduces exactly what a prior session left', async () => {
    const seedTasks = [
      { id: '1', text: 'urgent thing', description: '', urgency: 'red', done: false, createdAt: 1 },
      { id: '2', text: 'finished thing', description: '', urgency: 'green', done: true, createdAt: 2 },
    ];
    const window = await loadApp({ seedTasks });

    const rows = [...window.document.querySelectorAll('[data-testid="task"]')];
    assert.equal(rows.length, 2);
    assert.equal(rows[0].textContent.includes('urgent thing'), true);
    assert.equal(rows[0].classList.contains('urgency-red'), true);
    assert.equal(rows[1].querySelector('input[type=checkbox]').checked, true);
  });
});

describe('C11: a deleted task does not come back after reload', () => {
  test('deleting, then reloading against the same storage, keeps it gone', async () => {
    const seedTasks = [
      { id: '1', text: 'to be deleted', description: '', urgency: 'yellow', done: false, createdAt: 1 },
    ];
    const first = await loadApp({ seedTasks });
    const row = first.document.querySelector('[data-testid="task"]');
    const touch = (type, clientX) =>
      row.dispatchEvent(
        new first.CustomEvent(type, { bubbles: true, detail: { touches: [{ clientX, clientY: 10 }] } }),
      );
    touch('touchstart', 200);
    touch('touchmove', 20);
    touch('touchend', 20);
    row.querySelector('[data-testid="delete-control"]').click();

    const persisted = JSON.parse(first.localStorage.getItem(STORAGE_KEY));
    assert.deepEqual(persisted, []);
  });
});

describe('C26: description text persists across reload', () => {
  test('a seeded description reappears on load', async () => {
    const seedTasks = [
      {
        id: '1', text: 'grocery run', description: 'oat milk, not almond',
        urgency: 'yellow', done: false, createdAt: 1,
      },
    ];
    const window = await loadApp({ seedTasks });
    const description = window.document.querySelector('[data-testid="description"]');
    assert.equal(description.textContent, 'oat milk, not almond');
  });
});

describe('specs/task-calendar: all 5 stores round-trip a reload, including an archived record whose originating task is long gone', () => {
  test('a fresh load against pre-existing localStorage renders series/occurrence/archive/reminder data correctly', async () => {
    const archivedDate = isoDaysFromToday(-10);
    const occurrenceDate = isoDaysFromToday(2);
    const reminderDate = isoDaysFromToday(3);

    // Simulates re-reading from localStorage after a prior session: seeded
    // directly (not produced by this session's own mutations), and no
    // seedTasks entry exists for the archived record's original task — it
    // is genuinely gone, only the archive remembers it (plan.md's Testing
    // strategy: "archived records surviving a reload with their
    // originating task long gone").
    const window = await loadApp({
      seedSeries: [
        { id: 's1', text: 'Ler', description: '', urgency: 'green', weekdays: [0, 1, 2, 3, 4, 5, 6], startDate: occurrenceDate, endDate: occurrenceDate, createdAt: 1 },
      ],
      seedOccurrences: [
        { id: 'o1', seriesId: 's1', date: occurrenceDate, done: false },
      ],
      seedArchive: [
        { id: 'a1', date: archivedDate, text: 'Long-gone task', done: true, archivedAt: 1 },
      ],
      seedReminders: [
        { id: 'r1', date: reminderDate, text: 'Standing note', color: 'yellow', createdAt: 1 },
      ],
    });

    // Occurrence: shows in the Scheduled list.
    const scheduledRow = window.document.querySelector('[data-testid="scheduled-item"][data-kind="occurrence"]');
    assert.ok(scheduledRow, 'the seeded occurrence should render in the Scheduled list');
    assert.ok(scheduledRow.textContent.includes('Ler'));

    // Archive: shows in that date's day-detail panel, with no live task behind it.
    window.document.querySelector(`[data-testid="calendar-day"][data-date="${archivedDate}"]`).click();
    const archivedItem = window.document.querySelector('[data-testid="day-detail-item"]');
    assert.ok(archivedItem.textContent.includes('Long-gone task'));
    assert.equal(window.document.querySelectorAll('[data-testid="scheduled-item"]').length, 1); // only the occurrence, nothing from the archive

    // Reminder: marker shows on its date.
    const reminderMarker = window.document
      .querySelector(`[data-testid="calendar-day"][data-date="${reminderDate}"]`)
      .querySelector('[data-testid="reminder-marker"]');
    assert.ok(reminderMarker);
    assert.equal(reminderMarker.dataset.color, 'yellow');

    // Nothing was rewritten by merely loading/rendering.
    assert.equal(JSON.parse(window.localStorage.getItem(SERIES_STORAGE_KEY)).length, 1);
    assert.equal(JSON.parse(window.localStorage.getItem(OCCURRENCE_STORAGE_KEY)).length, 1);
    assert.equal(JSON.parse(window.localStorage.getItem(ARCHIVE_STORAGE_KEY)).length, 1);
    assert.equal(JSON.parse(window.localStorage.getItem(REMINDER_STORAGE_KEY)).length, 1);
  });
});

describe('Constitution Principle 8: a storage write failure is visible, not silent', () => {
  test('creating a task while storage.setItem throws still shows a visible error', async () => {
    const window = await loadApp();
    // Force the injected storage to fail, the way Task 10's "simulated
    // storage-write failure" scenario in tasks.md describes. Assigning
    // window.localStorage.setItem directly does NOT work in jsdom — its
    // Storage object intercepts plain property assignment and stores it as
    // a literal key/value pair named "setItem" instead of overriding the
    // method. Patching the shared prototype is what actually takes effect.
    Object.getPrototypeOf(window.localStorage).setItem = () => {
      throw new window.DOMException('QuotaExceededError', 'QuotaExceededError');
    };
    window.document.querySelector('[data-testid="new-task-text"]').value = 'will not save';
    submitForm(window.document.querySelector('[data-testid="new-task-form"]'));

    const error = window.document.querySelector('[data-testid="storage-error"]');
    assert.ok(error, 'a visible storage-error element should appear');
    assert.equal(error.hidden, false);
  });
});
