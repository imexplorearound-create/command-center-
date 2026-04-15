# COMMAND CENTER — Addendum: Client Feedback Loop
# Extensão ao documento principal (command-center-spec-v1.2.md)
# Versão: 1.0
# Data: 9 Abril 2026

---

## 1. CONTEXTO

Este documento estende o Command Center (spec v1.2) com o módulo Client Feedback Loop. O objetivo é fechar o ciclo entre quem testa o produto e quem o desenvolve: o cliente navega na aplicação, dá feedback por voz e interação, e tudo chega ao Command Center como material estruturado pronto para triagem AI e validação humana.

### Problema

Atualmente, o feedback dos clientes (Sérgio, Nuno, Márcia) chega por calls, mensagens no WhatsApp, ou emails. Perde-se contexto — "aquele botão que não funciona" sem saber qual botão, em que ecrã, em que circunstância. O developer perde tempo a reproduzir problemas que o cliente já viu acontecer.

### Princípio

O cliente não deve ter que descrever tecnicamente o que viu. Ele navega, fala, e o sistema captura tudo. A AI transforma interação bruta em informação estruturada. O developer recebe um pacote completo: o que aconteceu, onde, quando, e o que o cliente disse — pronto para decidir e agir.

### Referências ao documento principal

- Secção 2.4 (Integrações) — adicionar Feedback Extension como nova fonte de dados
- Secção 3.1 (Modelo de dados) — novas tabelas feedback_sessions, feedback_items
- Secção 4.1 (Mapa Geral) — novo satélite "Feedback"
- Secção 4.2 (Vista de Projeto) — novo separador "Feedback"
- Secção 5.2 (Sync jobs) — novo job process-feedback
- Secção 6 (API) — novos endpoints
- Secção 10 (Deploy) — nova variável WHISPER_API_KEY

---

## 2. ARQUITETURA

### 2.1 Visão geral — dois componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                  EXTENSÃO CHROME (no browser do cliente)         │
│                                                                 │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────────┐    │
│  │ Botão    │  │ Gravação     │  │ Gravação de voz        │    │
│  │ Feedback │  │ cursor/DOM   │  │ (MediaRecorder API)    │    │
│  │ (toggle) │  │ (rrweb)      │  │ Atalho: Ctrl+Ctrl      │    │
│  └──────────┘  └──────────────┘  └────────────────────────┘    │
│                        │                                        │
│              ┌─────────┴─────────┐                             │
│              │  Pacote de sessão │                             │
│              │  (eventos + áudio)│                             │
│              └─────────┬─────────┘                             │
│                        │ POST /api/feedback/sessions            │
└────────────────────────┼────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  COMMAND CENTER (backend + frontend)             │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐    │
│  │ Receber &    │  │ Transcrição  │  │ Triagem AI        │    │
│  │ armazenar    │→ │ (Whisper)    │→ │ (Claude Sonnet)   │    │
│  │ sessão       │  │              │  │                   │    │
│  └──────────────┘  └──────────────┘  └─────────┬─────────┘    │
│                                                 │              │
│                                    ┌────────────┴────────┐     │
│                                    │  Inbox de Feedback  │     │
│                                    │  (vista developer)  │     │
│                                    └────────────┬────────┘     │
│                                                 │              │
│                                    ┌────────────┴────────┐     │
│                                    │  Validar → Tarefa   │     │
│                                    │  no Kanban           │     │
│                                    └─────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Fluxo completo passo a passo

1. O cliente abre a aplicação (ex: AURA PMS no VPS) no Chrome
2. Clica no ícone da extensão → ativa modo de feedback
3. Um banner discreto aparece no topo: "Sessão de feedback ativa — Ctrl+Ctrl para gravar nota de voz"
4. O cliente navega normalmente. A extensão grava eventos DOM (rrweb): movimentos de cursor, cliques, scrolls, navegação entre páginas, tempo de permanência
5. A qualquer momento, o cliente pressiona Ctrl+Ctrl → começa a gravar voz. Pressiona novamente → para. O áudio fica ancorado ao timestamp e posição do cursor naquele momento
6. O cliente pode gravar múltiplas notas de voz durante a sessão
7. Quando termina, clica no ícone da extensão → "Terminar sessão"
8. A extensão empacota tudo (eventos rrweb + clips de áudio + metadados) e envia para o Command Center via API
9. O backend recebe, armazena, e dispara o pipeline de processamento (async):
   - Transcreve cada clip de áudio (Whisper API)
   - Gera um resumo estruturado da sessão (Claude Sonnet): páginas visitadas, ações do cursor, notas de voz transcritas com contexto, e classificação automática
