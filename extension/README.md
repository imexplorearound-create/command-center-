# Command Center Feedback — Extensão Chrome

Extensão para gravar **notas de voz** + **eventos de UI** enquanto testas projectos. Quando carregas no botão 🎤 flutuante, a extensão grava o teu microfone e captura tudo o que clicas/escreves até parares. No fim, envia para o Command Center, transcreve o áudio e cria um item de feedback.

## Para clientes — Como instalar e usar

### 1. Instalar a extensão

**Opção A — Load unpacked (desenvolvimento)**
1. Descompacta o ficheiro `command-center-feedback.zip`
2. Abre `chrome://extensions` no Chrome
3. Activa "Developer mode" (canto superior direito)
4. Carrega "Load unpacked" e selecciona a pasta descompactada

**Opção B — .crx assinado** (quando disponível)
- Faz duplo-clique no ficheiro `.crx` e confirma a instalação

### 2. Fazer login

1. Clica no ícone da extensão (canto superior direito do Chrome)
2. **Server URL**: confirma que está apontado para o Command Center que te foi indicado (ex: `http://91.99.211.238:3100`)
3. **Email** + **Password**: as credenciais que recebeste
4. Carrega **Entrar**

A sessão dura **30 dias** — só precisas de fazer login uma vez por mês.

### 3. Adicionar o teu workspace de teste

1. Ainda no popup, em **Workspaces**, escreve:
   - **URL**: o link do projecto que vais testar (ex: `https://staging.aura.com`)
   - **Slug do projecto**: o identificador que te foi dado (ex: `aura-pms`)
2. Carrega **Adicionar**
3. O Chrome vai mostrar um prompt: *"A extensão pede permissão para aceder a staging.aura.com"*. Carrega **Permitir**.

Podes adicionar **vários workspaces** se testares mais que um projecto.

### 4. Gravar feedback

1. Vai para o site do projecto (no exemplo: `https://staging.aura.com`)
2. Vê o botão 🎤 azul no canto inferior esquerdo
3. **Clica para começar a gravar**: o botão fica vermelho a pulsar
4. Fala o que estás a ver/sentir enquanto navegas, clicas, preenches formulários
5. **Capturar screenshot manualmente** (durante gravação):
   - Botão 📷 ao lado — captura o que está visível
   - **Atalho `Alt+S`** — captura **sem fechar** modais/popups/dropdowns abertos (o clique no botão pode fechar modais que se fecham em "click fora"; o atalho evita esse problema)
   - Máximo 10 capturas manuais por gravação
6. **Clica novamente para parar**: o botão envia o áudio + os eventos para o Command Center
7. Verás uma toast com a transcrição

### 5. Privacidade

A extensão **NUNCA** captura:
- Valores de campos `password`
- Valores de campos `hidden`
- Valores de campos com autocomplete de cartão de crédito (`autocomplete="cc-*"`)
- Conteúdo de ficheiros que escolhes em `<input type="file">` (apenas regista que escolheste um)

E só corre nos sites que **tu** autorizaste explicitamente em **Workspaces**. Em qualquer outro site (Gmail, banco, etc.), a extensão **não está activa**.

### 6. Sem rede? Sem problema

Se o Command Center estiver inacessível quando paras a gravação, o áudio fica **guardado localmente** no teu browser (IndexedDB). Da próxima vez que clicares no botão 🎤 (sem estar a gravar), a extensão tenta enviar tudo o que ficou pendente.

## Para developers — Estrutura

```
extension/
├── manifest.json       ← MV3, optional_host_permissions + scripting
├── background.js       ← Service worker — regista content scripts dinamicamente
├── content.js          ← Botão flutuante + recording + envio
├── queue.js            ← IndexedDB queue (persistência local)
├── popup.html / .js    ← UI de login + workspaces
├── styles.css          ← Botão + toast
└── icons/
```

### Auth

- **Tester JWT** (preferido): `Authorization: Bearer <jwt 30d>` obtido via `POST /api/feedback/auth/login`
- **Agent token** (legacy): `Authorization: Bearer $AGENT_API_SECRET` — continua a funcionar para agentes OpenClaw

Implementação no backend: `lib/feedback-auth.ts` (`authenticateFeedbackOrAgent`).

### Workspaces dinâmicos

- O cliente adiciona um URL no popup → `chrome.permissions.request({ origins: [...] })`
- O Chrome mostra prompt nativo
- Se aprovado, o popup grava em `chrome.storage.local.workspaces`
- O `background.js` (via `storage.onChanged`) chama `syncWorkspaces()` → `chrome.scripting.registerContentScripts()`
- Quando o workspace é removido, `unregisterContentScripts()` + `permissions.remove()`

Esta abordagem evita ter `<all_urls>` no manifest e garante que a extensão **só corre onde foi explicitamente autorizada**.

### Como criar um tester

Ver `docs/feedback-tester-setup.md`.
