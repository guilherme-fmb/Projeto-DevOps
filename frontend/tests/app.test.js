/**
 * Unit tests for app.js — exercises every exported function and its branches.
 * The DOMContentLoaded wiring (drag/drop, click delegation) is covered separately
 * in app.dom.test.js so listeners don't accumulate on the shared document.
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

function res(data, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => data };
}

let app;

beforeEach(() => {
  jest.resetModules();
  document.body.innerHTML = FULL_DOM;
  global.fetch = jest.fn();
  global.alert = jest.fn();
  // Require fresh each test. The module registers a DOMContentLoaded listener but
  // never runs it here (we never dispatch the event), so there is no side effect.
  app = require('../app.js');
});

describe('listTasks', () => {
  test('renders tasks into the correct columns by status', async () => {
    fetch.mockResolvedValueOnce(res([
      { id: 1, title: 'A', description: 'desc', status: 'pending' },
      { id: 2, title: 'B', description: '', status: 'in_progress' },
      { id: 3, title: 'C', status: 'done' },
      { id: 4, title: 'D', status: 'weird-unknown' } // falls back to pending
    ]));

    await app.listTasks();

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/tasks'),
      expect.objectContaining({ cache: 'no-store' })
    );
    expect(document.querySelectorAll('#tasks-pending li')).toHaveLength(2); // A + D
    expect(document.querySelectorAll('#tasks-in_progress li')).toHaveLength(1);
    expect(document.querySelectorAll('#tasks-done li')).toHaveLength(1);
  });

  test('rendered card no longer contains a status select (drag & drop replaces it)', async () => {
    fetch.mockResolvedValueOnce(res([
      { id: 1, title: 'A', description: 'd', status: 'pending' }
    ]));

    await app.listTasks();

    expect(document.querySelector('select')).toBeNull();
    expect(document.body.innerHTML).not.toContain('Status:');
    // edit/delete actions are still present
    expect(document.querySelector('#tasks-pending .edit')).not.toBeNull();
    expect(document.querySelector('#tasks-pending .delete')).not.toBeNull();
  });

  test('tolerates missing list containers (null-guard branches)', async () => {
    document.body.innerHTML = ''; // no ULs at all
    fetch.mockResolvedValueOnce(res([{ id: 1, title: 'A', status: 'pending' }]));
    await expect(app.listTasks()).resolves.toBeUndefined();
  });
});

describe('createTask', () => {
  test('alerts and does not POST when title is empty', async () => {
    document.getElementById('title').value = '   ';
    await app.createTask();
    expect(alert).toHaveBeenCalledWith('O título é obrigatório.');
    expect(fetch).not.toHaveBeenCalled();
  });

  test('POSTs, clears inputs and refreshes on success', async () => {
    document.getElementById('title').value = 'New task';
    document.getElementById('description').value = 'some desc';
    fetch
      .mockResolvedValueOnce(res({ id: 1 }))      // POST /tasks
      .mockResolvedValueOnce(res([]));            // listTasks refresh

    await app.createTask();

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toContain('/tasks');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ title: 'New task', description: 'some desc', status: 'pending' });
    expect(document.getElementById('title').value).toBe('');
    expect(document.getElementById('description').value).toBe('');
  });

  test('alerts the server error message on failure', async () => {
    document.getElementById('title').value = 'x';
    fetch.mockResolvedValueOnce(res({ error: 'Boom' }, { ok: false, status: 400 }));
    await app.createTask();
    expect(alert).toHaveBeenCalledWith('Boom');
  });

  test('alerts a generic message when error body is not JSON', async () => {
    document.getElementById('title').value = 'x';
    fetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => { throw new Error('nope'); } });
    await app.createTask();
    expect(alert).toHaveBeenCalledWith('Erro ao criar tarefa');
  });
});

describe('createSearchCard', () => {
  test('maps each status to its Portuguese label', () => {
    expect(app.createSearchCard({ title: 'T', description: 'd', status: 'pending' })).toContain('Aguardando');
    expect(app.createSearchCard({ title: 'T', description: 'd', status: 'in_progress' })).toContain('Em andamento');
    expect(app.createSearchCard({ title: 'T', description: 'd', status: 'done' })).toContain('Concluída');
  });

  test('falls back to "Sem descrição" when description is missing', () => {
    expect(app.createSearchCard({ title: 'T', status: 'pending' })).toContain('Sem descrição');
  });
});

describe('fetchTask', () => {
  test('prompts when the search box is empty', async () => {
    document.getElementById('fetchName').value = '';
    await app.fetchTask();
    expect(document.getElementById('searchResults').textContent).toBe('Informe um nome para buscar.');
    expect(fetch).not.toHaveBeenCalled();
  });

  test('returns early when the results container is missing', async () => {
    document.getElementById('searchResults').remove();
    document.getElementById('fetchName').value = 'a';
    await expect(app.fetchTask()).resolves.toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  test('renders matching cards (case-insensitive, partial)', async () => {
    document.getElementById('fetchName').value = 'task';
    fetch.mockResolvedValueOnce(res([
      { id: 1, title: 'My Task', description: 'd', status: 'pending' },
      { id: 2, title: 'Other', description: 'd', status: 'done' }
    ]));
    await app.fetchTask();
    const html = document.getElementById('searchResults').innerHTML;
    expect(html).toContain('My Task');
    expect(html).not.toContain('Other');
  });

  test('shows a not-found message when nothing matches', async () => {
    document.getElementById('fetchName').value = 'zzz';
    fetch.mockResolvedValueOnce(res([{ id: 1, title: 'abc', status: 'pending' }]));
    await app.fetchTask();
    expect(document.getElementById('searchResults').textContent).toBe('Nenhuma tarefa encontrada para esse nome.');
  });

  test('reports an HTTP error', async () => {
    document.getElementById('fetchName').value = 'a';
    fetch.mockResolvedValueOnce(res(null, { ok: false, status: 503 }));
    await app.fetchTask();
    expect(document.getElementById('searchResults').textContent).toContain('503');
  });

  test('reports a network error', async () => {
    document.getElementById('fetchName').value = 'a';
    fetch.mockRejectedValueOnce(new Error('offline'));
    await app.fetchTask();
    expect(document.getElementById('searchResults').textContent).toContain('offline');
  });

  test('handles a thrown non-Error value and titleless tasks', async () => {
    document.getElementById('fetchName').value = 'a';
    // first call: a task with no title is filtered without throwing (t.title || '')
    fetch.mockResolvedValueOnce(res([
      { id: 1, status: 'pending' },        // no title
      { id: 2, title: 'Alpha', status: 'done' }
    ]));
    await app.fetchTask();
    expect(document.getElementById('searchResults').innerHTML).toContain('Alpha');

    // second call: rejection that is a plain string (err.message is undefined)
    document.getElementById('searchResults').innerHTML = '';
    fetch.mockRejectedValueOnce('plain-string-error');
    await app.fetchTask();
    expect(document.getElementById('searchResults').textContent).toContain('plain-string-error');
  });
});

describe('deleteTask', () => {
  test('refreshes the list on success', async () => {
    fetch
      .mockResolvedValueOnce(res({}, { ok: true }))   // DELETE
      .mockResolvedValueOnce(res([]));                // listTasks
    await app.deleteTask(7);
    expect(fetch.mock.calls[0][0]).toContain('/tasks/7');
    expect(fetch.mock.calls[0][1].method).toBe('DELETE');
    expect(alert).not.toHaveBeenCalled();
  });

  test('alerts the server message on failure', async () => {
    fetch.mockResolvedValueOnce(res({ error: 'Não pode' }, { ok: false, status: 409 }));
    await app.deleteTask(7);
    expect(alert).toHaveBeenCalledWith('Não pode');
  });

  test('alerts a status-based fallback when body is not JSON', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 404, json: async () => { throw new Error('x'); } });
    await app.deleteTask(7);
    expect(alert).toHaveBeenCalledWith(expect.stringContaining('404'));
  });

  test('alerts on a network error', async () => {
    fetch.mockRejectedValueOnce(new Error('down'));
    await app.deleteTask(7);
    expect(alert).toHaveBeenCalledWith(expect.stringContaining('down'));
  });

  test('alerts on a thrown non-Error value', async () => {
    fetch.mockRejectedValueOnce('raw-failure');
    await app.deleteTask(7);
    expect(alert).toHaveBeenCalledWith(expect.stringContaining('raw-failure'));
  });
});

describe('updateStatus', () => {
  test('PATCHes and refreshes on success', async () => {
    fetch
      .mockResolvedValueOnce(res({}, { ok: true }))  // PATCH
      .mockResolvedValueOnce(res([]));               // listTasks
    await app.updateStatus(3, 'done');
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toContain('/tasks/3/status');
    expect(opts.method).toBe('PATCH');
    expect(JSON.parse(opts.body)).toEqual({ status: 'done' });
    expect(alert).not.toHaveBeenCalled();
  });

  test('alerts on failure', async () => {
    fetch.mockResolvedValueOnce(res({}, { ok: false, status: 400 }));
    await app.updateStatus(3, 'done');
    expect(alert).toHaveBeenCalledWith('Falha ao atualizar status');
  });
});

describe('edit modal helpers', () => {
  test('showEditModal populates fields and reveals the modal', () => {
    app.showEditModal({ id: 9, title: 'Hi', description: 'There' });
    expect(document.getElementById('editTitle').value).toBe('Hi');
    expect(document.getElementById('editDescription').value).toBe('There');
    expect(document.getElementById('saveEditBtn').dataset.id).toBe('9');
    expect(document.getElementById('editModal').classList.contains('hidden')).toBe(false);
  });

  test('showEditModal handles missing title/description', () => {
    app.showEditModal({ id: 9 });
    expect(document.getElementById('editTitle').value).toBe('');
    expect(document.getElementById('editDescription').value).toBe('');
  });

  test('hideEditModal hides the modal and clears the id', () => {
    app.showEditModal({ id: 9, title: 'a', description: 'b' });
    app.hideEditModal();
    expect(document.getElementById('editModal').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('saveEditBtn').dataset.id).toBe('');
  });
});

describe('saveEdit', () => {
  beforeEach(() => {
    document.getElementById('saveEditBtn').dataset.id = '5';
  });

  test('alerts when title is empty', async () => {
    document.getElementById('editTitle').value = '  ';
    await app.saveEdit();
    expect(alert).toHaveBeenCalledWith('O título é obrigatório.');
    expect(fetch).not.toHaveBeenCalled();
  });

  test('PUTs and closes the modal on success', async () => {
    document.getElementById('editTitle').value = 'Updated';
    document.getElementById('editDescription').value = 'body';
    fetch
      .mockResolvedValueOnce(res({}, { ok: true }))  // PUT
      .mockResolvedValueOnce(res([]));               // listTasks
    await app.saveEdit();
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toContain('/tasks/5');
    expect(opts.method).toBe('PUT');
    expect(document.getElementById('editModal').classList.contains('hidden')).toBe(true);
  });

  test('alerts the server message on failure', async () => {
    document.getElementById('editTitle').value = 'x';
    fetch.mockResolvedValueOnce(res({ error: 'bad' }, { ok: false, status: 400 }));
    await app.saveEdit();
    expect(alert).toHaveBeenCalledWith('bad');
  });

  test('alerts a generic message when error body is not JSON', async () => {
    document.getElementById('editTitle').value = 'x';
    fetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => { throw new Error('x'); } });
    await app.saveEdit();
    expect(alert).toHaveBeenCalledWith('Falha ao salvar edição');
  });
});
