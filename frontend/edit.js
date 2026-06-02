const apiBase = window.API_BASE || window.location.origin;

function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

async function loadTask(id) {
  const res = await fetch(`${apiBase}/tasks/${id}`);
  if (!res.ok) {
    alert('Tarefa não encontrada');
    window.location.href = 'index.html';
    return;
  }
  const task = await res.json();
  document.getElementById('editTitle').value = task.title || '';
  document.getElementById('editDescription').value = task.description || '';
}

async function save() {
  const id = getQueryParam('id');
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
    window.location.href = 'index.html';
  } else {
    const error = await res.json().catch(() => null);
    alert(error?.error || 'Falha ao salvar');
  }
}

function cancel() {
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
  let id = getQueryParam('id');
  if (!id) {
    // fallback: try localStorage (set by index before redirect)
    try {
      id = localStorage.getItem('edit_task_id');
      if (id) {
        // consume the fallback so it doesn't persist
        localStorage.removeItem('edit_task_id');
      }
    } catch (err) {
      id = null;
    }
  }
  if (!id) {
    alert('ID da tarefa ausente');
    window.location.href = 'index.html';
    return;
  }
  loadTask(id);
  document.getElementById('saveBtn').addEventListener('click', save);
  document.getElementById('cancelBtn').addEventListener('click', cancel);
});
