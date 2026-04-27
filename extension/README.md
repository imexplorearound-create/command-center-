# Command Center Feedback — Extensão Chrome

Extensão para gravar **notas de voz** + **eventos de UI** + **screenshots** enquanto testas projectos. Quando carregas no botão 🎤 flutuante, a extensão grava o teu microfone, captura tudo o que clicas/escreves, e tira um screenshot final. No fim, envia tudo para o Command Center, transcreve o áudio e cria um item de feedback que pode virar uma task para o developer.

**Versão actual:** 1.7.0

---

## Índice

- [Para testers — Como usar](#para-testers--como-usar)
  - [Instalar](#1-instalar-a-extensão)
  - [Login](#2-fazer-login)
  - [Adicionar workspace](#3-adicionar-o-teu-workspace-de-teste)
  - [Gravar uma nota](#4-gravar-uma-nota-de-feedback)
  - [Screenshots manuais](#5-screenshots-manuais)
  - [Privacidade](#6-privacidade--o-que-nunca-é-capturado)
  - [Sem rede](#7-sem-rede-sem-problema)
- [Para gestores — Triagem em /feedback](#para-gestores--triagem-em-feedback)
- [Ciclo completo](#ciclo-completo-do-feedback)
- [Para developers — Estrutura técnica](#para-developers--estrutura-técnica)

---

## Para testers — Como usar

### 1. Instalar a extensão

**Opção A — Load unpacked (desenvolvimento)**
1. Descompacta o ficheiro `command-center-feedback.zip`
2. Abre `chrome://extensions` no Chrome
3. Activa **Developer mode** (canto superior direito)
4. Carrega **Load unpacked** e selecciona a pasta descompactada
5. Confirma que aparece "Command Center Feedback" com a versão **1.7.0**

**Opção B — .crx assinado** (quando disponível)
- Faz duplo-clique no ficheiro `.crx` e confirma

### 2. Fazer login

1. Clica no ícone da extensão (canto superior direito do Chrome)
2. **Server URL** — confirma que aponta para o Command Center que te foi indicado (ex: `http://91.99.211.238:3100`)
3. **Email** + **Password** — credenciais que recebeste do Command Center
4. Carrega **Entrar**

A sessão dura **30 dias** — só precisas de fazer login uma vez por mês.

### 3. Adicionar o teu workspace de teste

Um *workspace* é um par (URL, slug do projecto). Cada projecto que vais testar precisa de ser adicionado uma vez.

1. No popup, em **Workspaces**, preenche:
   - **URL** — o link do projecto (ex: `https://staging.aura.com`)
   - **Slug do projecto** — o identificador que te foi dado (ex: `aura-pms`)
2. Carrega **Adicionar**
3. O Chrome mostra um prompt nativo: *"A extensão pede permissão para aceder a staging.aura.com"* → carrega **Permitir**

Podes adicionar **vários workspaces** se testares mais que um projecto. Cada um pode ser removido individualmente.

> ⚠ Se rejeitares o prompt, o workspace fica registado mas a extensão **não corre** nesse site. Volta a remover e adicionar para tentar de novo.

### 4. Gravar uma nota de feedback

#### Antes de gravar — recebe os códigos de teste

O developer (Bruno) gera uma sheet com testes numerados (`T-001`, `T-002`, …) e envia-te. Tipicamente é um Google Sheets, PDF ou doc partilhado. **Tem essa sheet aberta noutra tab** enquanto gravas.

#### Gravar

1. Vai para o site do projecto (ex: `https://staging.aura.com`)
2. Vê o **botão 🎤 azul** no canto inferior esquerdo
3. **Clica no 🎤** → aparece um modal "Código do teste"
4. Escolhe um de:
   - **Escrever o código** (ex: `T-003`) → Enter ou clica **Iniciar gravação**
   - **Sem caso** → grava sem código (para feedback genérico não ligado a nenhum teste específico)
   - **Cancelar** → fecha sem gravar
5. O botão fica **vermelho a pulsar** e a gravação começou
6. **Fala** o que estás a ver/sentir enquanto navegas, clicas, preenches formulários
7. **Clica novamente no botão vermelho** para parar — a extensão captura um screenshot final, empacota tudo e envia
8. Toast aparece com a **transcrição automática** (Whisper) — confirma que ficou bem

> 💡 **O código é case-insensitive.** Escreves `t-3` ou `T-003` — qualquer um funciona desde que coincida com o que está na sheet.
>
> 💡 **Não há lista de códigos para escolher.** Ao contrário de versões anteriores, agora escreves directamente porque o código vem de fora (a tua sheet). Vantagem: funciona com 5 testes ou com 500 — sem cache nem scrolling.
>
> 💡 **Engano no código?** Sem stress. Mesmo que escrevas um código que não existe (`T-999`), a gravação é aceite. O Miguel/gestor vê na app a vermelho/laranja e pode corrigir antes de aprovar. **Nunca perdes uma gravação por causa de um typo.**

### 5. Screenshots manuais

Durante uma gravação, podes tirar **até 10 screenshots manuais** para captar momentos específicos.

| Como | Quando usar |
|---|---|
| Clica no botão **📷** ao lado do 🎤 | UI normal — botões, listas, formulários |
| Atalho **`Alt+S`** | Modais, popovers, dropdowns abertos — o atalho **não tira foco** do elemento activo, por isso o modal **não fecha** quando captas. O clique no botão 📷 pode fechar modais que se fecham em "click fora" |

Cada captura mostra um toast `📸 captado (N)` com o número total.

> **No final de cada gravação, é tirado automaticamente um screenshot da página onde clicaste para parar.** Não tens que tirar manualmente o último.

### 6. Privacidade — o que **nunca** é capturado

A extensão filtra dados sensíveis em 3 camadas:

**a) Eventos** — não regista os valores de:
- Campos `<input type="password">`
- Campos `<input type="hidden">`
- Campos com `autocomplete="cc-*"` (cartão de crédito)
- Conteúdo de ficheiros em `<input type="file">` (regista apenas que escolheste um)

**b) Origens** — só corre nos sites que **tu** autorizaste explicitamente em **Workspaces**. Em qualquer outro site (Gmail, banco, etc.), a extensão **não está activa** — o botão 🎤 nem sequer aparece.

**c) GDPR consent** — ao primeiro uso, o popup pede consentimento. Sem consentimento, o botão 🎤 não dispara nada.

### 7. Sem rede? Sem problema

Se o Command Center estiver inacessível quando paras a gravação:
- O áudio + eventos + screenshots ficam **guardados localmente** no teu browser (IndexedDB)
- Aparece um toast indicando que ficou em fila
- **Da próxima vez** que clicares no botão 🎤 (sem estar a gravar), a extensão tenta drenar a fila com retry/backoff
- Funciona offline indefinidamente — não há limite de tempo, mas há limites de tamanho

Limites:
- **Áudio**: até ~15 min por gravação (depende da memória disponível)
- **Eventos**: até 5000 por gravação (mais antigos descartados)
- **Screenshots manuais**: 10 por gravação
- **Tamanho do screenshot**: ~3MB cada (JPEG 75% quality, scale ≤1.5x)

---

## Para gestores — Triagem em /feedback

Quando um tester pára a gravação, o feedback chega ao Command Center. Vai a `/feedback` para ver as sessões.

### O que vês na sessão

Cada item de feedback mostra:

- **Badge do código de teste** (canto superior esquerdo da strip verde):
  - 🟢 **Branco/normal** — o código bate num TestCase real do projecto. Pronto.
  - 🟠 **Laranja com ⚠** — o tester escreveu um código que **não existe** neste projecto (typo, ou TestCase não criado). **Clica no badge para editar e corrigir.**
  - ⚪ **"+ código"** (dashed) — o tester gravou sem código (escolheu "Sem caso"). **Clica para adicionar um agora**, se for relevante.
- **Áudio** — player com controlos
- **Transcrição** automática (Whisper)
- **Timeline de eventos** — clicks, inputs, navegações, screenshots, na ordem temporal
- **Screenshots** — clicáveis para abrir em tamanho real
- **Triagem AI** (draft de severidade, expected/actual result, repro steps, critérios de aceitação) — confirma ou edita
- **Mencionados** — códigos T-NNN que apareceram na transcrição mas que o sistema não conseguiu desambiguar

### Editar o código de teste

Em qualquer estado (matched, unmatched, vazio), clica no badge → vira um input → escreve o código correcto → **Enter** ou clica **✓**. O servidor:
1. Normaliza para uppercase
2. Tenta encontrar um `TestCase` activo no projecto com esse código
3. Se encontra: liga o feedback à TestCase + apaga o aviso laranja
4. Se não encontra: guarda só a string crua (continua a laranja)

Cancela com **Esc** ou **✕**.

### Aprovar feedback

Depois da triagem, carrega **Aprovar** (botão verde no canto direito da strip). Isto cria automaticamente uma **task de dev** atribuída ao Bruno, ligada à TestCase (se houver match) ou ao feedback isolado.

---

## Ciclo completo do feedback

```
1. Bruno desenvolve uma feature              (developer)
2. Bruno cria um TestSheet com T-001…T-NNN   → /api/dev/testsheets
3. Bruno partilha a sheet com testers        (Google Sheet, PDF, etc.)
4. Tester abre o site, clica 🎤              (extensão)
5. Tester escreve "T-003", grava, pára       (extensão)
6. Servidor recebe, transcreve, cria item    /api/feedback/voice-note
7. Gestor revê em /feedback, triagem, aprova /feedback
8. Aprovação cria Task atribuída ao Bruno    /api/dev/tasks
9. Bruno claim → in_dev → ready_for_verify   PATCH /api/dev/tasks/{id}/status
10. Tester (ou gestor) verifica em /verifications, aprova
11. Task fechada                             ✅
```

Em qualquer ponto, o gestor pode **rejeitar** com motivo, e o ciclo volta atrás.

---

## Para developers — Estrutura técnica

```
extension/
├── manifest.json       ← MV3 — optional_host_permissions + scripting + activeTab
├── background.js       ← Service worker (115 linhas)
│                         - syncWorkspaces() em response a storage.onChanged + permissions events
│                         - chrome.scripting.registerContentScripts dinâmico por workspace
│                         - chrome.tabs.captureVisibleTab proxy (content → SW message)
├── content.js          ← Conteúdo injectado (635 linhas)
│                         - Botão 🎤 + 📷 + toast
│                         - showTestCodeInput() — modal de input livre
│                         - MediaRecorder + audioChunks
│                         - startEventRecording / stopEventRecording (clicks, inputs, navigations)
│                         - captureScreenshot (chrome.tabs.captureVisibleTab → fallback html2canvas)
│                         - persistAndSend → POST FormData /api/feedback/voice-note
├── queue.js            ← IndexedDB queue (96 linhas) — persistência local com retry
├── storage.js          ← Wrapper de chrome.storage.local (44 linhas)
├── popup.html / .js    ← UI de login, GDPR consent, gestão de workspaces (236 + 229 linhas)
├── styles.css          ← Botão flutuante, toast, modal de input (186 linhas)
├── html2canvas.min.js  ← html2canvas-pro 1.5.8 (vendor — suporta OKLCH do Tailwind 4)
└── icons/              ← 16/48/128 px
```

### Manifest highlights

```json
{
  "manifest_version": 3,
  "permissions": ["storage", "scripting", "activeTab"],
  "host_permissions": [
    "http://localhost:3100/*",
    "http://91.99.211.238:3100/*"
  ],
  "optional_host_permissions": [
    "http://*/*",
    "https://*/*"
  ],
  "background": { "service_worker": "background.js" }
}
```

- **`host_permissions` fixos** — para o servidor Command Center (login, upload). Não é o site testado.
- **`optional_host_permissions: */*`** — pool de onde se pede permissão por workspace. **Nunca** pedida globalmente; só o origin específico ao adicionar um workspace.
- **Sem `<all_urls>` no manifest** — princípio "least privilege".

### Auth

- **Tester JWT** (preferido): `Authorization: Bearer <jwt 30d>` obtido via `POST /api/feedback/auth/login`
- **Agent token** (legacy): `Authorization: Bearer $AGENT_API_SECRET` — continua a funcionar para agentes OpenClaw

Implementação no backend: `lib/feedback-auth.ts:authenticateFeedbackOrAgent`.

### Fluxo de mensagens

| De | Para | Mensagem | Resultado |
|---|---|---|---|
| `popup.js` | (chrome.permissions API) | `request({origins})` | Prompt nativo Chrome |
| Storage change | `background.js` | `chrome.storage.onChanged` | `syncWorkspaces()` re-regista content scripts |
| `content.js` | `background.js` | `{type: "captureVisibleTab"}` | `{ok, dataUrl}` (jpeg base64) |

### Endpoints servidor consumidos

| Endpoint | Método | Quando |
|---|---|---|
| `/api/feedback/auth/login` | POST | Login do popup |
| `/api/feedback/voice-note` | POST | Upload da gravação (FormData multi-part) |

> **Nota histórica**: o endpoint `/api/feedback/test-cases` ainda existe no servidor mas a extensão **já não o consome** desde 1.7.0 — antes era usado para popular o picker. Pode ser removido em futura limpeza do servidor.

### Como criar um tester

Ver `docs/feedback-tester-setup.md` ou correr:
```bash
pnpm tsx scripts/create-tester.ts <email> <name>
```

### Build / package

A extensão é "load unpacked" — não tem build step. Para empacotar:
```bash
cd extension && zip -r ../command-center-feedback-1.7.0.zip . \
  -x "*.git*" -x "node_modules/*" -x "README.md"
```

### Convenções de versionamento

- **Major** (2.0): mudanças incompatíveis no protocolo de upload (ex: schema de eventos)
- **Minor** (1.x.0): novas features visíveis ao tester (ex: 1.7 — input livre em vez de picker)
- **Patch** (1.x.y): bug fixes, sem mudança de UX (ex: 1.6.1 — html2canvas-pro swap)

Histórico:
- **1.7.0** — picker substituído por input livre; coluna `testCaseCodeRaw` no servidor; edição inline em `/feedback`
- **1.6.1** — html2canvas → html2canvas-pro (suporte a OKLCH do Tailwind 4)
- **1.6.0** — feedback loop inicial (aprovação → task → verificação)
