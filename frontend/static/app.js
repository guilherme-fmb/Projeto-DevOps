const apiBase = window.API_BASE || window.location.origin;

async function listTasks() {
  const res = await fetch(`${apiBase}/tasks`);
  const tasks = await res.json();
  const ul = document.getElementById('tasks');
  ul.innerHTML = '';
  tasks.forEach(t => {
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${t.title}</strong>
      <div class="desc">${t.description || ''}</div>
      <div class="status-row">
        <label for="status-${t.id}">Status:</label>
        <select id="status-${t.id}">
          <option value="pending" ${t.status === 'pending' ? 'selected' : ''}>Aguardando</option>
          <option value="in_progress" ${t.status === 'in_progress' ? 'selected' : ''}>Em andamento</option>
          <option value="done" ${t.status === 'done' ? 'selected' : ''}>Concluída</option>
        </select>
      </div>
      <div class="actions">
        <button data-id="${t.id}" class="edit">Editar</button>
        <button data-id="${t.id}" class="delete">Remover</button>
      </div>
    `;
    ul.appendChild(li);
  });
}

async function createTask() {
  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  const status = 'pending';

  if (!title) {
    alert('O título é obrigatório.');
    return;
  }

  const payload = { title, description, status };
  const res = await fetch(`${apiBase}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (res.ok) {
    document.getElementById('title').value = '';
    document.getElementById('description').value = '';
    listTasks();
  } else {
    const error = await res.json().catch(() => null);
    alert(error?.error || 'Erro ao criar tarefa');
  }
}

async function fetchTask() {
  const id = document.getElementById('fetchId').value;
  const res = await fetch(`${apiBase}/tasks/${id}`);
  const pre = document.getElementById('singleResult');
  if (res.ok) {
    const data = await res.json();
    pre.textContent = JSON.stringify(data, null, 2);
  } else {
    pre.textContent = `Erro: ${res.status}`;
  }
}

async function deleteTask(id) {
  const res = await fetch(`${apiBase}/tasks/${id}`, { method: 'DELETE' });
  if (res.ok) listTasks();
}

async function updateStatus(id, status) {
  const res = await fetch(`${apiBase}/tasks/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (res.ok) listTasks();
  else alert('Falha ao atualizar status');
}

function showEditPanel(task) {
  document.getElementById('editSection').classList.remove('hidden');
  document.getElementById('editTitle').value = task.title || '';
  document.getElementById('editDescription').value = task.description || '';
  document.getElementById('saveEditBtn').dataset.id = task.id;
}

function hideEditPanel() {
  document.getElementById('editSection').classList.add('hidden');
  document.getElementById('saveEditBtn').dataset.id = '';
}

async function saveEdit() {
  const id = document.getElementById('saveEditBtn').dataset.id;
  const title = document.getElementById('editTitle').value.trim();
  const description = document.getElementById('editDescription').value.trim();

  if (!title) {
    alert('O título é obrigatório.');
    return;
  }

  const res = await fetch(`${apiBase}/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description })
  });

  if (res.ok) {
    hideEditPanel();
    listTasks();
  } else {
    const error = await res.json().catch(() => null);
    alert(error?.error || 'Falha ao salvar edição');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('createBtn').addEventListener('click', createTask);
  document.getElementById('refreshBtn').addEventListener('click', listTasks);
  document.getElementById('fetchBtn').addEventListener('click', fetchTask);
  document.getElementById('saveEditBtn').addEventListener('click', saveEdit);
  document.getElementById('cancelEditBtn').addEventListener('click', hideEditPanel);

  document.getElementById('tasks').addEventListener('click', (e) => {
    if (e.target.matches('.delete')) {
      deleteTask(e.target.dataset.id);
    }
    if (e.target.matches('.edit')) {
      const id = e.target.dataset.id;
      fetch(`${apiBase}/tasks/${id}`)
        .then(res => res.json())
        .then(task => showEditPanel(task));
    }
  });

  document.getElementById('tasks').addEventListener('change', (e) => {
    if (e.target.id && e.target.id.startsWith('status-')) {
      const id = e.target.id.replace('status-', '');
      updateStatus(id, e.target.value);
    }
  });

  listTasks();
});
