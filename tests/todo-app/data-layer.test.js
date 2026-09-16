// Pure logic tests — no DOM. Imports src/todo-app/data.js directly in Node.
// Covers spec criteria: C1, C3, C13, C14, C15, C18, C19, C21.
// (Moved from app.js to data.js in the module-split refactor —
// specs/task-calendar/tasks.md Task 10 — same functions, same behavior.)
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTask,
  sortTasks,
  toggleDone,
  setUrgency,
  deleteTask,
} from '../../src/todo-app/data.js';
import { inMemoryStorage, throwingStorage } from './helpers/load-app.js';

describe('C1: create a task from text', () => {
  test('given/when: text is submitted / then: a not-done task is created', () => {
    const task = createTask({ text: 'Buy milk' });
    assert.equal(task.text, 'Buy milk');
    assert.equal(task.done, false);
    assert.ok(task.id);
  });
});

describe('C3: empty or whitespace-only text is rejected', () => {
  test('empty string produces no task', () => {
    assert.equal(createTask({ text: '' }), null);
  });

  test('whitespace-only string produces no task', () => {
    assert.equal(createTask({ text: '   \n\t  ' }), null);
  });
});

describe('C13: urgency can be assigned at creation', () => {
  test('given/when: urgency "red" is chosen / then: the task carries it', () => {
    const task = createTask({ text: 'Fix outage', urgency: 'red' });
    assert.equal(task.urgency, 'red');
  });
});

describe('C14: default urgency is green (chill)', () => {
  test('no urgency provided defaults to green', () => {
    const task = createTask({ text: 'Someday' });
    assert.equal(task.urgency, 'green');
  });
});

describe('C15: urgency can change after creation', () => {
  test('setUrgency returns a task with the new urgency, id unchanged', () => {
    const task = createTask({ text: 'Reprioritize', urgency: 'green' });
    const updated = setUrgency(task, 'red');
    assert.equal(updated.urgency, 'red');
    assert.equal(updated.id, task.id);
  });
});

describe('C18 + C19: sort order — urgency rank, then stable creation order', () => {
  test('red before yellow before green', () => {
    const green = createTask({ text: 'g', urgency: 'green' });
    const red = createTask({ text: 'r', urgency: 'red' });
    const yellow = createTask({ text: 'y', urgency: 'yellow' });
    const sorted = sortTasks([green, red, yellow]);
    assert.deepEqual(
      sorted.map((t) => t.urgency),
      ['red', 'yellow', 'green'],
    );
  });

  test('same-urgency tasks keep their relative creation order (stable tie-break)', () => {
    const first = { ...createTask({ text: 'first', urgency: 'yellow' }), createdAt: 1 };
    const second = { ...createTask({ text: 'second', urgency: 'yellow' }), createdAt: 2 };
    const third = { ...createTask({ text: 'third', urgency: 'yellow' }), createdAt: 3 };
    const sorted = sortTasks([third, first, second]);
    assert.deepEqual(
      sorted.map((t) => t.text),
      ['first', 'second', 'third'],
    );
  });
});

describe('C21: description is optional at creation', () => {
  test('no description provided is fine, defaults to empty', () => {
    const task = createTask({ text: 'No details needed' });
    assert.equal(task.description, '');
  });

  test('a provided description is kept', () => {
    const task = createTask({ text: 'Groceries', description: 'Milk, eggs, bread' });
    assert.equal(task.description, 'Milk, eggs, bread');
  });
});

describe('toggleDone / deleteTask — supporting logic for C4, C5, C10, C11', () => {
  test('toggleDone flips done both ways', () => {
    const task = createTask({ text: 'x' });
    const done = toggleDone(task);
    assert.equal(done.done, true);
    const undone = toggleDone(done);
    assert.equal(undone.done, false);
  });

  test('deleteTask removes only the matching task by id', () => {
    const a = createTask({ text: 'a' });
    const b = createTask({ text: 'b' });
    const remaining = deleteTask([a, b], a.id);
    assert.deepEqual(
      remaining.map((t) => t.id),
      [b.id],
    );
  });
});

describe('Constitution Principle 8: storage failures fail visibly, not silently', () => {
  test('a normal storage round-trips a saved task list', async () => {
    const { saveTasks, loadTasks } = await import('../../src/todo-app/data.js');
    const storage = inMemoryStorage();
    const task = createTask({ text: 'persisted' });
    const result = saveTasks(storage, [task]);
    assert.equal(result.ok, true);
    assert.deepEqual(loadTasks(storage).map((t) => t.text), ['persisted']);
  });

  test('a failing storage.setItem is caught, not thrown, and reported as not ok', async () => {
    const { saveTasks } = await import('../../src/todo-app/data.js');
    const storage = throwingStorage();
    const task = createTask({ text: 'will not persist' });
    const result = saveTasks(storage, [task]);
    assert.equal(result.ok, false);
  });
});
