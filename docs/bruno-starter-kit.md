# Starter Kit — Integração com o Command Center

**Para:** Bruno
**De:** Miguel
**Objectivo:** Este ficheiro tem tudo o que precisas para receberes feedback validado do Command Center (CC) no teu sistema, trabalhares com Claude Code, e devolveres o estado quando terminas.

Podes atirar este `.md` para o teu Claude Code e dizer-lhe: *"lê isto e prepara o ambiente para eu começar a puxar tickets"*. Ele cria-te as variáveis, os scripts e o slash command que precisas.

---

## 1. O que isto é

O Miguel valida feedback de testers no Command Center. Ao clicar **"→ Enviar ao produtor"**, cria-se um ticket (uma `Task` com `handoffStatus=queued`) que tu vais buscar via API.

Fluxo:
```
CC: Miguel valida → queued
    │
    ▼
Tu: puxas → claim → in_progress
    │
    ▼
Tu: resolves → resolved (CC marca task=feito)
```

Alternativa: se não conseguires (falta contexto), chamas `reject` com `reason` e o Miguel reenvia com mais info.

---

## 2. Credenciais

Copia para o teu `.env` ou exporta na shell:

```bash
export CC_BASE="http://91.99.211.238:3000"
export CC_AGENT_SECRET="wH5Zdg3KY/vnB1q7lzRbp1dBZV33SgqAPfxvG9BkV80="
export CC_AGENT_ID="bruno"
export CC_TENANT_ID="a6804edc-1d3d-42ae-953f-968cbbd29132"
```

> **Segurança:** este secret dá acesso à API `/api/agent/*` do CC (não só ao handoff). Trata-o como uma credencial sensível — não o commites. Se preferires um secret restrito só ao handoff, diz ao Miguel.

Todas as chamadas precisam destes 3 headers:

| Header | Valor |
|--------|-------|
| `Authorization` | `Bearer $CC_AGENT_SECRET` |
| `X-Agent-Id` | `$CC_AGENT_ID` (= `bruno`) |
| `X-Tenant-Id` | `$CC_TENANT_ID` (UUID) |

---

## 3. Endpoints

Base URL: `$CC_BASE`

### 3.1 `GET /api/agent/handoffs`

Lista tickets em fila (ou noutro estado).

**Query params:**
- `status` — `queued` (default), `delivered`, `in_progress`, `resolved`, `rejected`
- `agentId` — filtro; por omissão usa o header `X-Agent-Id`
- `limit` — default 50, max 200

**Resposta:**
```json
{
  "count": 1,
  "handoffs": [
    {
      "taskId": "uuid",
      "title": "string",
      "priority": "critica|alta|media|baixa",
      "status": "queued",
      "projectSlug": "aura-pms",
      "feedbackItemId": "uuid",
      "feedbackSessionId": "uuid",
      "sentAt": "2026-04-19T06:00:00Z",
      "bundleUrl": "http://.../api/agent/handoffs/<taskId>/bundle"
    }
  ]
}
```

### 3.2 `GET /api/agent/handoffs/<taskId>/bundle`

Devolve o contexto completo do ticket.

**Resposta:**
```json
{
  "task": {
    "id": "uuid",
    "title": "string",
    "priority": "alta",
    "handoffStatus": "queued",
    "handoffAgentId": "bruno",
    "projectSlug": "aura-pms"
  },
  "feedback": { "sessionId": "uuid", "itemId": "uuid" },
  "markdown": "# Relatório de Testes — ...\n## Cabeçalho\n...",
  "filename": "20260419-aura-pms-tester.md",
  "assets": [
    {
      "type": "screenshot",
      "path": "/feedback-screenshots/.../x.jpg",
      "url": "http://.../api/handoff-asset?t=<jwt>"
    },
    {
      "type": "audio",
      "path": "/feedback-audio/.../x.webm",
      "url": "http://.../api/handoff-asset?t=<jwt>"
    }
  ]
}
```

**Sobre o `markdown`:** já vem formatado com passos para reproduzir, resultado esperado/actual, critérios de aceitação (checklist), transcrição do áudio, e links para os assets. Podes guardá-lo como `.md` e é a tua única referência de contexto.

**Sobre os `assets[].url`:** são URLs assinadas válidas **24h**. Não precisam de headers — basta um `GET`. Descarrega-as logo para disco; se expirarem, volta a chamar `/bundle` para obter novas.

### 3.3 `POST /api/agent/handoffs/<taskId>/claim`

Marca como "a trabalhar". Body vazio. Transita de `queued`/`delivered` → `in_progress`.

### 3.4 `POST /api/agent/handoffs/<taskId>/resolve`

