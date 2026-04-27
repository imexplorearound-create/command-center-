# Setup do Cron de Briefings (Sprint 6d)

O briefing diário do Maestro é gerado por um endpoint HTTP autenticado por
Bearer token. **O scheduler externo é a fonte de agendamento** — o endpoint
não tem cron in-process.

## 1. Variáveis de ambiente

Em `.env.local` (dev) e `.env` (produção):

```
BRIEFING_CRON_SECRET=<token-aleatório-32-bytes>
```

Gerar token novo:

```bash
openssl rand -hex 32
```

## 2. Endpoint

```
POST /api/maestro/briefing/generate
Authorization: Bearer $BRIEFING_CRON_SECRET
Content-Type: application/json

{
  "tenantId"?: "uuid",   // opcional: limita a um tenant
  "userId"?: "uuid",     // opcional: limita a um user
  "force"?: false        // ignora hora preferida e regenera mesmo se já entregue
}
```

Resposta:

```json
{
  "processed": 12,
  "delivered": 8,
  "skippedEmpty": 3,
  "skippedExisting": 1,
  "failed": 0
}
```

## 3. Cadência recomendada

**Uma vez por hora.** O endpoint resolve internamente quem deve receber
nesta janela horária (cada user tem `notificationPrefs.briefing.hour`,
default 8). Correr de hora a hora cobre todos os fusos sem desperdício.

## 4. Smoke test (curl)

Forçar geração imediata para o teu user (ignora hora preferida):

```bash
curl -X POST https://app.example.com/api/maestro/briefing/generate \
  -H "Authorization: Bearer $BRIEFING_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"force": true, "userId": "<o-teu-user-uuid>"}'
```

## 5. systemd timer (servidor Linux)

`/etc/systemd/system/cc-briefing.service`:

```ini
[Unit]
Description=Command Center · Maestro briefing trigger
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
EnvironmentFile=/etc/cc-briefing.env
ExecStart=/usr/bin/curl -fsS -X POST \
  https://app.example.com/api/maestro/briefing/generate \
  -H "Authorization: Bearer ${BRIEFING_CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

`/etc/cc-briefing.env` (chmod 600, owner root):

```
BRIEFING_CRON_SECRET=<token>
```

`/etc/systemd/system/cc-briefing.timer`:

```ini
[Unit]
Description=Command Center · Maestro briefing hourly trigger

[Timer]
OnCalendar=hourly
AccuracyToken=1m
Persistent=true

[Install]
WantedBy=timers.target
```

Activar:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now cc-briefing.timer
sudo systemctl list-timers cc-briefing.timer
sudo journalctl -u cc-briefing.service -f
```

## 6. GitHub Actions (alternativa serverless)

`.github/workflows/maestro-briefing.yml`:

```yaml
name: Maestro briefing

on:
  schedule:
    - cron: "0 * * * *"  # de hora a hora
  workflow_dispatch:

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -fsS -X POST "$BRIEFING_URL" \
            -H "Authorization: Bearer $BRIEFING_CRON_SECRET" \
            -H "Content-Type: application/json" \
            -d '{}'
        env:
          BRIEFING_URL: ${{ secrets.BRIEFING_URL }}
          BRIEFING_CRON_SECRET: ${{ secrets.BRIEFING_CRON_SECRET }}
```

Configura `BRIEFING_URL` e `BRIEFING_CRON_SECRET` em GitHub Secrets.

## 7. Diagnóstico

| Sintoma | Causa provável | Resolução |
|---|---|---|
| 401 | Secret errado ou ausente | Confirma `BRIEFING_CRON_SECRET` no header e env |
| 503 | Env var não definida no servidor | `printenv BRIEFING_CRON_SECRET` no host do Next |
| 200 com `processed: 0` | Hora actual não bate com nenhuma `briefing.hour` | Tira a `force:true` para verificar; verifica timezone do tenant |
| 200 com `failed > 0` | LLM falhou (chave errada, MiniMax down) | Vê `errors[].error`; checa MINIMAX_API_KEY |
| Briefings com `status="failed"` na UI | LLM rejeitou ou timeout | Botão "Gerar agora" na página `/maestro/briefings` regera |
| Briefings vazios todos os dias | Sem actividade, ou queries com filtro errado | Confirma role do user; admin vê tudo, membro só vê o seu |

## 8. Limpeza / retenção

Por defeito, briefings ficam para sempre. Se quiseres limpar:

```sql
DELETE FROM maestro_briefings
WHERE briefing_date < now() - interval '90 days';
```

Cron de retenção fica para Sprint 6d.5 quando crescer.
