// Calendar grid assembly: combines data.js's date-math with heatmap
// ratio/band and reminder lookups into render-ready cell objects. Pure — no
// DOM. render.js paints what this module builds.

import { monthDates, weekDates, yearDates, band, dayRatio, addDays } from './data.js';

function buildCell(date, today, stores, reminders) {
  const ratio = dayRatio(date, stores);
  return {
    date,
    isToday: date === today,
    band: band(ratio.done, ratio.total),
    reminder: reminders.find((r) => r.date === date) || null,
  };
}

export function buildGrid(view, referenceDate, today, stores, reminders = []) {
  let dates;
  if (view === 'week') {
    dates = weekDates(referenceDate);
  } else if (view === 'year') {
    dates = yearDates(Number(referenceDate.slice(0, 4)));
  } else {
    const [year, month] = referenceDate.split('-').map(Number);
    dates = monthDates(year, month);
  }
  return dates.map((date) => buildCell(date, today, stores, reminders));
}

function firstOfMonth(isoDate) {
  return `${isoDate.slice(0, 7)}-01`;
}

function firstOfYear(isoDate) {
  return `${isoDate.slice(0, 4)}-01-01`;
}

export function shiftPeriod(referenceDate, view, direction) {
  if (view === 'week') return addDays(referenceDate, 7 * direction);
  if (view === 'year') {
    const year = Number(referenceDate.slice(0, 4)) + direction;
    return `${year}-01-01`;
  }
  // month
  const [year, month] = referenceDate.split('-').map(Number);
  const total = (year * 12 + (month - 1)) + direction;
  const nextYear = Math.floor(total / 12);
  const nextMonth = (total % 12) + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
}

// Normalizes "today" onto a representative reference date for a given view
// (month -> 1st of this month, year -> Jan 1, week -> today itself, since
// weekDates() derives the containing week from any date in it).
export function referenceDateForToday(view, today) {
  if (view === 'month') return firstOfMonth(today);
  if (view === 'year') return firstOfYear(today);
  return today;
}