10. O resultado aparece na Inbox de Feedback do Command Center
11. O developer abre, revê, e com um clique converte em tarefa no Kanban

---

## 3. EXTENSÃO CHROME

### 3.1 Estrutura

```
feedback-extension/
├── manifest.json          # Manifest V3
├── popup.html             # UI do popup (start/stop sessão)
├── popup.js               # Lógica do popup
├── content-script.js      # Injetado na página — grava rrweb + voz
├── background.js          # Service worker — gere estado e envio
├── icons/                 # Ícones 16, 48, 128px
└── lib/
    └── rrweb.min.js       # Biblioteca de gravação DOM
```

### 3.2 Manifest V3

```json
{
  "manifest_version": 3,
  "name": "Command Center Feedback",
  "version": "1.0.0",
  "description": "Captura feedback de clientes para o Command Center",
  "permissions": [
    "activeTab",
    "storage"
  ],
  "host_permissions": [
    "https://*.dominio.pt/*",
    "http://91.99.211.238:*/*"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["https://*.dominio.pt/*", "http://91.99.211.238:*/*"],
      "js": ["lib/rrweb.min.js", "content-script.js"]
    }
  ],
  "background": {
    "service_worker": "background.js"
  }
}
```

**Nota:** O `host_permissions` deve ser configurável por instalação. No futuro, quando o produto for vendido a terceiros, cada cliente terá os seus domínios. Para o MVP, ficam os domínios internos.

### 3.3 Gravação de interação (rrweb)

A extensão usa [rrweb](https://github.com/rrweb-io/rrweb) para capturar eventos DOM. Não grava vídeo — grava eventos estruturados (mais leve, pesquisável, e processável por AI).

```javascript
// content-script.js (simplificado)
let events = [];
let stopRecording = null;

function startRecording() {
  events = [];
  stopRecording = rrweb.record({
    emit(event) {
      events.push(event);
    },
    // Não gravar inputs de password ou dados sensíveis
    maskAllInputs: true,
    // Gravar apenas interações relevantes
    recordCanvas: false,
    sampling: {
      mousemove: 50,    // Captura posição a cada 50ms
      mouseInteraction: true,
      scroll: 150,      // Captura scroll a cada 150ms
      input: 'last'     // Só o valor final de inputs
    }
  });
}
```

### 3.4 Gravação de voz

Atalho: duplo Ctrl (dois presses de Ctrl em menos de 500ms).

```javascript
// content-script.js (simplificado)
let mediaRecorder = null;
let audioChunks = [];
let voiceNotes = [];

document.addEventListener('keydown', (e) => {
  if (e.key === 'Control') {
    handleDoubleCtrl();
  }
});

async function startVoiceNote() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

  const timestamp = Date.now();
  const cursorPosition = getLastCursorPosition(); // da gravação rrweb
  const currentUrl = window.location.href;

  mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
  mediaRecorder.onstop = () => {
    const blob = new Blob(audioChunks, { type: 'audio/webm' });
    voiceNotes.push({
      audio: blob,
      timestamp: timestamp,
      cursor: cursorPosition,
      url: currentUrl,
      page_title: document.title
    });
    audioChunks = [];
  };

  mediaRecorder.start();
  showRecordingIndicator(); // Bolinha vermelha no canto
}
```

### 3.5 Envio da sessão

Quando o cliente termina a sessão, a extensão empacota tudo e envia:

```javascript
// background.js (simplificado)
async function submitSession(sessionData) {
  const formData = new FormData();

  formData.append('project_slug', sessionData.projectSlug);
  formData.append('tester_name', sessionData.testerName);
  formData.append('started_at', sessionData.startedAt);
  formData.append('ended_at', sessionData.endedAt);
  formData.append('start_url', sessionData.startUrl);
  formData.append('events', JSON.stringify(sessionData.rrwebEvents));

  sessionData.voiceNotes.forEach((note, i) => {
    formData.append(`voice_${i}_audio`, note.audio);
    formData.append(`voice_${i}_meta`, JSON.stringify({
      timestamp: note.timestamp,
      cursor: note.cursor,
      url: note.url,
      page_title: note.page_title
    }));
  });

  await fetch(`${CC_API_URL}/api/feedback/sessions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiToken}` },
    body: formData
  });
}
```

### 3.6 Configuração da extensão

No popup da extensão, o cliente configura uma vez:

