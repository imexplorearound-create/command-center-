# Protocolo de Handoff — Command Center → Bruno

Este documento descreve como o sistema do Bruno (VPS na porta 89, Claude Code + Bolt) consome os feedback tickets do Command Center (CC).

## Visão geral

O Miguel valida feedback no CC e clica **"→ Enviar ao produtor"**. Isto cria (ou reutiliza) uma Task e marca `handoffStatus=queued`. O Bruno puxa a fila via API, trabalha nos tickets, e chama `resolve` quando termina.

Command Center é a fonte de verdade. O Bruno não tem que expor nenhum endpoint.

## Autenticação

Todas as chamadas precisam dos headers:

| Header | Valor | Notas |
|--------|-------|-------|
| `Authorization` | `Bearer <AGENT_API_SECRET>` | Partilhado com o Miguel, rotação coordenada |
| `X-Agent-Id` | `bruno` | Identificador do agente; gravado no `handoffAgentId` ao fazer `claim` |
| `X-Tenant-Id` | `<tenant uuid>` | Ou o slug via helper do CC; default `imexplorearound` |

Base URL padrão: `https://<cc-host>:3100`

## Endpoints

### 1. Listar handoffs pendentes

```
GET /api/agent/handoffs?status=queued
```

Parâmetros:
- `status` — `queued` (default), `delivered`, `in_progress`, `resolved`, `rejected`.
- `agentId` — filtro opcional; por omissão usa o `X-Agent-Id`.
- `limit` — default 50, max 200.

Resposta:
```json
{
  "count": 1,
  "handoffs": [
    {
      "taskId": "uuid",
      "title": "...",
      "priority": "alta",
      "status": "queued",
      "projectSlug": "aura-pms",
      "feedbackItemId": "uuid",
      "feedbackSessionId": "uuid",
      "sentAt": "2026-04-19T06:00:00Z",
      "bundleUrl": "https://.../api/agent/handoffs/<taskId>/bundle"
    }
  ]
}
```

### 2. Obter bundle (markdown + assets)

```
GET /api/agent/handoffs/<taskId>/bundle
```

Resposta:
```json
{
  "task": {
    "id": "uuid",
    "title": "...",
    "priority": "alta",
    "handoffStatus": "queued",
    "handoffAgentId": "bruno",
    "projectSlug": "aura-pms"
  },
  "feedback": { "sessionId": "...", "itemId": "..." },
  "markdown": "# Relatório de Testes — ...",
  "filename": "20260419-aura-pms-sergio.md",
  "assets": [
    { "type": "screenshot", "path": "/feedback-screenshots/.../x.jpg", "url": "https://.../api/handoff-asset?t=<jwt>" },
    { "type": "audio", "path": "/feedback-audio/.../x.webm", "url": "https://.../api/handoff-asset?t=<jwt>" }
  ]
}
```

As URLs de assets são assinadas e válidas por 24h. Basta um `GET` simples sem headers para as descarregar (o JWT está no query string).

### 3. Claim (começar a trabalhar)

```
POST /api/agent/handoffs/<taskId>/claim
```

Transita `queued|delivered → in_progress` e grava o `agentId` do header `X-Agent-Id`. Body vazio.

### 4. Resolve (terminar)

```
POST /api/agent/handoffs/<taskId>/resolve
Content-Type: application/json

{ "commitSha": "abc123", "deployUrl": "https://app.example.com", "notes": "..." }
```

Todos os campos são opcionais (todos). Marca `handoffStatus=resolved`, a Task fica com `status=feito` e `completedAt` preenchido.

### 5. Reject (não dá para fazer)

```
POST /api/agent/handoffs/<taskId>/reject
Content-Type: application/json

{ "reason": "falta contexto X" }
```

Transita para `rejected`. Miguel vê no CC e decide reenviar (actualmente implica editar a Task — loop completo de reabertura fica para v2).

## Exemplo: ciclo completo via curl

```bash
SECRET="..."
BASE="https://cc.example.com:3100"
HEADERS=(-H "Authorization: Bearer $SECRET" -H "X-Agent-Id: bruno" -H "X-Tenant-Id: imexplorearound")

# 1. Lista queued
curl -s "${HEADERS[@]}" "$BASE/api/agent/handoffs?status=queued" | jq

# 2. Pega o taskId, vai buscar bundle
TASK_ID=<uuid>
curl -s "${HEADERS[@]}" "$BASE/api/agent/handoffs/$TASK_ID/bundle" | jq > bundle.json

# 3. Descarrega o markdown + imagens referenciadas
jq -r .markdown bundle.json > ticket.md
jq -r '.assets[].url' bundle.json | while read url; do
  curl -sO "$url"
done

# 4. Claim
curl -s "${HEADERS[@]}" -X POST "$BASE/api/agent/handoffs/$TASK_ID/claim" | jq

# 5. ... trabalho ...

# 6. Resolve
curl -s "${HEADERS[@]}" -X POST "$BASE/api/agent/handoffs/$TASK_ID/resolve" \
  -H "Content-Type: application/json" \
  -d '{"commitSha":"abc123","deployUrl":"https://app.example.com"}' | jq
```

## Integração com Claude Code (sugestão)

O Bruno pode criar um slash command `/next-ticket` no Claude Code dele:

```bash
#!/usr/bin/env bash
# .claude/commands/next-ticket.sh
set -euo pipefail
: "${CC_AGENT_SECRET:?}"
: "${CC_BASE:?}"

list=$(curl -sfS \
  -H "Authorization: Bearer $CC_AGENT_SECRET" \
  -H "X-Agent-Id: bruno" \
  -H "X-Tenant-Id: imexplorearound" \
  "$CC_BASE/api/agent/handoffs?status=queued&limit=1")

id=$(echo "$list" | jq -r '.handoffs[0].taskId // empty')
if [ -z "$id" ]; then echo "Sem tickets."; exit 0; fi

mkdir -p ./tickets/"$id"
curl -sfS \
  -H "Authorization: Bearer $CC_AGENT_SECRET" \
  -H "X-Agent-Id: bruno" \
  -H "X-Tenant-Id: imexplorearound" \
  "$CC_BASE/api/agent/handoffs/$id/bundle" > ./tickets/"$id"/bundle.json

jq -r .markdown ./tickets/"$id"/bundle.json > ./tickets/"$id"/ticket.md
cd ./tickets/"$id"
jq -r '.assets[] | "\(.type) \(.url)"' bundle.json | while read type url; do
  ext=$(echo "$url" | grep -oE '\.(jpg|jpeg|png|webm|mp3)' || echo .bin)
  fname="${type}-$(openssl rand -hex 3)$ext"
  curl -sfSo "$fname" "$url"
done

echo "Ticket $id pronto em tickets/$id/"
```

Depois basta o Bruno correr `claude "abre ./tickets/$id/ticket.md e resolve"` — o Claude Code dele lê o markdown, vê os screenshots, e trabalha.

## Transições de estado (resumo)

```
queued ──claim──▶ in_progress ──resolve──▶ resolved
   │                  │
   │                  └──reject──▶ rejected
   │
   └──reject──▶ rejected
```

`delivered` é reservado para casos futuros em que o CC fizer push active; por agora, os tickets vão directos de `queued` para `in_progress` via claim.

## Secrets

- `AGENT_API_SECRET` — partilhado com o Bruno; rotação coordenada.
- `HANDOFF_ASSET_SECRET` — interno do CC, nunca partilhado. Assina as URLs efémeras.
