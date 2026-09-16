// Pure data layer: storage + date-math + domain logic for dates, recurrence,
// archiving, and reminders (specs/task-calendar/spec.md). No top-level
// window/document reference — must be importable in plain Node so
// tests/todo-app/{recurrence,archive,calendar,scheduled-list,...}.test.js can
// run it without a DOM, matching app.js's existing convention.
//
// Deliberately duplicates (for now) createTask/sortTasks/toggleDone/
// setUrgency/deleteTask/loadTasks/saveTasks from app.js, extended with the
// optional `date` field — Task 10 (module split) removes app.js's copies and
// has it import from here instead, so the app has one implementation, not
// two. Kept separate until then so this file can be built and tested in
// isolation without touching the working base app (tasks.md Tasks 3-9).

export const TASK_STORAGE_KEY = 'gaide-todo-tasks';
export const SERIES_STORAGE_KEY = 'gaide-todo-series';
export const OCCURRENCE_STORAGE_KEY = 'gaide-todo-occurrences';
export const ARCHIVE_STORAGE_KEY = 'gaide-todo-archive';
export const REMINDER_STORAGE_KEY = 'gaide-todo-reminders';

// ADR 0005: a hard cap on how many occurrences one recurrence rule can
// generate, enforced as a validation error rather than left unbounded.
const MAX_OCCURRENCES = 730;

// --- Date-math (Task 3) -----------------------------------------------------
// Canonical 'YYYY-MM-DD' strings everywhere a date is stored or compared
// (plan.md's architectural decision) — Date is only used to render/parse one
// point at a time, never for arithmetic directly on a stored value, which is
// the usual source of timezone/DST off-by-one bugs.

export function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseISODate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day); // local midnight, not UTC — sidesteps DST-shift-by-a-day
}

export function addDays(isoDate, count) {
  const date = parseISODate(isoDate);
  date.setDate(date.getDate() + count);
  return toISODate(date);
}

export function weekdayOf(isoDate) {
  return parseISODate(isoDate).getDay(); // 0 = Sunday ... 6 = Saturday
}

export function monthDates(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const dates = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    dates.push(toISODate(new Date(year, month - 1, day)));
  }
  return dates;
}

// Week view starts Monday (ISO 8601 convention) — spec leaves the exact day
// to implementation (tests/todo-app/README.md), this is that concrete choice.
export function weekDates(isoDate) {
  const weekday = weekdayOf(isoDate);
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const monday = addDays(isoDate, mondayOffset);
  const dates = [];
  for (let i = 0; i < 7; i += 1) dates.push(addDays(monday, i));
  return dates;
}

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function yearDates(year) {
  const totalDays = isLeapYear(year) ? 366 : 365;
  const dates = [];
  let current = `${year}-01-01`;
  for (let i = 0; i < totalDays; i += 1) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}

// --- Heatmap: band + ratio (Task 4) -----------------------------------------

export function band(done, total) {
  if (total === 0) return 0;
  const percent = (done / total) * 100;
  if (percent === 0) return 0;
  if (percent <= 25) return 1;
  if (percent <= 50) return 2;
  if (percent <= 75) return 3;
  if (percent < 100) return 4;
  return 5;
}

// Merges still-existing dated tasks/occurrences with archived records for the
// same date — archiving an item never changes its day's ratio, since this
// counts both alike (spec's C17).
export function dayRatio(date, { tasks = [], occurrences = [], archive = [] } = {}) {
  let done = 0;
  let total = 0;
  for (const item of [...tasks, ...occurrences, ...archive]) {
    if (item.date !== date) continue;
    total += 1;
    if (item.done) done += 1;
  }
  return { done, total };
}

// --- Tasks, extended with an optional `date` (Task 5) -----------------------

const URGENCY_RANK = { red: 0, yellow: 1, green: 2 };

export function createTask({ text, description = '', urgency = 'green', date = null } = {}) {
  const trimmedText = typeof text === 'string' ? text.trim() : '';
  if (!trimmedText) return null;

  return {
    id: crypto.randomUUID(),
    text: trimmedText,
    description,
    urgency: urgency || 'green',
    done: false,
    createdAt: Date.now(),
    date: date || null, // null = general task; an ISO date = single-dated
  };
}

export function setTaskDate(task, date) {
  return { ...task, date };
}

export function clearTaskDate(task) {
  return { ...task, date: null };
}

export function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const rankDiff = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
    return rankDiff !== 0 ? rankDiff : a.createdAt - b.createdAt;
  });
}

export function toggleDone(task) {
  return { ...task, done: !task.done };
}

export function setUrgency(task, urgency) {
  return { ...task, urgency };
}

export function deleteTask(tasks, id) {
  return tasks.filter((task) => task.id !== id);
}

