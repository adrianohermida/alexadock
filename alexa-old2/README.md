# Lawdesk AI Ecosystem

Este repositório contém o código-fonte completo do Ecossistema Lawdesk AI, uma solução integrada para escritórios de advocacia que combina assistentes de voz (Alexa), um sistema de gestão jurídica (Lawdesk), Inteligência Artificial Generativa (RAG com orquestração de LLMs) e automação IoT.

## Estrutura do Repositório

O projeto está organizado nas seguintes pastas:

- `frontend/`: Contém o Dashboard Web desenvolvido com Vite (React) para gerenciamento administrativo, visualização de logs e interação com a IA.
- `backend/`: Contém a API FastAPI em Python, que serve como o coração do ecossistema, orquestrando as interações entre os diferentes componentes, gerenciando o banco de dados e a lógica de IA.
- `alexa-skill/`: Contém o código da função AWS Lambda (Node.js) para a Alexa Skill, responsável por processar os comandos de voz e interagir com o backend.
- `iot-esp32/`: Contém o código Arduino para o controlador ESP32, que permite a automação de dispositivos físicos (ex: ar-condicionado) via infravermelho.
- `docs/`: Documentação adicional, diagramas e guias de implantação.

## Configuração e Execução

Existem duas formas principais de configurar e executar o Ecossistema Lawdesk AI:

1.  **Usando Docker (Recomendado para Produção e Desenvolvimento Rápido)**: A maneira mais fácil e portátil de subir todos os serviços.
2.  **Configuração Manual (Para Desenvolvimento Detalhado)**: Para quem deseja ter controle total sobre cada ambiente.

### Pré-requisitos

Certifique-se de ter as seguintes ferramentas instaladas:

-   **Git**
-   **Docker** e **Docker Compose** (para a opção Docker)
-   **Python 3.9+** e `pip` (para configuração manual do backend)
-   **Node.js 18+** e `npm` ou `yarn` (para configuração manual do frontend e Alexa Skill)
-   **PostgreSQL** (servidor de banco de dados, se não usar Docker)
-   **Ollama** (instalado e com o modelo `llama3` ou similar para IA local, se não usar Docker)
-   **Conta AWS** (para Alexa Skill e Lambda)
-   **Chave de API OpenAI**
-   **Arduino IDE** (para o ESP32)

### 1. Clonar o Repositório

```bash
git clone https://github.com/seu-usuario/lawdesk-ai-ecosystem.git
cd lawdesk-ai-ecosystem
```

### 2. Configuração e Execução com Docker (Recomendado)

Esta é a forma mais rápida de colocar o sistema em funcionamento. Certifique-se de ter o Docker e o Docker Compose instalados.

1.  **Crie o arquivo `.env` principal:**
    Crie um arquivo `.env` na raiz do projeto (`lawdesk-ai-ecosystem/.env`) com suas variáveis de ambiente. Você pode usar o `.env.example` como base:
    ```ini
    # Variáveis para o Backend
    DATABASE_URL=postgresql://user:password@db:5432/lawdesk_db
    SECRET_KEY=sua_chave_secreta_muito_segura_aqui_mude_em_producao
    OPENAI_API_KEY=sk-sua_chave_openai
    OLLAMA_BASE_URL=http://ollama:11434
    OLLAMA_MODEL=llama3
    ESP32_BASE_URL=http://host.docker.internal:8001 # Ou o IP real do seu ESP32 na rede

    # Variáveis para o Frontend (Vite)
    VITE_API_URL=http://localhost:8000
    ```
    *Substitua os valores pelos seus dados. A `SECRET_KEY` deve ser uma string longa e aleatória.* A `OPENAI_API_KEY` é necessária para o AI Router usar a OpenAI. O `OLLAMA_BASE_URL` e `OLLAMA_MODEL` são para a IA local.

2.  **Inicie os serviços com Docker Compose:**
    ```bash
    docker-compose up --build -d
    ```
    Este comando irá construir as imagens, criar os contêineres para o banco de dados (PostgreSQL), backend (FastAPI), frontend (Vite/Nginx) e Ollama, e iniciá-los em segundo plano.

