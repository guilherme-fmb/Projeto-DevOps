const apiBase = window.API_BASE || window.location.origin;

async function listTasks() {
  const res = await fetch(`${apiBase}/tasks`, { cache: 'no-store' });
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
        <select id="status-${t.id}" data-current="${t.status}">
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
  const name = document.getElementById('fetchName').value.trim().toLowerCase();
  const pre = document.getElementById('singleResult');
  if (!name) {
    pre.textContent = 'Informe um nome para buscar.';
    return;
  }

  // fetch all tasks and filter client-side by title (case-insensitive, partial match)
  try {
    const res = await fetch(`${apiBase}/tasks`, { cache: 'no-store' });
    if (!res.ok) {
      pre.textContent = `Erro ao buscar tarefas: ${res.status}`;
      return;
    }
    const tasks = await res.json();
    const matches = tasks.filter(t => (t.title || '').toLowerCase().includes(name));
    if (matches.length === 0) {
      pre.textContent = 'Nenhuma tarefa encontrada para esse nome.';
    } else {
      pre.textContent = JSON.stringify(matches, null, 2);
    }
  } catch (err) {
    pre.textContent = 'Erro de rede ao buscar tarefas: ' + (err.message || err);
  }
}

async function deleteTask(id) {
  try {
    const res = await fetch(`${apiBase}/tasks/${id}`, { method: 'DELETE' });
    if (res.ok) {
      listTasks();
    } else {
      const err = await res.json().catch(() => null);
      alert(err?.error || `Falha ao remover (status ${res.status})`);
    }
  } catch (err) {
    alert('Erro de rede ao remover: ' + (err.message || err));
  }
}

async function updateStatus(id, status, previous, selectEl) {
  const res = await fetch(`${apiBase}/tasks/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (res.ok) {
    // update element's current dataset to reflect persisted status
    if (selectEl) selectEl.dataset.current = status;
    // refresh list to reflect any server-side ordering/changes
    listTasks();
  } else {
    alert('Falha ao atualizar status');
    // revert to previous value in UI
    if (selectEl) selectEl.value = previous;
  }
}

function showEditModal(task) {
  document.getElementById('editTitle').value = task.title || '';
  document.getElementById('editDescription').value = task.description || '';
  document.getElementById('saveEditBtn').dataset.id = task.id;
  document.getElementById('editModal').classList.remove('hidden');
}

function hideEditModal() {
  document.getElementById('editModal').classList.add('hidden');
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
    hideEditModal();
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
  const saveEditBtn = document.getElementById('saveEditBtn');
  if (saveEditBtn) saveEditBtn.addEventListener('click', saveEdit);
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  if (cancelEditBtn) cancelEditBtn.addEventListener('click', hideEditModal);
  const closeModalBtn = document.getElementById('closeModalBtn');
  if (closeModalBtn) closeModalBtn.addEventListener('click', hideEditModal);

  document.getElementById('tasks').addEventListener('click', (e) => {
    if (e.target.matches('.delete')) {
      deleteTask(e.target.dataset.id);
    }
    if (e.target.matches('.edit')) {
      const id = e.target.dataset.id;
      // Store id as fallback in localStorage then redirect to edit page
      try { localStorage.setItem('edit_task_id', String(id)); } catch (err) { /* ignore */ }
      // Prefer explicit query param but allow relative path
      window.location.href = `./edit.html?id=${encodeURIComponent(id)}`;
    }
  });

  document.getElementById('tasks').addEventListener('change', (e) => {
    if (e.target.id && e.target.id.startsWith('status-')) {
      const id = e.target.id.replace('status-', '');
      const previous = e.target.dataset.current || '';
      updateStatus(id, e.target.value, previous, e.target);
    }
  });

  const editModalEl = document.getElementById('editModal');
  if (editModalEl) {
    editModalEl.addEventListener('click', (e) => {
      if (e.target.id === 'editModal') {
        hideEditModal();
      }
    });
  }

  listTasks();
});
