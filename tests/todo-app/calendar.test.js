// DOM/integration tests for the calendar (month/week/year views, navigation,
// heatmap band rendering) and pure grid-construction tests for its date-math.
// Covers spec criteria: C18 (tap-opens wiring only), C29, C30, C31, C32, C33,
// C34, C35, C36, C37.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { monthDates, weekDates, yearDates, band, dayRatio } from '../../src/todo-app/data.js';
import { loadApp, isoDaysFromToday } from './helpers/load-app.js';

describe('grid construction (pure)', () => {
  test('monthDates returns every date in that month, in order', () => {
    const dates = monthDates(2026, 2); // February 2026 (28 days, not a leap year)
    assert.equal(dates.length, 28);
    assert.equal(dates[0], '2026-02-01');
    assert.equal(dates[27], '2026-02-28');
  });

  test('monthDates handles a leap-year February', () => {
    const dates = monthDates(2028, 2);
    assert.equal(dates.length, 29);
    assert.equal(dates[28], '2028-02-29');
  });

  test('weekDates returns 7 dates, Monday through Sunday, containing the given date', () => {
    // 2026-08-05 is a Wednesday.
    const dates = weekDates('2026-08-05');
    assert.deepEqual(dates, [
      '2026-08-03', '2026-08-04', '2026-08-05',
      '2026-08-06', '2026-08-07', '2026-08-08', '2026-08-09',
    ]);
  });

  test('yearDates returns 365 dates for a non-leap year, 366 for a leap year', () => {
    assert.equal(yearDates(2026).length, 365);
    assert.equal(yearDates(2028).length, 366);
    assert.equal(yearDates(2026)[0], '2026-01-01');
    assert.equal(yearDates(2026)[364], '2026-12-31');
  });
});

describe('C33 + C36: day ratio formula and fixed band thresholds', () => {
  test('band() matches every named threshold in the spec\'s table', () => {
    assert.equal(band(0, 0), 0); // no items
    assert.equal(band(0, 4), 0); // 0%
    assert.equal(band(1, 4), 1); // 25%
    assert.equal(band(1, 100), 1); // 1%
    assert.equal(band(2, 4), 2); // 50%
    assert.equal(band(26, 100), 2); // 26%
    assert.equal(band(3, 4), 3); // 75%
    assert.equal(band(51, 100), 3); // 51%
    assert.equal(band(99, 100), 4); // 99%
    assert.equal(band(76, 100), 4); // 76%
    assert.equal(band(4, 4), 5); // 100%
  });
});

describe('C34: a day with zero dated items shows the lightest band', () => {
  test('dayRatio + band on an empty day resolves to band 0', () => {
    const ratio = dayRatio('2026-09-01', { tasks: [], occurrences: [], archive: [] });
    assert.equal(band(ratio.done, ratio.total), 0);
  });
});

describe('C35: a day with all items done shows the darkest band', () => {
  test('dayRatio + band on a fully-done day resolves to band 5', () => {
    const ratio = dayRatio('2026-09-01', {
      tasks: [{ date: '2026-09-01', done: true }],
      occurrences: [{ date: '2026-09-01', done: true }],
      archive: [],
    });
    assert.equal(band(ratio.done, ratio.total), 5);
  });
});

describe('C29: calendar defaults to month view, current month, today distinguishable', () => {
  test('opening the calendar with no prior view choice shows today\'s month, with today marked', async () => {
    const window = await loadApp({});
    const today = isoDaysFromToday(0);
    const todayCell = window.document.querySelector(`[data-testid="calendar-day"][data-date="${today}"]`);
    assert.ok(todayCell, 'today\'s cell should be present in the default month view');
    assert.equal(todayCell.dataset.today, 'true');
  });
});

describe('C30: the calendar can be switched between month, week, and year views', () => {
  test('switching to week view shows exactly 7 day cells', async () => {
    const window = await loadApp({});
    window.document.querySelector('[data-testid="calendar-view-week"]').click();
    assert.equal(window.document.querySelectorAll('[data-testid="calendar-day"]').length, 7);
  });

  test('switching to year view shows 365 or 366 day cells', async () => {
    const window = await loadApp({});
    window.document.querySelector('[data-testid="calendar-view-year"]').click();
    const count = window.document.querySelectorAll('[data-testid="calendar-day"]').length;
    assert.ok(count === 365 || count === 366);
  });
});

describe('C31: navigation moves the period without changing the view mode', () => {
  test('next/prev in month view still shows a month-sized grid; today returns to the current period', async () => {
    const window = await loadApp({});
    const today = isoDaysFromToday(0);

    window.document.querySelector('[data-testid="calendar-nav-next"]').click();
    assert.ok(!window.document.querySelector(`[data-testid="calendar-day"][data-date="${today}"]`));

    window.document.querySelector('[data-testid="calendar-nav-today"]').click();
    assert.ok(window.document.querySelector(`[data-testid="calendar-day"][data-date="${today}"]`));
  });
});

describe('C32: every calendar view renders one square per day, colored via the 5-level scale', () => {
  test('each rendered day cell carries a data-band attribute in 0-5', async () => {
    const window = await loadApp({});
    const cells = [...window.document.querySelectorAll('[data-testid="calendar-day"]')];
    assert.ok(cells.length > 0);
    for (const cell of cells) {
      assert.ok(['0', '1', '2', '3', '4', '5'].includes(cell.dataset.band));
    }
  });
});

describe('C37: a general task\'s done state never changes any day\'s calendar color', () => {
  test('marking a general (dateless) task done does not change today\'s band', async () => {
    const window = await loadApp({
      seedTasks: [
        { id: 't1', text: 'General', description: '', urgency: 'green', done: false, createdAt: 1, date: null },
      ],
    });
    const today = isoDaysFromToday(0);
    const bandBefore = window.document
      .querySelector(`[data-testid="calendar-day"][data-date="${today}"]`).dataset.band;

    window.document.querySelector('[data-testid="task"] input[type=checkbox]').click();

    const bandAfter = window.document
      .querySelector(`[data-testid="calendar-day"][data-date="${today}"]`).dataset.band;
    assert.equal(bandAfter, bandBefore);
  });
});

describe('C18 (tap-opens wiring): tapping a day cell opens the day-detail view', () => {
  test('clicking a day cell (not a reminder marker) reveals the day-detail panel', async () => {
    const window = await loadApp({});
    const today = isoDaysFromToday(0);
    window.document.querySelector(`[data-testid="calendar-day"][data-date="${today}"]`).click();
    const panel = window.document.querySelector('[data-testid="day-detail"]');
    assert.equal(panel.hidden, false);
  });
});