Marca como resolvido. Todos os campos do body são opcionais, mas recomendo mandar pelo menos `commitSha`.

```json
{
  "commitSha": "abc123",
  "deployUrl": "https://app.example.com",
  "notes": "fix aplicado, validado local"
}
```

Transita para `resolved`. Importante: isto **também** marca a `Task` no CC com `status=feito` e `completedAt=now`.

### 3.5 `POST /api/agent/handoffs/<taskId>/reject`

```json
{ "reason": "falta screenshot da fase X" }
```

Transita para `rejected`. O Miguel vê a razão no CC e pode reenviar.

---

## 4. Transições válidas

```
queued ──claim──▶ in_progress ──resolve──▶ resolved
   │                  │
   └──reject──────────┴──▶ rejected
```

Estados terminais: `resolved`, `rejected`. Para reabrir um `rejected`, o Miguel clica "Enviar ao produtor" outra vez — isso reseta para `queued`.

---

## 5. Códigos HTTP

| Código | Significado |
|--------|-------------|
| 200 | OK |
| 400 | Body inválido (Zod falhou) ou status query inválido |
| 401 | Bearer em falta ou inválido |
| 404 | Task/handoff não existe |
| 409 | Transição inválida (ex: `resolve` numa já resolvida) |
| 429 | Rate limit (60-120 req/min por operação) |

---

## 6. Script pronto — `cc-next-ticket`

Cola isto em `~/bin/cc-next-ticket` (ou onde preferires), `chmod +x`, e chama quando quiseres puxar o próximo.

```bash
#!/usr/bin/env bash
set -euo pipefail

: "${CC_BASE:?CC_BASE not set}"
: "${CC_AGENT_SECRET:?CC_AGENT_SECRET not set}"
: "${CC_AGENT_ID:=bruno}"
: "${CC_TENANT_ID:?CC_TENANT_ID not set}"

HEADERS=(
  -H "Authorization: Bearer $CC_AGENT_SECRET"
  -H "X-Agent-Id: $CC_AGENT_ID"
  -H "X-Tenant-Id: $CC_TENANT_ID"
)

# 1. Lista próximo ticket queued
list=$(curl -sfS "${HEADERS[@]}" "$CC_BASE/api/agent/handoffs?status=queued&limit=1")
id=$(echo "$list" | jq -r '.handoffs[0].taskId // empty')
if [ -z "$id" ]; then
  echo "Sem tickets em fila."
  exit 0
fi

title=$(echo "$list" | jq -r '.handoffs[0].title')
priority=$(echo "$list" | jq -r '.handoffs[0].priority')
echo "→ Ticket: $id"
echo "  Título:    $title"
echo "  Prioridade: $priority"
echo

# 2. Puxa bundle
out="./tickets/$id"
mkdir -p "$out"
curl -sfS "${HEADERS[@]}" "$CC_BASE/api/agent/handoffs/$id/bundle" > "$out/bundle.json"
jq -r .markdown "$out/bundle.json" > "$out/ticket.md"

# 3. Descarrega assets
mkdir -p "$out/assets"
jq -c '.assets[]' "$out/bundle.json" | while read -r asset; do
  type=$(echo "$asset" | jq -r .type)
  url=$(echo "$asset" | jq -r .url)
  path=$(echo "$asset" | jq -r .path)
  ext="${path##*.}"
  name="${type}-$(openssl rand -hex 3).${ext}"
  curl -sfSo "$out/assets/$name" "$url"
  echo "  baixado: assets/$name"
done

# 4. Claim
curl -sfS -X POST "${HEADERS[@]}" "$CC_BASE/api/agent/handoffs/$id/claim" > /dev/null
echo
echo "✓ Ticket $id em ./tickets/$id/ e marcado como in_progress."
echo "  Abre ./tickets/$id/ticket.md para começar."
```

E um segundo `cc-close-ticket <id> [commitSha]`:

```bash
#!/usr/bin/env bash
set -euo pipefail

: "${CC_BASE:?}"; : "${CC_AGENT_SECRET:?}"; : "${CC_AGENT_ID:=bruno}"; : "${CC_TENANT_ID:?}"

id="${1:?usage: cc-close-ticket <taskId> [commitSha] [deployUrl]}"
commit="${2:-}"
deploy="${3:-}"

body=$(jq -n --arg c "$commit" --arg d "$deploy" \
  '{commitSha: (if $c=="" then null else $c end), deployUrl: (if $d=="" then null else $d end)} | del(..|nulls)')

curl -sfS -X POST \
  -H "Authorization: Bearer $CC_AGENT_SECRET" \
  -H "X-Agent-Id: $CC_AGENT_ID" \
  -H "X-Tenant-Id: $CC_TENANT_ID" \
  -H "Content-Type: application/json" \
  -d "$body" \
  "$CC_BASE/api/agent/handoffs/$id/resolve" | jq
```

