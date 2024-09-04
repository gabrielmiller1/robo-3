# Usando a imagem oficial do Node.js como base
FROM node:18-slim

# Instalando dependências necessárias para Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Configurando variável de ambiente para o Puppeteer usar o Chromium instalado
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Definindo o diretório de trabalho
WORKDIR /app

# Copiando arquivos do projeto para o contêiner
COPY . .

# Instalando as dependências do projeto
RUN npm install

# Construindo o projeto Next.js
RUN npm run build

# Expondo a porta 4000
EXPOSE 4000

# Comando para iniciar a aplicação
CMD ["npm", "start"]
