# Projeto DevOps - Task Manager

Aplicação web para gerenciamento de tarefas com backend em Flask e frontend estático em HTML/CSS/JavaScript.

## Estrutura do Projeto

```
.
├── backend/              # API REST em Flask
│   ├── app.py           # Aplicação principal
│   ├── routes.py        # Endpoints da API
│   ├── models.py        # Modelos de dados (SQLAlchemy)
│   ├── database.py      # Configuração do banco de dados
│   ├── requirements.txt  # Dependências Python
│   ├── Dockerfile       # Imagem Docker do backend
│   └── tests/           # Testes da API
│
├── frontend/            # Aplicação web estática
│   ├── index.html       # Página principal
│   ├── edit.html        # Página de edição
│   ├── app.js           # Lógica da interface
│   ├── edit.js          # Lógica de edição
│   ├── styles.css       # Estilos CSS
│   ├── Dockerfile       # Imagem Docker do frontend
│   └── tests/           # Testes do frontend
│
├── docker-compose.yml   # Orquestração dos serviços
└── README.md            # Este arquivo
```

## Como Rodar Localmente

### Requisitos
- Python 3.11+
- pip

### Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

O backend estará disponível em `http://localhost:5000`

### Frontend

```bash
cd frontend
python -m http.server 8080
```

O frontend estará disponível em `http://localhost:8080`

---

## Como Rodar com Docker Compose

### Requisitos
- Docker (Docker Desktop)
- Docker Compose

### Comando

Na raiz do projeto:

```bash
docker compose up --build
```

Isso irá:
1. Construir a imagem do backend
2. Construir a imagem do frontend
3. Iniciar ambos os serviços

### Acessar os serviços

- **Frontend**: `http://localhost:8080`
- **Backend API**: `http://localhost:5000`

### Parar os serviços

```bash
docker compose down
```

---

## Sobre o docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
    ports:
      - "5000:5000"
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
    ports:
      - "8080:8080"
    restart: unless-stopped
    depends_on:
      - backend
```

### Explicação

| Campo | Descrição |
|-------|-----------|
| `version: '3.8'` | Versão do Docker Compose |
| `services` | Defina os containers que serão criados |
| `build.context` | Caminho onde está o `Dockerfile` para cada serviço |
| `ports` | Mapeamento de portas (porta_host:porta_container) |
| `restart: unless-stopped` | Reinicia o container caso falhe, a menos que seja manualmente parado |
| `depends_on` | O frontend aguarda o backend estar pronto antes de iniciar |

---

## Dockerfiles

### backend/Dockerfile

- **Base**: `python:3.11-slim` (imagem leve do Python)
- **Instala**: Dependências de `requirements.txt`
- **Porta**: `5000`
- **Comando**: `python app.py`

### frontend/Dockerfile

- **Base**: `python:3.11-slim`
- **Serve**: Arquivos estáticos com `http.server`
- **Porta**: `8080`
- **Comando**: `python -m http.server 8080`

---

## Endpoints da API

### Tarefas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/tasks` | Lista todas as tarefas |
| `POST` | `/api/tasks` | Cria uma nova tarefa |
| `PATCH` | `/api/tasks/<id>/status` | Atualiza status da tarefa |
| `DELETE` | `/api/tasks/<id>` | Deleta uma tarefa |
| `GET` | `/api/tasks/search/<title>` | Busca tarefas por título |

### Frontend

| Endpoint | Descrição |
|----------|-----------|
| `/` | Página principal com board de tarefas |
| `/edit.html` | Página para editar tarefa |

---

## Variáveis de Ambiente

### Backend

Podem ser configuradas no `.env` ou passadas ao container:

```bash
DATABASE_URL=sqlite:///tasks.db  # ou postgresql://user:pass@host/db
FLASK_ENV=production
FLASK_DEBUG=0
```

---

## Desenvolvendo

### Logs dos containers

```bash
# Todos os logs
docker compose logs -f

# Logs do backend apenas
docker compose logs -f backend

# Logs do frontend apenas
docker compose logs -f frontend
```

### Recompilar imagens

```bash
docker compose build --no-cache
```

### Executar comando em um container

```bash
# No backend
docker compose exec backend bash

# No frontend
docker compose exec frontend bash
```

---

## Testes

### Backend

```bash
cd backend
pytest -q
```

### Frontend

```bash
cd frontend
pytest -q
```

---

## Troubleshooting

**Erro: porta já está em uso**
```bash
# Mude a porta no docker-compose.yml
ports:
  - "5001:5000"  # novo mapeamento
```

**Erro: permissão negada ao rodar docker**
```bash
# Em Linux/Mac, adicione seu usuário ao grupo docker
sudo usermod -aG docker $USER
```

**Container para após iniciar**
```bash
# Verifique os logs
docker compose logs backend
docker compose logs frontend
```

---

## Licença

MIT
