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
├── Dockerfile.jenkins   # Imagem Docker do Jenkins
├── Jenkinsfile          # Pipeline CI/CD
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
1. Baixar a imagem do Postgres
2. Construir a imagem do backend
3. Construir a imagem do frontend
4. Construir a imagem do Jenkins
5. Iniciar todos os serviços (o backend espera o Postgres ficar saudável)

### Acessar os serviços

- **Frontend**: `http://localhost:8080`
- **Backend API**: `http://localhost:5000`
- **Jenkins**: `http://localhost:9090`
- **Postgres**: somente interno (`postgres:5432` dentro da rede do Compose)

### Parar os serviços

```bash
docker compose down
```

---

## Sobre o docker-compose.yml

```yaml
name: projeto-devops

services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_DB: taskdb
      POSTGRES_USER: taskuser
      POSTGRES_PASSWORD: taskpass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U taskuser -d taskdb"]
      interval: 5s
      timeout: 5s
      retries: 10

  backend:
    build:
      context: ./backend
    ports:
      - "5000:5000"
    restart: unless-stopped
    environment:
      DB_HOST: postgres
      DB_PORT: "5432"
      DB_NAME: taskdb
      DB_USER: taskuser
      DB_PASSWORD: taskpass
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
    ports:
      - "8080:8080"
    restart: unless-stopped
    depends_on:
      - backend

  jenkins:
    build:
      context: .
      dockerfile: Dockerfile.jenkins
    container_name: jenkins
    user: root
    ports:
      - "9090:8080"
      - "50000:50000"
    restart: unless-stopped
    privileged: true
    volumes:
      - jenkins_home:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock
      - jenkins_pip_cache:/root/.cache/pip

volumes:
  jenkins_home:
  jenkins_pip_cache:
  postgres_data:
```

### Explicação

| Campo | Descrição |
|-------|-----------|
| `name` | Fixa o nome do projeto Compose (prefixo de containers/volumes/redes) |
| `services` | Define os containers que serão criados |
| `build.context` | Caminho onde está o `Dockerfile` para cada serviço |
| `image` | Usa uma imagem já pronta (no caso do postgres, sem build local) |
| `ports` | Mapeamento de portas (porta_host:porta_container) |
| `environment` | Variáveis injetadas no container — backend usa para montar a URI do Postgres |
| `restart: unless-stopped` | Reinicia o container caso falhe, a menos que seja manualmente parado |
| `depends_on` | Backend aguarda `postgres` ficar saudável; frontend aguarda backend iniciar |
| `healthcheck` | `pg_isready` valida que o Postgres está aceitando conexões antes do backend subir |
| `privileged: true` | Necessário para que o Jenkins acesse o Docker do host |
| `volumes` | `postgres_data` persiste o banco; `jenkins_home` persiste o estado do Jenkins; `docker.sock` permite builds no host |

---

## Comunicação entre Containers: Backend ↔ PostgreSQL

A aplicação demonstra **comunicação container-a-container** entre o `backend` (Flask) e o `postgres` usando a rede interna criada automaticamente pelo Compose.

### Como funciona

Quando o `docker compose up` roda, o Compose cria uma rede bridge privada (`projeto-devops_default`) onde cada serviço fica acessível pelo **nome do serviço** — não pelo IP. O backend não precisa saber o IP do Postgres; basta resolver o hostname `postgres`, que o DNS interno do Compose responde com o endereço atual do container.

```
┌──────────┐   browser → :8080   ┌──────────┐
│ Browser  │ ───────────────────>│ frontend │   (HTML/CSS/JS)
└────┬─────┘                     └──────────┘
     │ browser → :5000
     ▼
┌──────────┐  TCP postgres:5432  ┌──────────┐
│ backend  │ ───────────────────>│ postgres │   (volume postgres_data)
│  Flask   │ <───────────────────│   16     │
└──────────┘    SQL responses    └──────────┘
       └─── rede interna projeto-devops_default ───┘
```

### O que torna isso possível

