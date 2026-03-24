# Alexa + Claude Code 🗣️→🤖

Controle o Claude Code por voz usando a Alexa. Fala um comando, a Alexa manda pro N8N via webhook, que executa via SSH na sua VPS.

**Fluxo:**
```
"Alexa, abrir jarvis"
    → "executar criar um site em react"
        → Alexa Skill (Lambda)
            → Webhook N8N
                → SSH na VPS
                    → Claude Code executa
```

## Pré-requisitos

- Conta na [Amazon Developer Console](https://developer.amazon.com/alexa/console/ask)
- [N8N](https://n8n.io) rodando (self-hosted ou cloud)
- VPS com SSH habilitado
- Claude Code instalado na VPS
- Chave de API da Anthropic

## Setup passo a passo

### 1. Preparar a VPS

SSH na sua VPS como root e crie um usuário dedicado (Claude Code não roda como root com `--dangerously-skip-permissions`):

```bash
# Criar usuário
useradd -m -s /bin/bash claude

# Instalar Claude Code
su - claude -c "curl -fsSL https://cli.claude.ai/install.sh | sh"

# Criar pasta de projetos
mkdir -p /home/claude/projetos
chown claude:claude /home/claude/projetos

# Testar
su - claude -c 'export ANTHROPIC_API_KEY=sua-chave-aqui && claude --version'
```

### 2. Configurar o N8N

1. Importe o arquivo `n8n-workflow.json` no seu N8N
2. No node **SSH → Claude Code**, atualize:
   - `host`: IP da sua VPS
   - `username` e `password`: credenciais SSH
   - `ANTHROPIC_API_KEY`: sua chave da Anthropic
3. Ative o workflow
4. Teste o webhook manualmente:

```bash
curl -X POST https://seu-n8n.com/webhook/alexa-claude \
  -H "Content-Type: application/json" \
  -d '{"task": "listar arquivos do projeto"}'
```

### 3. Criar a Skill na Alexa

1. Acesse [developer.amazon.com/alexa/console/ask](https://developer.amazon.com/alexa/console/ask)
2. Clique **Create Skill**
3. Nome: `Jarvis` (ou o que preferir)
4. Modelo: **Custom**
5. Backend: **Alexa-hosted (Node.js)**
6. Template: **Hello World**

### 4. Interaction Model

1. No menu lateral, vá em **Interaction Model → JSON Editor**
2. Apague tudo e cole o conteúdo de `alexa/interaction-model.json`
3. Clique **Save**
4. Clique **Build Model** (espere ~30s)

> O `invocationName` padrão é `"jarvis"`. Mude para o que quiser.

### 5. Código Lambda

1. Vá na aba **Code**
2. Abra `index.js`
3. Apague tudo e cole o conteúdo de `alexa/lambda.js`
4. **Importante:** atualize a variável `WEBHOOK_URL` com a URL do seu webhook N8N
5. Clique **Save**
6. Clique **Deploy** (espere ~15s)

### 6. Testar

1. Vá na aba **Test**
2. Mude o dropdown de **Off** para **Development**
3. Digite: `abrir jarvis`
4. Resposta: *"Jarvis ativado. O que você quer que eu faça?"*
5. Digite: `executar criar um site em react`
6. Resposta: *"Certo, executando: criar um site em react"*
7. Confira no N8N se o webhook recebeu e o Claude Code executou

Se funcionar no console, já funciona automaticamente na sua Alexa física (mesma conta Amazon).

## Estrutura do repo

```
alexa-claude-code/
├── README.md
├── alexa/
│   ├── interaction-model.json   # Model JSON (cola no JSON Editor)
│   ├── lambda.js                # Código da Lambda (cola no index.js)
│   └── package.json             # Dependências da Lambda
├── n8n/
│   └── workflow.json            # Workflow N8N (importar)
└── assets/
    ├── icon-108.svg             # Ícone pequeno da skill (108x108)
    └── icon-512.svg             # Ícone grande da skill (512x512)
```

## Como funciona

1. **Alexa** recebe o comando de voz e extrai o texto via `ExecutarIntent` com slot `tarefa` (tipo `AMAZON.SearchQuery` — captura texto livre)
2. **Lambda** faz POST do texto para o webhook do N8N e responde imediatamente à Alexa (timeout da Alexa é 8s)
3. **N8N** recebe o webhook, responde 200 OK instantaneamente e executa o SSH em background
4. **SSH** roda `claude --continue --dangerously-skip-permissions -p "comando"` como usuário não-root
5. `--continue` mantém o contexto entre chamadas — cada comando continua a conversa anterior

## Flags importantes do Claude Code

| Flag | O que faz |
|---|---|
| `-p "texto"` | Modo não-interativo (print mode) — executa e retorna |
| `--continue` | Continua a última conversa (mantém contexto) |
| `--dangerously-skip-permissions` | Pula confirmações (necessário para automação) |

## Limitações

- **Timeout da Alexa:** 8 segundos — por isso o N8N responde antes de executar
- **Sem feedback de resultado:** a Alexa não espera o Claude terminar. Para receber o resultado, adicione uma notificação (Telegram, email, push) no final do workflow do N8N
- **Não roda como root:** Claude Code bloqueia `--dangerously-skip-permissions` com root por segurança

## Próximos passos

- [ ] Adicionar notificação quando o Claude terminar (Telegram/WhatsApp/email)
- [ ] Adicionar intent "status" para consultar se a última tarefa terminou
- [ ] Adicionar intent "nova sessão" para iniciar conversa limpa

## Créditos

Criado por [@celoanders](https://instagram.com/celoia)
