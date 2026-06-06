/**
 * Integration tests for app.js DOMContentLoaded wiring: button handlers,
 * drag-and-drop status changes, and click delegation (edit/delete).
 *
 * The module is required once and DOMContentLoaded dispatched once, so event
 * listeners are attached a single time and don't accumulate across tests.
 */

const FULL_DOM = `
  <input id="title" />
  <input id="description" />
  <button id="createBtn"></button>
  <div class="boards">
    <ul id="tasks-pending"></ul>
    <ul id="tasks-in_progress"></ul>
    <ul id="tasks-done"></ul>
  </div>
  <input id="fetchName" />
  <button id="fetchBtn"></button>
  <div id="searchResults"></div>
  <div id="editModal" class="hidden">
    <input id="editTitle" />
    <input id="editDescription" />
    <button id="saveEditBtn"></button>
    <button id="cancelEditBtn"></button>
    <button id="closeModalBtn"></button>
  </div>
`;

const okJson = (data) => ({ ok: true, status: 200, json: async () => data });

// One task so listTasks() renders a draggable <li> we can act on.
const SAMPLE = [{ id: 42, title: 'Sample', description: 'd', status: 'pending' }];

function fire(type, target, dataTransfer = {}, relatedTarget = null) {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  ev.dataTransfer = dataTransfer;
  Object.defineProperty(ev, 'relatedTarget', { value: relatedTarget, configurable: true });
  target.dispatchEvent(ev);
  return ev;
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeAll(async () => {
  document.body.innerHTML = FULL_DOM;
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { href: '' }
  });
  global.fetch = jest.fn().mockResolvedValue(okJson(SAMPLE));
  global.alert = jest.fn();

  require('../app.js');
  document.dispatchEvent(new Event('DOMContentLoaded'));
  await flush(); // let the initial listTasks() resolve and render the <li>
});

beforeEach(() => {
  // Fresh mocks per test; handlers read global.fetch/alert at call time.
  global.fetch = jest.fn().mockResolvedValue(okJson(SAMPLE));
  global.alert = jest.fn();
  window.location.href = '';
});

test('initial render produced a draggable task li', () => {
  const li = document.querySelector('#tasks-pending li');
  expect(li).not.toBeNull();
  expect(li.draggable).toBe(true);
  expect(li.dataset.id).toBe('42');
});

test('Criar button triggers createTask', async () => {
  document.getElementById('title').value = 'Brand new';
  document.getElementById('createBtn').click();
  await flush();
  expect(fetch.mock.calls[0][0]).toContain('/tasks');
  expect(fetch.mock.calls[0][1].method).toBe('POST');
});

test('Buscar button triggers fetchTask', async () => {
  document.getElementById('fetchName').value = 'sample';
  document.getElementById('fetchBtn').click();
  await flush();
  expect(document.getElementById('searchResults').innerHTML).toContain('Sample');
});

test('drag a task to another column PATCHes its status', async () => {
  const li = document.querySelector('#tasks-pending li');
  const targetUl = document.getElementById('tasks-done');
  const dt = {};

  fire('dragstart', li, dt);
  expect(li.classList.contains('dragging')).toBe(true);

  fire('dragover', targetUl, dt);
  expect(targetUl.classList.contains('drag-over')).toBe(true);

  fire('drop', targetUl, dt);
  await flush();

  const patch = fetch.mock.calls.find((c) => String(c[0]).includes('/status'));
  expect(patch).toBeTruthy();
  expect(JSON.parse(patch[1].body)).toEqual({ status: 'done' });
});

test('dropping on the same column does not PATCH', async () => {
  // re-render to get a clean li
  const li = document.querySelector('#tasks-pending li');
  const sameUl = document.getElementById('tasks-pending');
  fire('dragstart', li, {});
  fire('drop', sameUl, {});
  await flush();
  const patch = fetch.mock.calls.find((c) => String(c[0]).includes('/status'));
  expect(patch).toBeFalsy();
});

test('dragleave clears the drag-over highlight', () => {
  const ul = document.getElementById('tasks-in_progress');
  ul.classList.add('drag-over');
  fire('dragleave', ul, {});
  expect(ul.classList.contains('drag-over')).toBe(false);
});

test('dragend removes the dragging class', () => {
  const li = document.querySelector('#tasks-pending li');
  li.classList.add('dragging');
  fire('dragend', li, {});
  expect(li.classList.contains('dragging')).toBe(false);
});

test('clicking Remover deletes the task', async () => {
  const delBtn = document.querySelector('#tasks-pending .delete');
  delBtn.click();
  await flush();
  const del = fetch.mock.calls.find((c) => c[1] && c[1].method === 'DELETE');
  expect(del).toBeTruthy();
});

test('clicking Editar stores the id and navigates to edit.html', () => {
  const editBtn = document.querySelector('#tasks-pending .edit');
  editBtn.click();
  expect(localStorage.getItem('edit_task_id')).toBe('42');
  expect(window.location.href).toContain('edit.html?id=42');
});

test('clicking the modal backdrop hides it', () => {
  const modal = document.getElementById('editModal');
  modal.classList.remove('hidden');
  // event target must be the modal element itself
  const ev = new Event('click', { bubbles: true });
  Object.defineProperty(ev, 'target', { value: modal });
  modal.dispatchEvent(ev);
  expect(modal.classList.contains('hidden')).toBe(true);
});

test('cancel and close buttons hide the modal', () => {
  const modal = document.getElementById('editModal');
  modal.classList.remove('hidden');
  document.getElementById('cancelEditBtn').click();
  expect(modal.classList.contains('hidden')).toBe(true);

  modal.classList.remove('hidden');
  document.getElementById('closeModalBtn').click();
  expect(modal.classList.contains('hidden')).toBe(true);
});

test('saveEditBtn wired to saveEdit', async () => {
  document.getElementById('saveEditBtn').dataset.id = '42';
  document.getElementById('editTitle').value = 'Edited';
  document.getElementById('saveEditBtn').click();
  await flush();
  const put = fetch.mock.calls.find((c) => c[1] && c[1].method === 'PUT');
  expect(put).toBeTruthy();
});

test('drag events fired outside a task/list are ignored (early returns)', async () => {
  const boards = document.querySelector('.boards');
  // target has no <li>/<ul> ancestor → each handler returns early without throwing
  fire('dragstart', boards, {});
  fire('dragover', boards, {});
  fire('drop', boards, {});
  await flush();
  const patch = fetch.mock.calls.find((c) => String(c[0]).includes('/status'));
  expect(patch).toBeFalsy();
});

test('dragleave keeps the highlight when leaving toward a child element', () => {
  const ul = document.getElementById('tasks-pending');
  const child = ul.querySelector('li');
  ul.classList.add('drag-over');
  // relatedTarget is inside the ul → ul.contains(...) is true → highlight stays
  fire('dragleave', ul, {}, child);
  expect(ul.classList.contains('drag-over')).toBe(true);
  ul.classList.remove('drag-over');
});

test('clicking a non-action element in a card does nothing', async () => {
  const strong = document.querySelector('#tasks-pending li strong');
  fire('click', strong, {});
  await flush();
  expect(fetch.mock.calls.find((c) => c[1] && c[1].method === 'DELETE')).toBeFalsy();
  expect(window.location.href).toBe('');
});

test('clicking inside the modal (not the backdrop) does not hide it', () => {
  const modal = document.getElementById('editModal');
  modal.classList.remove('hidden');
  document.getElementById('editTitle').click(); // target.id !== 'editModal'
  expect(modal.classList.contains('hidden')).toBe(false);
  modal.classList.add('hidden');
});
