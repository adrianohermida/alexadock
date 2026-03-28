#!/bin/bash

# Script de configuração inicial para o Ecossistema Lawdesk AI

# Cores para saída do terminal
GREEN=\033[0;32m
YELLOW=\033[0;33m
RED=\033[0;31m
NC=\033[0m # Sem cor

echo -e "${GREEN}Iniciando configuração do Ecossistema Lawdesk AI...${NC}"

# --- Configuração do Backend ---
echo -e "\n${YELLOW}Configurando Backend (Python FastAPI)...${NC}"
cd backend || { echo -e "${RED}Erro: Pasta backend não encontrada!${NC}"; exit 1; }

# Criar ambiente virtual se não existir
if [ ! -d "venv" ]; then
    echo "Criando ambiente virtual..."
    python3 -m venv venv
fi

source venv/bin/activate

# Instalar dependências
echo "Instalando dependências do Python..."
pip install --upgrade pip
pip install -r requirements.txt

# Criar .env se não existir
if [ ! -f ".env" ]; then
    echo "Criando arquivo .env a partir de .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}Por favor, edite o arquivo backend/.env com suas credenciais!${NC}"
fi

deactivate
cd ..

# --- Configuração do Frontend ---
echo -e "\n${YELLOW}Configurando Frontend (Vite React)...${NC}"
cd frontend || { echo -e "${RED}Erro: Pasta frontend não encontrada!${NC}"; exit 1; }

# Instalar dependências do Node.js
echo "Instalando dependências do Node.js..."
npm install

# Criar .env se não existir
if [ ! -f ".env" ]; then
    echo "Criando arquivo .env a partir de .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}Por favor, edite o arquivo frontend/.env se necessário!${NC}"
fi

cd ..

# --- Configuração da Alexa Skill ---
echo -e "\n${YELLOW}Configurando Alexa Skill (Node.js)...${NC}"
cd alexa-skill || { echo -e "${RED}Erro: Pasta alexa-skill não encontrada!${NC}"; exit 1; }

# Instalar dependências do Node.js
echo "Instalando dependências do Node.js para Alexa Skill..."
npm install

cd ..

echo -e "\n${GREEN}Configuração inicial concluída!${NC}"
echo -e "${GREEN}Próximos passos:${NC}"
echo "1. Edite os arquivos .env nas pastas backend/ e frontend/ com suas credenciais e URLs."
echo "2. Para iniciar o projeto com Docker: ${YELLOW}docker-compose up --build${NC}"
echo "3. Para iniciar o projeto sem Docker (desenvolvimento):"
echo "   - Backend: cd backend && source venv/bin/activate && uvicorn main:app --reload"
echo "   - Frontend: cd frontend && npm run dev"
