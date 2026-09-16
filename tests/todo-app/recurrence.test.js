// Pure logic tests — no DOM. Imports src/todo-app/data.js directly in Node.
// Covers spec criteria: C1, C2, C3, C4, C5, C6, C7, C25, C27, C28.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTask,
  setTaskDate,
  clearTaskDate,
  generateOccurrences,
  createSeries,
  toggleOccurrenceDone,
  updateSeriesRule,
} from '../../src/todo-app/data.js';

describe('C1: a task can be given a single specific date at creation', () => {
  test('createTask accepts a date and keeps it', () => {
    const task = createTask({ text: 'Dentist', date: '2026-10-05' });
    assert.equal(task.date, '2026-10-05');
  });
});

describe('C3: a task is exactly one kind — general or single-dated', () => {
  test('a task created with no date is general (date is null/absent)', () => {
    const task = createTask({ text: 'Someday' });
    assert.ok(task.date === null || task.date === undefined);
  });

  test('a task never carries a seriesId — recurring items live only as occurrences', () => {
    const task = createTask({ text: 'Dentist', date: '2026-10-05' });
    assert.equal(task.seriesId, undefined);
  });
});

describe('C2 + C4: creating a recurrence expands into one occurrence per matching weekday', () => {
  test('generateOccurrences returns every date on a selected weekday within range', () => {
    // 2026-08-03 is a Monday. Weekdays selected: Monday(1), Tuesday(2).
    const dates = generateOccurrences({
      weekdays: [1, 2],
      startDate: '2026-08-03',
      endDate: '2026-08-16',
    });
    assert.deepEqual(dates, [
      '2026-08-03', // Mon
      '2026-08-04', // Tue
      '2026-08-10', // Mon
      '2026-08-11', // Tue
    ]);
  });

  test('createSeries writes a series and one occurrence per generated date', () => {
    const result = createSeries({
      text: 'Ler',
      description: '',
      urgency: 'green',
      weekdays: [1, 2],
      startDate: '2026-08-03',
      endDate: '2026-08-16',
    });
    assert.equal(result.series.text, 'Ler');
    assert.equal(result.occurrences.length, 4);
    for (const occurrence of result.occurrences) {
      assert.equal(occurrence.seriesId, result.series.id);
      assert.equal(occurrence.done, false);
    }
  });
});

describe('C5: each occurrence has its own independent done/not-done state', () => {
  test('toggleOccurrenceDone flips only the given occurrence', () => {
    const result = createSeries({
      text: 'Ler',
      weekdays: [1],
      startDate: '2026-08-03',
      endDate: '2026-08-17',
    });
    const [first, second] = result.occurrences;
    const updatedFirst = toggleOccurrenceDone(first);
    assert.equal(updatedFirst.done, true);
    assert.equal(second.done, false);
    assert.equal(updatedFirst.id, first.id);
  });
});

describe('C6: end date before start date fails validation', () => {
  test('generateOccurrences reports an invalid-range error, generates nothing', () => {
    const result = generateOccurrences({
      weekdays: [1],
      startDate: '2026-08-16',
      endDate: '2026-08-03',
    });
    assert.equal(result.error, 'invalid-range');
  });

  test('createSeries does not write a series or any occurrences on an invalid range', () => {
    const result = createSeries({
      text: 'Bad range',
      weekdays: [1],
      startDate: '2026-08-16',
      endDate: '2026-08-03',
    });
    assert.equal(result.error, 'invalid-range');
    assert.equal(result.series, undefined);
  });
});

describe('C7: a range with no date on any selected weekday succeeds with zero occurrences', () => {
  test('a 2-day range with no selected weekday match returns an empty array, not an error', () => {
    // 2026-08-03 (Mon) to 2026-08-04 (Tue); weekday selected: Wednesday(3).
    const dates = generateOccurrences({
      weekdays: [3],
      startDate: '2026-08-03',
      endDate: '2026-08-04',
    });
    assert.deepEqual(dates, []);
  });
});

describe('a rule that would generate more than the 730-occurrence cap is rejected (ADR 0005)', () => {
  test('a multi-year daily rule reports too-many-occurrences', () => {
    const result = generateOccurrences({
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      startDate: '2020-01-01',
      endDate: '2026-12-31',
    });
    assert.equal(result.error, 'too-many-occurrences');
  });

  test('exactly 730 occurrences is accepted (boundary)', () => {
    // 730 consecutive days, every weekday selected.
    const dates = generateOccurrences({
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      startDate: '2026-01-01',
      endDate: '2027-12-31', // 730 days inclusive
    });
    assert.equal(dates.length, 730);
  });
});

describe('C25: a single-dated task\'s date can be changed after creation', () => {
  test('setTaskDate returns a new task with the new date, id unchanged', () => {
    const task = createTask({ text: 'Dentist', date: '2026-10-05' });
    const moved = setTaskDate(task, '2026-10-12');
    assert.equal(moved.date, '2026-10-12');
    assert.equal(moved.id, task.id);
  });
});

describe('C26 (data-layer half): clearing a date converts a task back to general', () => {
  test('clearTaskDate removes the date field', () => {
    const task = createTask({ text: 'Dentist', date: '2026-10-05' });
    const cleared = clearTaskDate(task);
    assert.ok(cleared.date === null || cleared.date === undefined);
  });
});

describe('C27 + C28: a series\' rule can be edited, affecting only occurrences dated today or later', () => {
  test('editing the range only adds/removes occurrences today or later; past occurrences and their done state are untouched', () => {
    const created = createSeries({
      text: 'Ler',
      weekdays: [1, 2],
      startDate: '2026-08-03',
      endDate: '2026-08-16',
    });
    const doneOccurrence = toggleOccurrenceDone(created.occurrences[0]); // 2026-08-03, now done
    const occurrencesWithProgress = [
      doneOccurrence,
      ...created.occurrences.slice(1),
    ];

    const today = '2026-08-10'; // the 2nd Monday — occurrences before this are "past"
    const result = updateSeriesRule(
      created.series,
      occurrencesWithProgress,
      { weekdays: [1, 2], startDate: '2026-08-03', endDate: '2026-08-23' },
      today,
    );

    const past = result.occurrences.filter((o) => o.date < today);
    assert.deepEqual(
      past.map((o) => o.date),
      ['2026-08-03', '2026-08-04'],
    );
    assert.equal(past.find((o) => o.date === '2026-08-03').done, true);

    const future = result.occurrences.filter((o) => o.date >= today);
    assert.deepEqual(future.map((o) => o.date), [
      '2026-08-10',
      '2026-08-11',
      '2026-08-17',
      '2026-08-18',
    ]);
  });

  test('shortening the range removes only future occurrences beyond the new end date', () => {
    const created = createSeries({
      text: 'Ler',
      weekdays: [1],
      startDate: '2026-08-03',
      endDate: '2026-08-31',
    });
    const today = '2026-08-10';
    const result = updateSeriesRule(
      created.series,
      created.occurrences,
      { weekdays: [1], startDate: '2026-08-03', endDate: '2026-08-17' },
      today,
    );
    assert.deepEqual(
      result.occurrences.map((o) => o.date),
      ['2026-08-03', '2026-08-10', '2026-08-17'],
    );
  });
});
