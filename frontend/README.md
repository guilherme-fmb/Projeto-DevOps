# Frontend - Task Manager UI

Interface web mínima para interagir com a Task Manager API.

Este frontend é um conjunto de arquivos estáticos (HTML/CSS/JS) em `static/`:

- `static/index.html` — página principal
- `static/app.js` — lógica cliente que consome a API
- `static/styles.css` — estilos

## Como funciona

Por padrão o cliente usa `window.location.origin` como base da API (variável `apiBase` em `app.js`). Ou seja, ele espera que a API esteja servida na mesma origem (mesmo host e porta) do arquivo HTML.

Existem 2 modos de rodar o frontend:

### 1) Servir via backend (recomendado para desenvolvimento rápido)

- Copie a pasta `static/` para a pasta `backend/static` (ou mova os arquivos para lá).
- Inicie o backend:

```bash
cd backend
python app.py
```

- Abra `http://localhost:5000/ui` (ou `http://localhost:5000/static/index.html`) no navegador.

Vantagem: não precisa configurar CORS e a UI consumirá automaticamente `http://localhost:5000/tasks`.

### 2) Servir como site estático separado

Se preferir servir o frontend com um servidor estático (ex.: `python -m http.server`), siga:

```bash
cd frontend/static
python -m http.server 5500
```

Abra `http://localhost:5500/index.html`.

Importante: neste modo o frontend está em outra origem, então o backend precisa permitir CORS. O frontend já usa `window.API_BASE = 'http://localhost:5000';` em `index.html`, permitindo que ele chame o backend diretamente em `http://localhost:5000`.

Se você mudar o backend para outro host ou porta, atualize a variável `window.API_BASE` em `static/index.html`.

```js
window.API_BASE = 'http://localhost:5000';
```

- No backend, habilite CORS (instale `flask-cors`) e adicione:

```python
from flask_cors import CORS
CORS(app)
```

E instale a dependência:

```bash
pip install flask-cors
```

ou adicione `Flask-Cors` a `backend/requirements.txt`.

## Checklist — o que falta / recomendações

- [ ] Garantir que o backend esteja rodando em `http://localhost:5000` (ou ajustar `apiBase`).
- [ ] Habilitar CORS no backend se o frontend for servido separadamente.
- [ ] (Opcional) Tornar `apiBase` configurável via query string ou variável no `index.html` para facilitar testes.
- [ ] (Opcional) Adicionar tratamento de erros e mensagens mais amigáveis no frontend.
- [ ] (Opcional) Fazer deploy conjunto (servir `static/` a partir do backend) para evitar CORS em produção.

## Testar rapidamente

1. Inicie o backend (`backend`):

```bash
python app.py
```

2. Servir frontend pelo backend (modo recomendado): copiar `frontend/static/*` → `backend/static/` e abrir `http://localhost:5000/ui`.

3. Ou servir estaticamente e ajustar CORS / `apiBase` conforme acima.

---

Se quiser, eu: 
- adiciono automaticamente `Flask-Cors` ao `backend/requirements.txt` e habilito no `app.py`, ou
- altero `app.js` para aceitar uma variável `API_BASE` em `index.html` (facilita alternar entre origens).

Qual opção prefere que eu implemente agora?