1. **Variáveis de ambiente** no `backend` (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`). O `backend/app.py` monta a URI:
   ```
   postgresql://taskuser:taskpass@postgres:5432/taskdb
   ```
   Trocar o backend de SQLite para Postgres não exigiu mudar uma linha de Python — só as variáveis no Compose.

2. **DNS interno do Compose.** O backend chama `postgres:5432`; o Docker resolve o hostname para o IP do container correspondente. Funciona porque ambos compartilham a mesma rede do Compose.

3. **`depends_on` com `condition: service_healthy`.** Garante que o backend só sobe quando o `pg_isready` do Postgres passa. Sem isso, o backend tentaria abrir conexão durante a inicialização do Postgres e quebraria.

4. **Sem `ports` no Postgres.** O Postgres não expõe a porta `5432` no host — é acessível **apenas de dentro da rede do Compose**. Isso é proposital: a comunicação fica isolada entre os containers, sem expor o banco para fora.

5. **Volume nomeado `postgres_data`.** Os arquivos do banco vivem fora do container. `docker compose down` derruba os containers mas os dados sobrevivem; `docker compose down -v` apaga o volume também.

### Ciclo de uma requisição que toca o banco

1. Browser faz `POST /tasks` em `localhost:5000`.
2. Flask (dentro do container `backend`) recebe, monta um objeto `Task` (`backend/models.py`).
3. SQLAlchemy pega uma conexão do pool — TCP já aberto para `postgres:5432`.
4. Envia `INSERT INTO tasks (...) RETURNING id` pela rede interna.
5. Postgres escreve no volume `postgres_data`, devolve o `id`.
6. Backend serializa em JSON e responde 201 ao browser.

Reiniciar o `backend` não afeta os dados — eles vivem no Postgres. Reiniciar o `postgres` derruba as conexões abertas; o backend reconecta nas próximas requisições.

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

### Dockerfile.jenkins

- **Base**: `jenkins/jenkins:lts`
- **Instala**: `docker`, `python3`, `pip`, `git`, ferramentas Postgres
- **Portas**: `8080` (UI), `50000` (agentes)

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

## Pipeline Jenkins

Instruções para rodar a pipeline Jenkins do projeto de ponta a ponta.

### 1. Subir o Jenkins (e a aplicação)

Certifique-se de que o Docker Desktop está rodando e, na raiz do projeto, execute:

```bash
docker compose up --build
```

Isso sobe três serviços:

- **backend** → http://localhost:5000
- **frontend** → http://localhost:8080
- **jenkins** → http://localhost:9090

O Jenkins usa uma imagem customizada (`Dockerfile.jenkins`) baseada em `jenkins/jenkins:lts` com `docker`, `python3`, `pip`, `git` e ferramentas do Postgres pré-instaladas. Também monta o socket do Docker do host (`/var/run/docker.sock`), permitindo construir imagens no daemon do host. O estado persistente fica no volume `jenkins_home`.

### 2. Desbloquear o Jenkins (apenas na primeira vez)

Abra http://localhost:9090. Ele pedirá a senha inicial de admin. Pegue-a do container:

```bash
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

Depois: instale os plugins sugeridos → crie um usuário admin.

### 3. Adicionar credenciais

A pipeline espera três credenciais Jenkins (usadas pelo passo de e-mail).

#### Navegação

**Manage Jenkins** (menu lateral) → **Credentials** → **System** → **Global credentials (unrestricted)** → **Add Credentials** (canto superior direito).

#### Adicionar três credenciais separadas

Para cada uma, configure:

- **Kind:** `Secret text`
- **Secret:** o valor em si
- **ID:** a string exata abaixo (é o que mais importa)
- **Description:** opcional, apenas para sua referência

| ID (deve bater exatamente) | Valor (Secret) |
|----------------------------|----------------|
| `email-user` | seu endereço Gmail (ex.: `voce@gmail.com`) |
| `email-password` | uma **app password** do Gmail — não a senha normal |
| `email-destino` | destinatário do e-mail de sucesso |

Repita **Add Credentials** três vezes, uma por linha.

#### Por que os IDs precisam bater exatamente

O `Jenkinsfile` referencia cada credencial pelo ID:

```groovy
environment {
    EMAIL_USER = credentials('email-user')
    EMAIL_PASSWORD = credentials('email-password')
    EMAIL_DESTINO = credentials('email-destino')
}
```

Se um ID estiver escrito errado (ex.: `email_user` com underline, ou `email-users`), a pipeline falha logo no início com erro de "credentials not found". Use hífens, exatamente como mostrado.

#### Sobre a app password do Gmail

`email-password` deve ser uma **App Password** do Gmail, não a senha da conta. O Gmail bloqueia login SMTP com a senha comum. Para gerar uma:

1. Habilite a **verificação em duas etapas (2FA)** na conta Google.
2. Vá em Conta Google → Segurança → **App passwords** (Senhas de app).
3. Gere uma, copie o código de 16 caracteres e cole como o secret de `email-password`.

O `send_email.py` usa `smtp.gmail.com:465` com SSL, então precisa dessa app password para autenticar.

### 4. Criar o job da pipeline

- **New Item → Pipeline** (dê qualquer nome)
- Em **Pipeline → Definition**, escolha **Pipeline script from SCM**
- **SCM:** Git
- **Repository URL:** URL do seu fork ou do upstream (ex.: `https://github.com/guilherme-fmb/Projeto-DevOps`)
- **Branch:** `*/master`
- **Script Path:** `Jenkinsfile` (padrão)
- Salve

### 5. Executar

Clique em **Build Now**. As 6 stages rodam em ordem: instalar dependências → testes → cobertura → build do Docker → salvar tarball → enviar e-mail.

### 6. Conferir os resultados

- **Console Output** para os logs
- **Artifacts** na página do build: `task-manager.tar`, `backend/coverage.xml`, `backend/htmlcov/`
- Um e-mail de sucesso chega em `EMAIL_DESTINO` se tudo passar

### Observações

- Se o passo de e-mail falhar (ex.: Gmail rejeitar o login), a pipeline inteira falha — mesmo que testes e build tenham passado.
- O container do Jenkins roda com `privileged: true` e usa o daemon Docker do host, então `docker build` dentro do Jenkins de fato constrói no seu host.
- Para o SMTP funcionar, é preciso habilitar **2FA + app password** na conta Gmail usada em `EMAIL_USER`.

---

## Uso de IAs

Utilizamos os seguintes modelos de LLM em pair programming:

### Anthropic
- Opus 4.6, 4.7, 4.8
- Sonnet 4.6
- effort variado
### OpenAI
- GPT-5.2

---

## Licença

MIT
