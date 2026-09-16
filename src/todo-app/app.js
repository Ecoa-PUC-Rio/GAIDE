// Entry point. No top-level window/document reference — must be importable
// in plain Node (tests import initApp without a DOM present at module-eval
// time). All data/storage logic lives in data.js, all DOM rendering in
// render.js/calendar.js — this file only wires them together (Task 10,
// module split; data.js/render.js do the work app.js used to do directly).

import { createTask, loadTasks } from './data.js';
import { renderTaskList, persistTasks } from './render.js';

// --- Create-task form -----------------------------------------------------

function handleCreateSubmit(event, doc, storage) {
  event.preventDefault();
  const form = event.currentTarget;

  const task = createTask({
    text: form.querySelector('[data-testid="new-task-text"]').value,
    description: form.querySelector('[data-testid="new-task-description"]').value,
    urgency: form.querySelector('[data-testid="new-task-urgency"]').value,
  });
  if (!task) return; // empty/whitespace-only text (C3) — no-op, nothing to save or render

  const tasks = [...loadTasks(storage), task];
  persistTasks(doc, storage, tasks);
  renderTaskList(doc, storage, tasks);
  form.reset();
}

export function initApp(doc, storage) {
  renderTaskList(doc, storage, loadTasks(storage));

  doc
    .querySelector('[data-testid="new-task-form"]')
    .addEventListener('submit', (event) => handleCreateSubmit(event, doc, storage));
}

if (typeof document !== 'undefined' && typeof localStorage !== 'undefined') {
  initApp(document, localStorage);

  // jsdom (this project's test DOM) has no Service Worker API at all, so
  // 'serviceWorker' in navigator is false there — this is a safe no-op
  // under tests, and only registers on an actual browser.
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
}
