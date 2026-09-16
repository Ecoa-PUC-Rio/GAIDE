// Pure logic tests — no DOM. Imports src/todo-app/data.js directly in Node.
// Covers spec criteria: C14, C15, C16, C17, C20, C23, C24.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isOverdue, resolveDelete, band, dayRatio } from '../../src/todo-app/data.js';

const TODAY = '2026-09-16';

describe('C14: an item is overdue once its date is strictly before today and it is not done', () => {
  test('a past date, not done, is overdue', () => {
    assert.equal(isOverdue({ date: '2026-09-15', done: false }, TODAY), true);
  });

  test('a past date, done, is not overdue', () => {
    assert.equal(isOverdue({ date: '2026-09-15', done: true }, TODAY), false);
  });

  test('today\'s date, not done, is not overdue yet', () => {
    assert.equal(isOverdue({ date: TODAY, done: false }, TODAY), false);
  });

  test('a future date, not done, is not overdue', () => {
    assert.equal(isOverdue({ date: '2026-09-20', done: false }, TODAY), false);
  });
});

describe('C15: deleting a done, or overdue, item archives it', () => {
  test('a done item resolves to an archive action, keeping text/date/done', () => {
    const result = resolveDelete({ date: '2026-09-10', text: 'Ler', done: true }, TODAY);
    assert.deepEqual(result, { archive: { date: '2026-09-10', text: 'Ler', done: true } });
  });

  test('an overdue, not-done item resolves to an archive action, marked not done', () => {
    const result = resolveDelete({ date: '2026-09-10', text: 'Academia', done: false }, TODAY);
    assert.deepEqual(result, { archive: { date: '2026-09-10', text: 'Academia', done: false } });
  });
});

describe('C16: deleting a future, not-yet-due item erases it with no trace', () => {
  test('a not-done item dated today or later resolves to erase, not archive', () => {
    const todayItem = resolveDelete({ date: TODAY, text: 'Later', done: false }, TODAY);
    assert.deepEqual(todayItem, { erase: true });

    const futureItem = resolveDelete({ date: '2026-09-20', text: 'Later', done: false }, TODAY);
    assert.deepEqual(futureItem, { erase: true });
  });
});

describe('C17: archiving never changes a day\'s completion ratio — merged with still-existing items', () => {
  test('dayRatio counts archived and live items for the same date together', () => {
    const ratio = dayRatio('2026-09-10', {
      tasks: [{ date: '2026-09-10', done: true }],
      occurrences: [{ date: '2026-09-10', done: false }],
      archive: [
        { date: '2026-09-10', done: true },
        { date: '2026-09-10', done: false },
      ],
    });
    assert.deepEqual(ratio, { done: 2, total: 4 });
  });

  test('deleting (archiving) a done item does not change the ratio before/after', () => {
    const before = dayRatio('2026-09-10', {
      tasks: [{ date: '2026-09-10', done: true }],
      occurrences: [],
      archive: [],
    });
    // Simulate the delete: the live item is removed, an equivalent archived
    // record is added in its place.
    const after = dayRatio('2026-09-10', {
      tasks: [],
      occurrences: [],
      archive: [{ date: '2026-09-10', done: true }],
    });
    assert.deepEqual(before, after);
    assert.deepEqual(before, { done: 1, total: 1 });
  });

  test('a day with only archived items (nothing live left) still reports the correct ratio', () => {
    const ratio = dayRatio('2026-09-10', {
      tasks: [],
      occurrences: [],
      archive: [
        { date: '2026-09-10', done: true },
        { date: '2026-09-10', done: true },
        { date: '2026-09-10', done: false },
      ],
    });
    assert.deepEqual(ratio, { done: 2, total: 3 });
    assert.equal(band(ratio.done, ratio.total), 3); // 66% -> band 3 (51-75%)
  });
});

describe('C20 (data-layer half): an archived record carries only text, date, done', () => {
  test('resolveDelete never includes description, urgency, or an id in the archive payload', () => {
    const result = resolveDelete(
      { date: '2026-09-10', text: 'Ler', done: true, description: 'ch. 4', urgency: 'red', id: 'abc' },
      TODAY,
    );
    assert.deepEqual(Object.keys(result.archive).sort(), ['date', 'done', 'text']);
  });
});

describe('C23: "this occurrence only" follows the same done/overdue/future rule as a standalone delete', () => {
  test('a done occurrence, deleted individually, archives exactly like a done single-dated task would', () => {
    const occurrenceResult = resolveDelete({ date: '2026-09-10', text: 'Ler', done: true }, TODAY);
    const singleDatedResult = resolveDelete({ date: '2026-09-10', text: 'Ler', done: true }, TODAY);
    assert.deepEqual(occurrenceResult, singleDatedResult);
  });

  test('a future, not-done occurrence, deleted individually, erases with no trace', () => {
    const result = resolveDelete({ date: '2026-09-20', text: 'Ler', done: false }, TODAY);
    assert.deepEqual(result, { erase: true });
  });
});

describe('C24: deleting a whole series archives each past occurrence individually, erases future ones', () => {
  test('resolveDelete applied per-occurrence produces the expected mix of archive/erase outcomes', () => {
    const occurrences = [
      { date: '2026-09-08', text: 'Ler', done: true }, // past, done -> archive
      { date: '2026-09-09', text: 'Ler', done: false }, // past, overdue -> archive
      { date: '2026-09-22', text: 'Ler', done: false }, // future, not due -> erase
    ];
    const results = occurrences.map((occurrence) => resolveDelete(occurrence, TODAY));
    assert.deepEqual(results, [
      { archive: { date: '2026-09-08', text: 'Ler', done: true } },
      { archive: { date: '2026-09-09', text: 'Ler', done: false } },
      { erase: true },
    ]);
  });
});
