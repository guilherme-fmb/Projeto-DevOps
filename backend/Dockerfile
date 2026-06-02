# Imagem base
FROM python:3.11

# Diretório de trabalho
WORKDIR /app

# Copiar arquivos para o container
COPY . .

# Instalar dependências
RUN pip install -r requirements.txt

# Porta 
EXPOSE 5000

# Comando de execução
CMD ["python", "app.py"]