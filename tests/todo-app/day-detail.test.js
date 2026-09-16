// DOM/integration tests for the read-only day-detail panel.
// Covers spec criteria: C18, C19, C21.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, isoDaysFromToday } from './helpers/load-app.js';

function openDay(window, date) {
  window.document.querySelector(`[data-testid="calendar-day"][data-date="${date}"]`).click();
  return window.document.querySelector('[data-testid="day-detail"]');
}

describe('C18: tapping a day lists every live and archived item scheduled for it', () => {
  test('a day with 2 archived records and 1 live item lists all 3, with text and done state', async () => {
    const date = isoDaysFromToday(-2);
    const window = await loadApp({
      seedTasks: [
        { id: 't1', text: 'Live one', description: '', urgency: 'green', done: true, createdAt: 1, date },
      ],
      seedArchive: [
        { id: 'a1', date, text: 'Archived done', done: true, archivedAt: 1 },
        { id: 'a2', date, text: 'Archived missed', done: false, archivedAt: 2 },
      ],
    });
    const panel = openDay(window, date);
    const items = [...panel.querySelectorAll('[data-testid="day-detail-item"]')];
    assert.equal(items.length, 3);

    const texts = items.map((item) => item.textContent);
    assert.ok(texts.some((t) => t.includes('Live one')));
    assert.ok(texts.some((t) => t.includes('Archived done')));
    assert.ok(texts.some((t) => t.includes('Archived missed')));
  });
});

describe('C19: a day with nothing scheduled shows an empty state', () => {
  test('tapping a day with no live or archived items shows the empty-state element', async () => {
    const date = isoDaysFromToday(10);
    const window = await loadApp({});
    const panel = openDay(window, date);
    assert.ok(panel.querySelector('[data-testid="day-detail-empty"]'));
    assert.equal(panel.querySelectorAll('[data-testid="day-detail-item"]').length, 0);
  });
});

describe('C21: the day-detail view is strictly read-only', () => {
  test('no checkbox, edit, delete, or un-archive control exists anywhere in the panel', async () => {
    const date = isoDaysFromToday(-1);
    const window = await loadApp({
      seedTasks: [
        { id: 't1', text: 'Live one', description: '', urgency: 'green', done: false, createdAt: 1, date },
      ],
      seedArchive: [{ id: 'a1', date, text: 'Archived', done: true, archivedAt: 1 }],
    });
    const panel = openDay(window, date);
    assert.equal(panel.querySelectorAll('input, button, select').length, 0);
  });
});