---

## 7. Integração com Claude Code

Duas opções:

### Opção A — slash command

Em `.claude/commands/puxa-ticket.md` dentro do teu projecto:

```markdown
---
description: Puxa o próximo ticket do Command Center e prepara o workspace
---
Corre `cc-next-ticket`. Depois lê `./tickets/<id>/ticket.md` (o `<id>` é o caminho mais recente em `./tickets/`), vê os screenshots em `./tickets/<id>/assets/`, e propõe um plano de implementação. Não comeces a escrever código ainda — espera que eu confirme.
```

Depois, na CLI:
```
/puxa-ticket
```

### Opção B — MCP server (mais sofisticado, fica para v2)

Expor os 4 endpoints (`list`, `bundle`, `claim`, `resolve`) como MCP tools dá ao Claude Code acesso directo sem passar por shell. Se quiseres ir por aí, o Miguel pode escrever o config.

---

## 8. Fluxo de trabalho típico

```bash
# 1. Vê se há tickets
curl -sfS -H "Authorization: Bearer $CC_AGENT_SECRET" \
     -H "X-Agent-Id: bruno" \
     -H "X-Tenant-Id: $CC_TENANT_ID" \
     "$CC_BASE/api/agent/handoffs?status=queued" | jq '.count, .handoffs[].title'

# 2. Puxa o próximo
cc-next-ticket

# 3. Trabalha com Claude Code
claude "lê ./tickets/<id>/ticket.md e implementa as acceptance criteria. Os screenshots estão em assets/"

# 4. Fecha
git add . && git commit -m "fix: ..."
SHA=$(git rev-parse --short HEAD)
cc-close-ticket <id> "$SHA" "https://app.example.com"
```

---

## 9. Exemplo de `ticket.md` (o que vais receber)

```markdown
# Relatório de Testes — AURA PMS

## Cabeçalho

```
Data: 2026-04-16
Tester: Miguel Martins
Projecto: AURA PMS (aura-pms)
Duração: 22 min
Páginas visitadas: 1
Ambiente: prod
Browser: Chrome (extension Command Center Feedback)
Primeira página: http://89.167.39.10:3001/calendar
```

---

## Items

### #01 Calendário não mostra sugestões de preço

- **Tipo:** `bug`
- **Severidade:** `P1` — Afecta receita/conversão · workflow principal degradado
- **Página:** `/calendar`
- **Módulo:** booking
- **Task no DashboardPM:** `TSK-abc12345`
- **Triado em:** 2026-04-19T06:00:00.000Z

**Passos para reproduzir**

1. Abrir /calendar
2. Clicar num dia
3. Observar que não aparecem sugestões de preço

**Resultado esperado**

Aparecem sugestões de preço dinâmicas consoante ocupação da semana.

**Resultado actual**

Painel vazio, sem placeholder.

**Evidência**

- Screenshot principal: http://.../api/handoff-asset?t=<jwt>
- Áudio: http://.../api/handoff-asset?t=<jwt>

**Critérios de aceitação**

- [ ] Painel mostra 3 sugestões (low/median/high)
- [ ] Em dias com >80% ocupação, destaca "oportunidade"
- [ ] Loading state enquanto calcula

**Transcrição (gravação)**

> Ok, ainda aqui no calendário. Quando temos aqui as sugestões, não é?
> E vai aparecer os preços...
```

---

## 10. Contactos & problemas

- **API offline / 500:** avisa o Miguel, o CC está no VPS dele (Hetzner 91.99.211.238).
- **401 em todas as chamadas:** verifica que o `AGENT_API_SECRET` está intacto (não partiu no copy-paste, não tem espaços).
- **URLs assinadas expiraram:** chama outra vez `/bundle` do mesmo `taskId` — gera URLs novas.
- **Quero um secret só meu:** diz ao Miguel; ele pode criar um secret dedicado.
- **Documento de referência completo (do lado do CC):** `docs/bruno-handoff-protocol.md` no repositório do Command Center.

---

**Ready. Cola este ficheiro ao teu Claude Code com:**

> *"Lê este `.md`. Prepara a variável de ambiente, cria os dois scripts `cc-next-ticket` e `cc-close-ticket` em `~/bin/`, e cria o slash command `/puxa-ticket`. Depois testa com um curl à rota `GET /api/agent/handoffs?status=queued` para confirmar que a ligação funciona."*
