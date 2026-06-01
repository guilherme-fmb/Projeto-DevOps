# Task Manager API

Uma API simples e eficiente para gerenciamento de tarefas, construída com Flask e SQLAlchemy.

## 📋 Características

- ✅ Criação, leitura, atualização e exclusão de tarefas
- ✅ Banco de dados SQLite integrado
- ✅ API RESTful
- ✅ Testes automatizados
- ✅ Estrutura modular e escalável

## 🛠️ Pré-requisitos

- Python 3.8 ou superior
- pip (gerenciador de pacotes Python)
- Virtual environment (recomendado)

## 📦 Instalação

### 1. Clone ou acesse o repositório
```bash
cd backend
```

### 2. Crie um ambiente virtual
```bash
python -m venv venv
```

### 3. Ative o ambiente virtual

**Windows:**
```bash
venv\Scripts\activate
```

**macOS/Linux:**
```bash
source venv/bin/activate
```

### 4. Instale as dependências
```bash
pip install -r requirements.txt
```

## 🚀 Como Executar

Com o ambiente virtual ativado, execute:

```bash
python app.py
```

A API estará disponível em `http://localhost:5000`

## 📡 Endpoints da API

### GET `/`
Retorna uma mensagem de boas-vindas da API.

**Resposta:**
```json
{
  "message": "Task Manager API"
}
```

## 📁 Estrutura do Projeto

```
backend/
├── app.py                 # Arquivo principal da aplicação Flask
├── database.py           # Configuração do banco de dados
├── models.py             # Definição do modelo de dados (Task)
├── routes.py             # Definição das rotas da API
├── requirements.txt      # Dependências do projeto
├── tests/                # Testes automatizados
└── README.md            # Este arquivo
```

## 📚 Estrutura da API

### Modelo de Dados - Task

| Campo       | Tipo    | Descrição                          |
|-------------|---------|-----------------------------------|
| id          | Integer | Identificador único (chave primária) |
| title       | String  | Título da tarefa (obrigatório)    |
| description | String  | Descrição da tarefa (opcional)    |
| status      | String  | Status da tarefa (padrão: "pending") |

## 🔧 Dependências

- **Flask 3.0.2** - Framework web Python
- **Flask-SQLAlchemy 3.1.1** - ORM para gerenciamento de banco de dados
- **psycopg2-binary 2.9.9** - Adaptador PostgreSQL (compatibilidade futura)

## ⚙️ Configuração

### Variáveis de Ambiente Principais

No arquivo `app.py`, você pode configurar:

```python
# Banco de dados
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///tasks.db"

# Rastreamento de modificações
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Host e porta do servidor
host="0.0.0.0"
port=5000
```

## 🧪 Testes

Para executar os testes da aplicação:

```bash
python -m pytest tests/
```

## 💡 Desenvolvimento

### Modo Debug
O servidor está configurado para executar em modo debug por padrão (`debug=True`), permitindo:
- Recarregamento automático ao salvar arquivos
- Debugger interativo para erros

### Adicionar Novas Rotas

1. Edite o arquivo `routes.py`
2. Crie uma nova função de rota
3. Registre-a com o decorator `@api.route()`

Exemplo:
```python
@api.route("/tasks", methods=["GET"])
def get_tasks():
    # implementação
    pass
```

## 🐳 Docker (Opcional)

Para contenerizar a aplicação, crie um `Dockerfile`:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "app.py"]
```
