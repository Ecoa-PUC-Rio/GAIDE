// DOM rendering + interaction wiring for the general (urgency-sorted) task
// list. Carved out of app.js (Task 10, module split) with no behavior
// change — data/storage logic lives in data.js, app.js is just the entry
// point. calendar/Scheduled-list/day-detail/reminder rendering are added
// here by later tasks (11+), not part of this split.

import { loadTasks, saveTasks, deleteTask, toggleDone, setUrgency, sortTasks } from './data.js';

// --- Storage-failure UX ----------------------------------------------------
// Constitution Principle 8: a failed write must be visible, never silent.
// Every mutation funnels through here instead of calling saveTasks directly.
export function persistTasks(doc, storage, tasks) {
  const banner = doc.querySelector('[data-testid="storage-error"]');
  const result = saveTasks(storage, tasks);
  banner.hidden = result.ok;
  if (!result.ok) banner.textContent = "Couldn't save your changes. Please try again.";
  return result;
}

// --- Rendering ---------------------------------------------------------
// Shapes, not just color, distinguish urgency (colorblind-accessible per the
// spec review); CSS layers color on top via .urgency-{level} on the row.
const URGENCY_ICON = { red: '▲', yellow: '■', green: '●' };
// No color name in the label — the color/icon already shows it visually,
// repeating it in text would be redundant.
const URGENCY_LABEL = { red: 'Urgent', yellow: 'Medium', green: 'Chill' };

function updateTask(doc, storage, id, updater) {
  const tasks = loadTasks(storage).map((t) => (t.id === id ? updater(t) : t));
  persistTasks(doc, storage, tasks);
  return tasks;
}

// One small builder per concern (code review finding, base app Task 15 —
// this used to be one large function). Each returns the element it builds
// and wires its own listeners; renderTaskRow just assembles them.

function buildDoneCheckbox(doc, storage, task, row) {
  const wrap = doc.createElement('span');
  wrap.className = 'task-done';
  const checkbox = doc.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = task.done;
  checkbox.setAttribute('aria-label', 'Mark done');
  // Updates this row in place rather than going through renderTaskList: done
  // never changes sort position, and interactions.test.js holds a reference
  // to this exact <li> across the click, so it must not be replaced.
  checkbox.addEventListener('click', () => {
    updateTask(doc, storage, task.id, toggleDone);
    row.classList.toggle('done', checkbox.checked);
  });
  wrap.appendChild(checkbox);
  return wrap;
}

function buildUrgencyIcon(doc, task) {
  const icon = doc.createElement('span');
  icon.className = 'urgency-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = URGENCY_ICON[task.urgency] ?? URGENCY_ICON.green;
  return icon;
}

function buildUrgencyPicker(doc, storage, task) {
  const picker = doc.createElement('select');
  picker.className = 'urgency-picker';
  picker.dataset.testid = 'urgency-picker';
  picker.setAttribute('aria-label', 'Change urgency');
  for (const level of ['red', 'yellow', 'green']) {
    const option = doc.createElement('option');
    option.value = level;
    option.textContent = URGENCY_LABEL[level];
    picker.appendChild(option);
  }
  picker.value = task.urgency;
  // Urgency changes sort position, so this goes through a full re-render
  // (unlike the done-toggle above); interactions.test.js re-queries the DOM
  // afterwards rather than holding a stale row reference across this one.
  picker.addEventListener('change', () => {
    const tasks = updateTask(doc, storage, task.id, (t) => setUrgency(t, picker.value));
    renderTaskList(doc, storage, tasks);
  });
  return picker;
}

function buildTaskText(doc, task) {
  const text = doc.createElement('span');
  text.className = 'task-text';
  text.textContent = task.text;
  return text;
}

// Returns null (not an element) when there's no description, so a plain
// task never renders a dead expand control (C25) — renderTaskRow only
// appends it when non-null.
function buildDescription(doc, task) {
  if (!task.description) return null;
  const description = doc.createElement('div');
  description.className = 'description';
  description.dataset.testid = 'description';
  description.hidden = true;
  description.textContent = task.description;
  return description;
}