3.  **Acessar o Dashboard:**
    Após os serviços subirem, o Dashboard Web estará disponível em `http://localhost`.
    O backend FastAPI estará disponível em `http://localhost:8000` (para testes de API).

4.  **Inicializar o Banco de Dados (após o primeiro `up`):**
    Para criar as tabelas no PostgreSQL (dentro do contêiner do backend):
    ```bash
    docker-compose exec backend python -c "from database import Base, engine; from models import Processo, LogEvento, Usuario; Base.metadata.create_all(bind=engine)"
    ```

5.  **Baixar o modelo do Ollama (após o primeiro `up`):**
    Para baixar o modelo `llama3` (ou o que você configurou) no contêiner do Ollama:
    ```bash
    docker-compose exec ollama ollama pull llama3
    ```

### 3. Configuração e Execução Manual (Alternativa)

Se você preferir configurar cada componente manualmente, siga estes passos:

1.  **Execute o script de setup inicial:**
    ```bash
    chmod +x setup.sh
    ./setup.sh
    ```
    Este script irá criar ambientes virtuais e instalar as dependências para o backend, frontend e alexa-skill. Ele também criará os arquivos `.env` a partir dos `.env.example` em cada pasta, que você precisará editar.

2.  **Configuração do Backend (Python FastAPI):**
    Navegue até `backend/`.
    Edite o arquivo `.env` com suas credenciais de banco de dados (PostgreSQL) e chaves de API.
    Ative o ambiente virtual (`source venv/bin/activate`) e execute:
    ```bash
    python -c "from database import Base, engine; from models import Processo, LogEvento, Usuario; Base.metadata.create_all(bind=engine)"
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    ```

3.  **Configuração do Frontend (Vite React):**
    Navegue até `frontend/`.
    Edite o arquivo `.env` para apontar para o seu backend FastAPI.
    Execute:
    ```bash
    npm run dev
    ```

4.  **Configuração da Alexa Skill (AWS Lambda):**
    Navegue até `alexa-skill/`.
    Instale as dependências (`npm install`).
    Siga as instruções detalhadas na documentação da Fase 2 para configurar a função Lambda na AWS e a Alexa Skill no console do desenvolvedor. Lembre-se de que a função Lambda precisará acessar o seu backend FastAPI, então ele deve estar publicamente acessível ou configurado em uma VPC.

5.  **Configuração do Controlador IoT (ESP32):**
    Navegue até `iot-esp32/`.
    Abra o `esp32_ir_controller.ino` na Arduino IDE.
    Instale as bibliotecas necessárias (`WiFi`, `HTTPClient`, `IRremoteESP8266`).
    Configure suas credenciais Wi-Fi e o URL **público** do seu backend FastAPI no código.
    Faça o upload para o seu ESP32.

## Uso do Ecossistema

-   **Alexa:** Use comandos de voz como "Alexa, qual o status do processo do cliente [Nome do Cliente]?", "Alexa, ligar o ar a 22 graus", "Alexa, perguntar ao Lawdesk: [Sua pergunta jurídica]".
-   **Dashboard Web:** Acesse `http://localhost` (com Docker) ou `http://localhost:5173` (manual) para gerenciar usuários, processos, adicionar documentos à IA e visualizar logs de auditoria.

## Considerações de Implantação em Produção

Para um ambiente de produção, além do Docker, considere:

-   **HTTPS:** Use HTTPS para a API FastAPI e o Dashboard Web.
-   **Servidor WSGI:** Utilize Gunicorn ou Uvicorn com workers para o FastAPI.
-   **Proxy Reverso:** Configure Nginx ou Apache para servir o frontend e rotear requisições para o backend.
-   **Segurança:** Reforce as variáveis de ambiente, especialmente `SECRET_KEY`.
-   **Domínio:** Configure um domínio próprio para a API e o Dashboard.
-   **Escalabilidade:** Para o ChromaDB, considere uma solução de banco de dados vetorial em nuvem para alta disponibilidade e escalabilidade.

