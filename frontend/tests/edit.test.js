/**
 * Tests for edit.js — direct function tests plus the DOMContentLoaded id-resolution
 * branches. The DOMContentLoaded callback is captured via an addEventListener spy so
 * each scenario runs in isolation (no listener accumulation on the shared document).
 */

const EDIT_DOM = `
  <input id="editTitle" />
  <textarea id="editDescription"></textarea>
  <button id="saveBtn"></button>
  <button id="cancelBtn"></button>
`;

const okJson = (data, { ok = true, status = 200 } = {}) => ({ ok, status, json: async () => data });

function setHref(href) {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { href }
  });
}

let edit;
let domReady;

beforeEach(() => {
  jest.resetModules();
  document.body.innerHTML = EDIT_DOM;
  setHref('http://localhost/edit.html?id=5');
  global.fetch = jest.fn().mockResolvedValue(okJson({ id: 5, title: 'T', description: 'D' }));
  global.alert = jest.fn();
  localStorage.clear();

  domReady = null;
  jest.spyOn(document, 'addEventListener').mockImplementation((type, cb) => {
    if (type === 'DOMContentLoaded') domReady = cb;
  });

  edit = require('../edit.js');
});

afterEach(() => {
  document.addEventListener.mockRestore();
});

describe('getQueryParam', () => {
  test('reads a query parameter', () => {
    setHref('http://localhost/edit.html?id=99');
    expect(edit.getQueryParam('id')).toBe('99');
  });

  test('returns null when absent', () => {
    setHref('http://localhost/edit.html');
    expect(edit.getQueryParam('id')).toBeNull();
  });
});

describe('loadTask', () => {
  test('populates the form on success', async () => {
    fetch.mockResolvedValueOnce(okJson({ id: 5, title: 'Hello', description: 'World' }));
    await edit.loadTask(5);
    expect(fetch.mock.calls[0][0]).toContain('/tasks/5');
    expect(document.getElementById('editTitle').value).toBe('Hello');
    expect(document.getElementById('editDescription').value).toBe('World');
  });

  test('handles missing title/description fields', async () => {
    fetch.mockResolvedValueOnce(okJson({ id: 5 }));
    await edit.loadTask(5);
    expect(document.getElementById('editTitle').value).toBe('');
    expect(document.getElementById('editDescription').value).toBe('');
  });

  test('alerts and redirects when the task is not found', async () => {
    fetch.mockResolvedValueOnce(okJson(null, { ok: false, status: 404 }));
    await edit.loadTask(5);
    expect(alert).toHaveBeenCalledWith('Tarefa não encontrada');
    expect(window.location.href).toBe('index.html');
  });
});

describe('save', () => {
  test('alerts when the title is empty', async () => {
    setHref('http://localhost/edit.html?id=5');
    document.getElementById('editTitle').value = '   ';
    await edit.save();
    expect(alert).toHaveBeenCalledWith('O título é obrigatório.');
    expect(fetch).not.toHaveBeenCalled();
  });

  test('PUTs and redirects on success', async () => {
    setHref('http://localhost/edit.html?id=5');
    document.getElementById('editTitle').value = 'New';
    document.getElementById('editDescription').value = 'Body';
    fetch.mockResolvedValueOnce(okJson({}, { ok: true }));
    await edit.save();
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toContain('/tasks/5');
    expect(opts.method).toBe('PUT');
    expect(JSON.parse(opts.body)).toEqual({ title: 'New', description: 'Body' });
    expect(window.location.href).toBe('index.html');
  });

  test('alerts the server message on failure', async () => {
    setHref('http://localhost/edit.html?id=5');
    document.getElementById('editTitle').value = 'x';
    fetch.mockResolvedValueOnce(okJson({ error: 'nope' }, { ok: false, status: 400 }));
    await edit.save();
    expect(alert).toHaveBeenCalledWith('nope');
  });

  test('alerts a generic message when the error body is not JSON', async () => {
    setHref('http://localhost/edit.html?id=5');
    document.getElementById('editTitle').value = 'x';
    fetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => { throw new Error('x'); } });
    await edit.save();
    expect(alert).toHaveBeenCalledWith('Falha ao salvar');
  });
});

describe('cancel', () => {
  test('redirects to index.html', () => {
    edit.cancel();
    expect(window.location.href).toBe('index.html');
  });
});

describe('DOMContentLoaded id resolution', () => {
  test('uses the query-string id and loads the task', async () => {
    setHref('http://localhost/edit.html?id=7');
    await domReady();
    expect(fetch.mock.calls[0][0]).toContain('/tasks/7');
  });

  test('falls back to localStorage when no query id is present', async () => {
    setHref('http://localhost/edit.html');
    localStorage.setItem('edit_task_id', '13');
    await domReady();
    expect(fetch.mock.calls[0][0]).toContain('/tasks/13');
    expect(localStorage.getItem('edit_task_id')).toBeNull(); // consumed
  });

  test('handles a throwing localStorage (catch branch)', async () => {
    setHref('http://localhost/edit.html');
    jest.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    await domReady();
    expect(alert).toHaveBeenCalledWith('ID da tarefa ausente');
    expect(window.location.href).toBe('index.html');
    window.localStorage.__proto__.getItem.mockRestore();
  });

  test('alerts and redirects when no id can be found', async () => {
    setHref('http://localhost/edit.html');
    await domReady();
    expect(alert).toHaveBeenCalledWith('ID da tarefa ausente');
    expect(window.location.href).toBe('index.html');
  });

  test('wires the save and cancel buttons', async () => {
    setHref('http://localhost/edit.html?id=7');
    await domReady();
    // saveBtn → save(): empty title triggers the required-title alert
    document.getElementById('editTitle').value = '';
    document.getElementById('saveBtn').click();
    expect(alert).toHaveBeenCalledWith('O título é obrigatório.');
    // cancelBtn → cancel(): redirects
    document.getElementById('cancelBtn').click();
    expect(window.location.href).toBe('index.html');
  });
});