// Ignore clicks that originate on an interactive control (checkbox, urgency
// picker, delete button) — only a tap on the row's own surface toggles the
// description. A task without one has nothing to toggle. If the delete
// control is currently revealed, a tap elsewhere on the row dismisses it
// instead of also toggling the description — otherwise there'd be no way
// to put it away short of a full reverse swipe.
function attachRowClickHandler(row) {
  row.addEventListener('click', (event) => {
    if (event.target.closest('input, select, button')) return;

    const deleteControl = row.querySelector('[data-testid="delete-control"]');
    if (deleteControl) {
      deleteControl.remove();
      return;
    }

    const description = row.querySelector('[data-testid="description"]');
    if (!description) return;
    description.hidden = !description.hidden;
  });
}

function renderTaskRow(doc, storage, task) {
  const row = doc.createElement('li');
  row.dataset.testid = 'task';
  row.dataset.taskId = task.id;
  row.className = `task urgency-${task.urgency}${task.done ? ' done' : ''}`;

  row.appendChild(buildDoneCheckbox(doc, storage, task, row));
  row.appendChild(buildUrgencyIcon(doc, task));
  row.appendChild(buildUrgencyPicker(doc, storage, task));
  row.appendChild(buildTaskText(doc, task));

  const description = buildDescription(doc, task);
  if (description) row.appendChild(description);

  attachSwipeToDelete(doc, storage, task, row);
  attachRowClickHandler(row);

  return row;
}

// --- Swipe-to-delete ---------------------------------------------------
const SWIPE_REVEAL_THRESHOLD = 40; // px of leftward drag before the delete control appears

// Real touch events carry event.touches; the DOM has no TouchEvent
// constructor in jsdom, so tests simulate touches via a CustomEvent with
// { detail: { touches } } instead — this reads either shape, so the same
// handler works against a real iPhone and against the test suite.
function touchX(event) {
  const touch = event.touches ? event.touches[0] : event.detail?.touches?.[0];
  return touch ? touch.clientX : null;
}

function createDeleteControl(doc, storage, task, row) {
  const deleteControl = doc.createElement('button');
  deleteControl.type = 'button';
  deleteControl.className = 'delete-control';
  deleteControl.dataset.testid = 'delete-control';
  deleteControl.setAttribute('aria-label', 'Delete task');
  deleteControl.textContent = 'Delete';
  deleteControl.addEventListener('click', () => {
    const tasks = deleteTask(loadTasks(storage), task.id);
    persistTasks(doc, storage, tasks);
    renderTaskList(doc, storage, tasks);
  });
  return deleteControl;
}

function attachSwipeToDelete(doc, storage, task, row) {
  let startX = null;

  row.addEventListener('touchstart', (event) => {
    startX = touchX(event);
  });

  row.addEventListener('touchmove', (event) => {
    if (startX === null) return;
    const currentX = touchX(event);
    if (currentX === null) return;

    // Synced continuously to the current drag, not just "reveal once and
    // never again" — swiping back right past the threshold within the same
    // gesture hides it, matching the standard swipe-to-delete pattern.
    const shouldReveal = startX - currentX >= SWIPE_REVEAL_THRESHOLD;
    const existing = row.querySelector('[data-testid="delete-control"]');
    if (shouldReveal && !existing) {
      row.appendChild(createDeleteControl(doc, storage, task, row));
    } else if (!shouldReveal && existing) {
      existing.remove();
    }
  });

  row.addEventListener('touchend', () => {
    startX = null;
  });
}

export function renderTaskList(doc, storage, tasks) {
  const list = doc.querySelector('[data-testid="task-list"]');
  list.replaceChildren(...sortTasks(tasks).map((task) => renderTaskRow(doc, storage, task)));
}