- **URL do Command Center:** ex: `http://91.99.211.238:3100`
- **Token de acesso:** gerado no Command Center, role "tester"
- **Nome:** para identificar quem deu o feedback
- **Projeto:** dropdown com os projetos disponíveis (carregado via API)

Estes dados ficam guardados no `chrome.storage.sync` e persistem entre sessões.

---

## 4. MODELO DE DADOS

### 4.1 Nova tabela — Sessões de feedback

```sql
CREATE TABLE feedback_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) NOT NULL,
  tester_name VARCHAR(200) NOT NULL,
  tester_id UUID REFERENCES people(id),       -- opcional, se o tester estiver registado
  status VARCHAR(50) DEFAULT 'processing',     -- processing, ready, reviewed, archived
  start_url TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM ended_at - started_at)
  ) STORED,
  pages_visited TEXT[],                        -- lista de URLs visitados
  events_json JSONB,                           -- eventos rrweb (comprimidos)
  ai_summary TEXT,                             -- resumo gerado por AI
  ai_classification JSONB,                     -- { themes: [], modules: [], severity: "..." }
  items_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 Nova tabela — Items de feedback (individuais)

Cada nota de voz ou interação relevante detectada pela AI gera um item:

```sql
CREATE TABLE feedback_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES feedback_sessions(id) NOT NULL,
  type VARCHAR(50) NOT NULL,                   -- voice_note, interaction_anomaly, navigation_issue
  classification VARCHAR(50),                  -- bug, suggestion, question, praise
  module VARCHAR(100),                         -- calendário, reservas, financeiro, etc.
  priority VARCHAR(20),                        -- alta, média, baixa (sugerida por AI)
  timestamp_ms BIGINT,                         -- momento na sessão
  cursor_position JSONB,                       -- { x, y }
  page_url TEXT,
  page_title VARCHAR(300),
  voice_audio_url TEXT,                        -- URL do ficheiro de áudio armazenado
  voice_transcript TEXT,                       -- transcrição Whisper
  ai_summary TEXT,                             -- resumo curto gerado por AI
  context_snapshot JSONB,                      -- elemento DOM onde o cursor estava
  task_id UUID REFERENCES tasks(id),           -- se foi convertido em tarefa
  status VARCHAR(50) DEFAULT 'pending',        -- pending, accepted, rejected, converted
  reviewed_by UUID REFERENCES people(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.3 Índices

```sql
CREATE INDEX idx_feedback_sessions_project ON feedback_sessions(project_id);
CREATE INDEX idx_feedback_sessions_status ON feedback_sessions(status);
CREATE INDEX idx_feedback_items_session ON feedback_items(session_id);
CREATE INDEX idx_feedback_items_classification ON feedback_items(classification);
CREATE INDEX idx_feedback_items_module ON feedback_items(module);
CREATE INDEX idx_feedback_items_status ON feedback_items(status);
```

---

## 5. PIPELINE DE PROCESSAMENTO

### 5.1 Fluxo async (após receber sessão)

```
Sessão recebida (status: processing)
       │
       ▼
┌──────────────────────────────────────┐
│  Step 1: Armazenar áudio            │
│  - Guardar ficheiros .webm em       │
│    /storage/feedback/{session_id}/   │
│  - Gerar URLs de acesso              │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  Step 2: Transcrever voz            │
│  - Whisper API para cada clip       │
│  - Guardar transcrição em           │
│    feedback_items.voice_transcript  │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  Step 3: Analisar sessão (Claude)   │
│  - Input: eventos rrweb + transc.   │
│  - Output:                          │
│    • Resumo da sessão               │
│    • Lista de items detectados      │
│    • Classificação por item:        │
│      - tipo (bug/sugestão/dúvida)   │
│      - módulo afetado               │
│      - prioridade sugerida          │
│    • Temas/padrões recorrentes      │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  Step 4: Criar items                │
│  - Inserir feedback_items           │
│  - Atualizar sessão:               │
│    status → ready                   │
│    items_count → N                  │
│  - Criar alerta no Command Center   │
│    "Nova sessão de feedback do      │
│     Sérgio — 5 items (2 bugs)"     │
└──────────────────────────────────────┘
```

### 5.2 Prompt de triagem AI (Claude Sonnet)

```
Analisa a seguinte sessão de teste de um cliente.

DADOS DA SESSÃO:
- Tester: {tester_name}
- Projeto: {project_name}
- Duração: {duration} minutos
- Páginas visitadas: {pages_visited}

NOTAS DE VOZ (transcritas):
{foreach voice_note}
[{timestamp}] Página: {page_url} | Cursor em: {cursor_position}
"{voice_transcript}"
{/foreach}

EVENTOS DE INTERAÇÃO RELEVANTES:
{filtered_rrweb_events}

TAREFA:
1. Gera um resumo da sessão em 2-3 frases
2. Identifica cada feedback individual e para cada um:
   - classification: bug | suggestion | question | praise
   - module: nome do módulo afetado (ou "geral")
   - priority: alta | média | baixa
   - summary: resumo numa frase
3. Identifica padrões ou temas recorrentes

Responde em JSON.
```

---

## 6. VISTAS NO COMMAND CENTER

### 6.1 Mapa Geral — Satélite "Feedback"

```
┌─ Feedback ──┐
│ 3 sessões    │
│ 8 items      │
│ 2 bugs 🔴   │
└──────────────┘
```

Mostra: sessões da última semana, items pendentes de revisão, bugs não resolvidos.

### 6.2 Inbox de Feedback (nova página)

URL: `/feedback`

Layout: lista de sessões agrupadas por projeto, ordenadas por data (mais recentes primeiro).

```
┌─────────────────────────────────────────────────────────────────┐
│  INBOX DE FEEDBACK                                    [Filtros] │
│                                                                 │
│  ┌─ Sessão: Sérgio — AURA PMS — 12 Abr, 14:32 ──────────────┐│
│  │  Duração: 23 min | 5 items | 2 bugs | 2 sugestões | 1 ❓  ││
│  │  Resumo: "Testou o calendário e a ficha de propriedade.    ││
│  │  Dificuldade com o drag de reservas e sugeriu cores..."    ││
│  │                                                             ││
│  │  🔴 Bug: Drag de reserva não funciona no mobile            ││
│  │     Módulo: Calendário | Prioridade: Alta                  ││
│  │     "Tentei arrastar a reserva e não mexe..."              ││
│  │     [▶ Ouvir] [Ver contexto] [→ Criar tarefa] [✗ Ignorar] ││
│  │                                                             ││
│  │  💡 Sugestão: Código de cores por tipo de reserva          ││
│  │     Módulo: Calendário | Prioridade: Média                 ││
│  │     "Seria fixe se as reservas do Airbnb fossem azuis..."  ││
│  │     [▶ Ouvir] [Ver contexto] [→ Criar tarefa] [✗ Ignorar] ││
│  │                                                             ││
│  │  ❓ Dúvida: Onde alterar o preço por noite?                ││
│  │     Módulo: Pricing | Prioridade: Baixa                    ││
│  │     "Eu queria mudar o preço mas não encontro..."          ││
│  │     [▶ Ouvir] [Ver contexto] [→ Criar tarefa] [✗ Ignorar] ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─ Sessão: Márcia — iPME Digital — 11 Abr, 16:10 ───────────┐│
│  │  ...                                                        ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Ações por item

| Ação | O que acontece |
|---|---|
| **Criar tarefa** | Abre modal pré-preenchido com: título (do ai_summary), descrição (transcrição + contexto), projeto, módulo, prioridade. Developer confirma e cria no Kanban. |
| **Ignorar** | Marca item como rejected. Conta para a aprendizagem da AI (menos falsos positivos no futuro). |
| **Ouvir** | Reproduz o clip de áudio original. |
| **Ver contexto** | Mostra screenshot do momento (gerado a partir dos eventos rrweb) + URL + posição do cursor. Não é replay completo — é um snapshot estático do estado da página naquele timestamp. |

### 6.4 Vista de Projeto — Separador "Feedback"

No detalhe de cada projeto (`/project/[slug]`), um novo tab "Feedback" mostra:

- Estatísticas: total de sessões, items por tipo, taxa de conversão (items → tarefas)
- Lista filtrada dos items desse projeto
- Padrões recorrentes (ex: "3 testers reportaram problemas no calendário mobile")

---

## 7. API — Novos endpoints

```
# Extensão → Command Center
POST   /api/feedback/sessions              # Enviar sessão completa (multipart)

# Frontend Command Center
GET    /api/feedback/sessions              # Listar sessões (?project=, ?status=, ?tester=)
GET    /api/feedback/sessions/:id          # Detalhe de sessão
PATCH  /api/feedback/sessions/:id          # Atualizar status da sessão

GET    /api/feedback/items                 # Listar items (?session=, ?classification=, ?module=, ?status=)
PATCH  /api/feedback/items/:id             # Atualizar item (aceitar, rejeitar)
POST   /api/feedback/items/:id/to-task     # Converter item em tarefa no Kanban

# Extensão — configuração
GET    /api/feedback/config                # Projetos disponíveis para o tester
```

### Autenticação

A extensão usa um Bearer token associado a um utilizador com role "tester". Este token é gerado no Command Center por um admin e tem acesso apenas aos endpoints de feedback.

```
Authorization: Bearer {feedback_token}
X-Tester-Name: Sérgio
```

---

## 8. ALERTAS — Novos tipos

| Condição | Tipo | Severidade |
|---|---|---|
| Nova sessão de feedback processada | feedback_nova_sessao | info |
| Sessão com bugs de prioridade alta | feedback_bug_critico | warning |
| 3+ items no mesmo módulo (padrão detectado) | feedback_padrao | warning |
| Items pendentes de revisão há 48h+ | feedback_pendente | info |

---

## 9. AGENT API — Extensão

Novos endpoints para agentes autónomos consultarem e agirem sobre feedback:

| Endpoint | Método | Função |
|----------|--------|--------|
| `/api/agent/feedback/sessions` | GET | Lista sessões pendentes |
| `/api/agent/feedback/items` | GET | Lista items por classificação/módulo |
| `/api/agent/feedback/items/:id` | PATCH | Atualizar classificação de um item |
| `/api/agent/feedback/patterns` | GET | Padrões recorrentes detectados |

Isto permite que um agente Project Manager faça triagem automática quando o Trust Score for suficientemente alto.

---

## 10. DEPLOY

### Novas variáveis de ambiente

```
WHISPER_API_KEY=sk-...           # OpenAI Whisper API
FEEDBACK_STORAGE_PATH=/storage/feedback   # Onde guardar áudio
FEEDBACK_MAX_SESSION_MB=50       # Tamanho máximo por sessão
```

### Storage

Os ficheiros de áudio são guardados no filesystem do VPS:

```
/storage/feedback/
└── {session_id}/
    ├── voice_0.webm
    ├── voice_1.webm
    └── session_events.json.gz    # Eventos rrweb comprimidos
```

Para o MVP, filesystem local é suficiente. Para escalar (mais clientes, mais projetos), migrar para S3/MinIO.

---

## 11. FASEAMENTO

### Fase 1 — MVP (2-3 semanas)

- [ ] Extensão Chrome funcional: gravar cursor (rrweb) + voz + enviar
- [ ] API de receção no Command Center
- [ ] Transcrição com Whisper
- [ ] Triagem AI básica (classificação por tipo e módulo)
- [ ] Inbox de feedback no frontend (lista + ações)
- [ ] Conversão item → tarefa com um clique

### Fase 2 — Melhorias (2 semanas)

- [ ] Snapshot visual do momento (render estático a partir do rrweb)
- [ ] Detecção de padrões recorrentes entre sessões
- [ ] Métricas no separador "Feedback" do projeto
- [ ] Satélite "Feedback" no dashboard
- [ ] Notificação ao developer quando sessão é processada

### Fase 3 — Escalabilidade (quando necessário)

- [ ] Migrar áudio para S3/MinIO
- [ ] Extensão configurável por domínio (para vender a terceiros)
- [ ] Replay visual completo (rrweb player embebido)
- [ ] Agente AI autónomo para triagem (com Trust Score)
- [ ] Portal de feedback para o tester ver o estado dos seus reports

---

## 12. DECISÕES PARA DISCUTIR COM O BRUNO

1. **Whisper API vs. local** — a API da OpenAI é mais fácil mas tem custo. O Whisper pode correr localmente no VPS se houver recursos.
2. **Tamanho dos eventos rrweb** — sessões longas (30+ min) geram muitos dados. Definir limite ou comprimir agressivamente?
3. **Domínios na extensão** — para já hardcoded, mas precisa de ser dinâmico quando houver mais clientes.
4. **Chrome Web Store** — publicar na store (mais fácil de instalar) ou distribuir como ficheiro .crx (mais controlo)?
5. **Permissão de microfone** — o Chrome vai pedir permissão na primeira vez. Incluir instruções para o cliente?
6. **Dados sensíveis** — o `maskAllInputs: true` do rrweb mascara todos os inputs. É suficiente ou há campos específicos que precisam de tratamento especial?

---

*Documento gerado a 9 de Abril de 2026. Versão 1.0.*
*Extensão ao command-center-spec-v1.2.md. Para ser usado como especificação de desenvolvimento com Claude Code.*