function loadJSONArray(storage, key) {
  const raw = storage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveJSONArray(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

export function loadTasks(storage) {
  return loadJSONArray(storage, TASK_STORAGE_KEY);
}

export function saveTasks(storage, tasks) {
  return saveJSONArray(storage, TASK_STORAGE_KEY, tasks);
}

// --- Series and occurrences (Task 6) ----------------------------------------

export function loadSeries(storage) {
  return loadJSONArray(storage, SERIES_STORAGE_KEY);
}

export function saveSeries(storage, series) {
  return saveJSONArray(storage, SERIES_STORAGE_KEY, series);
}

export function loadOccurrences(storage) {
  return loadJSONArray(storage, OCCURRENCE_STORAGE_KEY);
}

export function saveOccurrences(storage, occurrences) {
  return saveJSONArray(storage, OCCURRENCE_STORAGE_KEY, occurrences);
}

export function toggleOccurrenceDone(occurrence) {
  return { ...occurrence, done: !occurrence.done };
}

// --- Occurrence generation and rule editing (Task 7) ------------------------

export function generateOccurrences({ weekdays, startDate, endDate }) {
  if (endDate < startDate) return { error: 'invalid-range' };

  const weekdaySet = new Set(weekdays);
  const dates = [];
  let current = startDate;
  while (current <= endDate) {
    if (weekdaySet.has(weekdayOf(current))) {
      dates.push(current);
      if (dates.length > MAX_OCCURRENCES) return { error: 'too-many-occurrences' };
    }
    current = addDays(current, 1);
  }
  return dates;
}

export function createSeries({ text, description = '', urgency = 'green', weekdays, startDate, endDate }) {
  const trimmedText = typeof text === 'string' ? text.trim() : '';
  if (!trimmedText) return { error: 'empty-text' };

  const occurrenceDates = generateOccurrences({ weekdays, startDate, endDate });
  if (!Array.isArray(occurrenceDates)) return { error: occurrenceDates.error };

  const series = {
    id: crypto.randomUUID(),
    text: trimmedText,
    description,
    urgency: urgency || 'green',
    weekdays,
    startDate,
    endDate,
    createdAt: Date.now(),
  };

  const occurrences = occurrenceDates.map((date) => ({
    id: crypto.randomUUID(),
    seriesId: series.id,
    date,
    done: false,
  }));

  return { series, occurrences };
}

// Occurrences dated before `today` are returned untouched (their date and
// done state are never rewritten by a later rule edit); occurrences dated
// today or later are reconciled against `newRule`, reusing an existing
// occurrence's id/done-state where one already exists on the matching date.
export function updateSeriesRule(series, occurrences, newRule, today) {
  const past = occurrences.filter((occurrence) => occurrence.date < today);

  const regenerated = generateOccurrences({
    weekdays: newRule.weekdays,
    startDate: today > newRule.startDate ? today : newRule.startDate,
    endDate: newRule.endDate,
  });
  const futureDates = Array.isArray(regenerated) ? regenerated.filter((date) => date >= today) : [];

  const future = futureDates.map((date) => {
    const existing = occurrences.find((o) => o.seriesId === series.id && o.date === date);
    return existing ?? { id: crypto.randomUUID(), seriesId: series.id, date, done: false };
  });

  return {
    series: { ...series, weekdays: newRule.weekdays, startDate: newRule.startDate, endDate: newRule.endDate },
    occurrences: [...past, ...future],
  };
}

// --- Archive (Task 8) --------------------------------------------------------

export function isOverdue({ date, done }, today) {
  return date < today && !done;
}

// Pure decision, not persistence: done-or-overdue -> archive (keeping only
// text/date/done, per ADR 0005); anything else -> erase with no trace, since
// there is no outcome yet to preserve.
export function resolveDelete({ date, text, done }, today) {
  if (done || isOverdue({ date, done }, today)) {
    return { archive: { date, text, done } };
  }
  return { erase: true };
}

export function loadArchive(storage) {
  return loadJSONArray(storage, ARCHIVE_STORAGE_KEY);
}

export function saveArchive(storage, records) {
  return saveJSONArray(storage, ARCHIVE_STORAGE_KEY, records);
}

export function appendArchiveRecord(storage, record) {
  const records = loadArchive(storage);
  const fullRecord = { id: crypto.randomUUID(), archivedAt: Date.now(), ...record };
  const result = saveArchive(storage, [...records, fullRecord]);
  return result.ok ? { ok: true, record: fullRecord } : result;
}

// --- Reminders (Task 9) ------------------------------------------------------

export function createReminder({ text, color, date }, existingReminders = []) {
  const trimmedText = typeof text === 'string' ? text.trim() : '';
  if (!trimmedText) return { error: 'empty-text' };
  if (existingReminders.some((reminder) => reminder.date === date)) {
    return { error: 'date-occupied' };
  }
  return {
    id: crypto.randomUUID(),
    text: trimmedText,
    color: color || 'green',
    date,
    createdAt: Date.now(),
  };
}

export function updateReminder(reminder, changes, existingReminders = []) {
  const nextDate = changes.date ?? reminder.date;
  const collides = existingReminders.some((r) => r.id !== reminder.id && r.date === nextDate);
  if (nextDate !== reminder.date && collides) return { error: 'date-occupied' };
  return { ...reminder, ...changes, date: nextDate };
}

export function deleteReminder(reminders, id) {
  return reminders.filter((reminder) => reminder.id !== id);
}

export function loadReminders(storage) {
  return loadJSONArray(storage, REMINDER_STORAGE_KEY);
}

export function saveReminders(storage, reminders) {
  return saveJSONArray(storage, REMINDER_STORAGE_KEY, reminders);
}
