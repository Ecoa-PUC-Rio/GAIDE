import { JSDOM } from 'jsdom';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const APP_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../src/todo-app',
);
const APP_MODULE_URL = pathToFileURL(path.join(APP_DIR, 'app.js')).href;

export const STORAGE_KEY = 'gaide-todo-tasks';
// Mirrors src/todo-app/data.js's storage-key constants as literals (not an
// import) — data.js doesn't exist until Task 3, and this helper must keep
// working for the base app's already-green tests in the meantime.
export const SERIES_STORAGE_KEY = 'gaide-todo-series';
export const OCCURRENCE_STORAGE_KEY = 'gaide-todo-occurrences';
export const ARCHIVE_STORAGE_KEY = 'gaide-todo-archive';
export const REMINDER_STORAGE_KEY = 'gaide-todo-reminders';

/**
 * Loads the real src/todo-app/index.html into jsdom, optionally pre-seeding
 * localStorage, then runs the real app.js against it and returns the window.
 *
 * jsdom never executes <script type="module"> (even with runScripts:
 * "dangerously" — a known, long-standing jsdom limitation; real Safari has
 * no such restriction), so instead of relying on the browser to run the
 * module script referenced from index.html, we import app.js ourselves and
 * call its initApp(document, storage) entry point directly — exactly what
 * app.js's own bottom-of-file guard does when a real browser runs it.
 *
 * Throws (expected, pre-implementation) until Task 4 creates index.html /
 * Task 3 creates app.js's initApp export.
 */
export async function loadApp({
  seedTasks,
  seedSeries,
  seedOccurrences,
  seedArchive,
  seedReminders,
} = {}) {
  const dom = await JSDOM.fromFile(path.join(APP_DIR, 'index.html'), {
    // A concrete http(s) origin is required for localStorage — file:// URLs
    // are opaque origins in jsdom and have no Storage API at all. The host
    // doesn't need to resolve — nothing here makes a real network fetch.
    url: 'https://gaide-todo-app.invalid/',
    resources: 'usable',
    pretendToBeVisual: true,
  });
  const { window } = dom;

  await new Promise((resolve) => {
    if (window.document.readyState === 'complete') resolve();
    else window.addEventListener('load', resolve);
  });

  const seed = (key, value) => {
    if (value !== undefined) window.localStorage.setItem(key, JSON.stringify(value));
  };
  seed(STORAGE_KEY, seedTasks);
  seed(SERIES_STORAGE_KEY, seedSeries);
  seed(OCCURRENCE_STORAGE_KEY, seedOccurrences);
  seed(ARCHIVE_STORAGE_KEY, seedArchive);
  seed(REMINDER_STORAGE_KEY, seedReminders);

  const { initApp } = await import(APP_MODULE_URL);
  initApp(window.document, window.localStorage);

  return window;
}

/**
 * jsdom's HTMLFormElement.requestSubmit() is an unimplemented stub — it logs
 * a warning and never fires the "submit" event, unlike a real browser. This
 * dispatches the same event a real form submission would, which any
 * addEventListener('submit', ...) handler in app.js will actually receive.
 */
export function submitForm(form) {
  const win = form.ownerDocument.defaultView;
  form.dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));
}

export function inMemoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

/**
 * The app itself has no clock-injection mechanism (matching the base app,
 * which has none either) — anything date-relative ("today", "overdue") runs
 * against the real system clock inside app.js/data.js, in the same Node
 * process as the tests. Rather than hardcode fixed calendar dates for
 * "today"-relative assertions (which would silently rot the day this suite
 * is run on a different date than it was written), tests compute an offset
 * from the real `Date` at run time and stay correct on any day.
 */
export function isoDaysFromToday(offsetDays) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function throwingStorage() {
  return {
    getItem: () => null,
    setItem: () => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    },
    removeItem: () => {},
  };
}
