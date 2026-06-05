# Imagem base
FROM python:3.11-slim

# Diretório de trabalho
WORKDIR /app

# Copiar arquivos para o container
COPY . .

# Porta 
EXPOSE 8080

# Comando de execução
CMD ["python", "-m", "http.server", "8080"]