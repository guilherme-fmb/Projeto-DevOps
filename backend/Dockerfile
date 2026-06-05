# Imagem base
FROM python:3.11-slim

# Diretório de trabalho
WORKDIR /app

# Copiar apenas requirements.txt primeiro para aproveitar o cache de layers
COPY requirements.txt .

# Instalar dependências
RUN pip install --no-cache-dir -r requirements.txt

# Copiar o restante do código
COPY . .

# Porta
EXPOSE 5000

# Comando de execução
CMD ["python", "app.py"]