## Licença

Este projeto está licenciado sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

**Brasília, 26 de Março de 2026.**

(Assinatura Eletrônica)
**Dr. Adriano Menezes Hermida Maia**
OAB 8894AM | 476963SP | 107048RS | 75394DF

## 4. Opções de Deploy do Frontend (Dashboard Web)

Para o deploy do frontend (Dashboard Web), o **Cloudflare Pages é a opção mais recomendada** devido ao suporte a funções serverless (Workers) que podem atuar como proxy para o backend FastAPI, resolvendo problemas de CORS e unificando o domínio. O GitHub Pages é uma alternativa mais simples, mas com limitações para aplicações dinâmicas.

### 4.1. Deploy com Cloudflare Pages (Recomendado)

O Cloudflare Pages oferece uma plataforma robusta para hospedar seu frontend React/Vite, com deploy contínuo e a capacidade de usar Cloudflare Workers para funcionalidades de backend na borda.

1.  **Crie um Projeto no Cloudflare Pages:**
    *   Acesse o painel do Cloudflare e vá para "Pages".
    *   Conecte seu repositório GitHub (`adrianohermida/alexadock`).
    *   Configure o projeto:
        *   **Nome do Projeto:** `lawdesk-ai-dashboard` (ou outro de sua preferência)
        *   **Framework Preset:** `Vite`
        *   **Comando de Build:** `npm run build`
        *   **Diretório de Build:** `frontend/dist`
        *   **Diretório Raiz:** `frontend`

2.  **Configuração de Variáveis de Ambiente (para Workers):**
    *   No painel do Cloudflare Pages, vá para "Settings" -> "Environment variables".
    *   Adicione as seguintes variáveis (necessárias para o `api-proxy.js`):
        *   `API_HOSTNAME`: O hostname do seu backend FastAPI (ex: `api.seusistema.com` ou o IP público do seu servidor).
        *   `API_PORT`: A porta do seu backend FastAPI (ex: `8000`).

3.  **Configuração de Funções (Workers):**
    *   O arquivo `frontend/functions/api-proxy.js` já está configurado para atuar como um proxy. Ele interceptará requisições para `/api/*` e as redirecionará para o seu backend FastAPI.
    *   O arquivo `frontend/public/_routes.json` define essa regra de roteamento.
    *   O arquivo `frontend/public/_redirects` garante que todas as rotas da SPA sejam tratadas corretamente.

4.  **Deploy:**
    *   O Cloudflare Pages fará o deploy automaticamente a cada push para a branch `main`.

### 4.2. Deploy com GitHub Pages (Alternativa Simples)

Esta opção é mais simples, mas não oferece o mesmo nível de integração com o backend via proxy ou funções serverless. É adequada se o frontend for puramente estático ou se a comunicação com o backend for feita de outra forma (ex: CORS configurado diretamente no backend para o domínio do GitHub Pages).

1.  **Crie um Workflow de GitHub Actions:**
    *   O arquivo `.github/workflows/github-pages.yml` já está configurado para automatizar o deploy.
    *   Ele irá construir o seu projeto Vite e publicá-lo na branch `gh-pages` do seu repositório.

2.  **Ative o GitHub Pages:**
    *   No seu repositório GitHub, vá para "Settings" -> "Pages".
    *   Em "Source", selecione a branch `gh-pages` e a pasta `/ (root)`. Salve.

3.  **Deploy:**
    *   A cada push para a branch `main`, o GitHub Actions irá rodar o workflow e atualizar seu site no GitHub Pages.

**Observação:** Para que o frontend no GitHub Pages consiga se comunicar com o backend FastAPI, você precisará garantir que o backend esteja acessível publicamente e que as configurações de CORS no `main.py` do FastAPI permitam requisições do domínio do GitHub Pages (`https://adrianohermida.github.io/alexadock/`).

---
