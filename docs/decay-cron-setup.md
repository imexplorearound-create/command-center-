# Setup do Cron de Decay (Sprint 6a)

O decay automático do trust score é aplicado por um endpoint HTTP autenticado
por Bearer token. **O scheduler externo é a fonte de agendamento** — o
endpoint não tem cron in-process.

Spec original: `docs/command-center-spec-v1.2.md` linha 309. Cada categoria
de extracção sem `lastInteractionAt` há 7+ dias perde 1 ponto de trust score
(floor 0). Cadência recomendada: **semanal, domingo 03:00 UTC**.

## 1. Variáveis de ambiente

Em `.env.local` (dev) e `.env` (produção):

```
DECAY_CRON_SECRET=<token-aleatório-32-bytes>
```

Gerar token novo:

```bash
openssl rand -hex 32
```

## 2. Endpoint

```
POST /api/maestro/decay/apply
Authorization: Bearer $DECAY_CRON_SECRET
Content-Type: application/json

{
  "tenantId"?: "uuid",       // opcional: limita a um tenant (modo manual/teste)
  "dryRun"?: false,          // se true, devolve candidatos sem persistir
  "cooldownDays"?: 7         // opcional: override do default (7)
}
```

Resposta:

```json
{
  "processed": 18,
  "decayed": 17,
  "skippedZero": 0,
  "errors": [{"trustScoreId": "...", "error": "..."}]   // só se houver
}
```

`dryRun: true` adiciona `candidates: [{...}]` com a lista de TrustScores
elegíveis para decay nesta janela.

## 3. Cadência recomendada

**Semanal, domingo 03:00 UTC.** O decay é -1/run; correr mais frequentemente
acelera o decaimento mais do que a spec prevê. Se um cron falhar uma semana,
o run seguinte só decai -1 (não acumula) — para baixar a 0 uma categoria
inactiva, são precisas N semanas (não N execuções no mesmo dia).

Para forçar decaimento mais agressivo de um tenant específico durante
limpezas, usar o endpoint manual com `cooldownDays` mais baixo.

## 4. Smoke test (curl)

DryRun (não escreve nada):

```bash
curl -X POST https://app.example.com/api/maestro/decay/apply \
  -H "Authorization: Bearer $DECAY_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

Run real para um tenant:

```bash
curl -X POST https://app.example.com/api/maestro/decay/apply \
  -H "Authorization: Bearer $DECAY_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "<uuid>"}'
```

## 5. systemd timer (servidor Linux)

`/etc/systemd/system/cc-decay.service`:

```ini
[Unit]
Description=Command Center · Maestro trust score decay
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
EnvironmentFile=/etc/cc-decay.env
ExecStart=/usr/bin/curl -fsS -X POST \
  https://app.example.com/api/maestro/decay/apply \
  -H "Authorization: Bearer ${DECAY_CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

`/etc/cc-decay.env` (chmod 600, owner root):

```
DECAY_CRON_SECRET=<token>
```

`/etc/systemd/system/cc-decay.timer`:

```ini
[Unit]
Description=Command Center · Maestro decay weekly trigger

[Timer]
OnCalendar=Sun *-*-* 03:00:00 UTC
AccuracyToken=5m
Persistent=true

[Install]
WantedBy=timers.target
```

Activar:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now cc-decay.timer
sudo systemctl list-timers cc-decay.timer
sudo journalctl -u cc-decay.service -f
```

## 6. GitHub Actions (alternativa serverless)

`.github/workflows/maestro-decay.yml`:

```yaml
name: Maestro decay

on:
  schedule:
    - cron: "0 3 * * 0"   # domingo 03:00 UTC
  workflow_dispatch:

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -fsS -X POST "$DECAY_URL" \
            -H "Authorization: Bearer $DECAY_CRON_SECRET" \
            -H "Content-Type: application/json" \
            -d '{}'
        env:
          DECAY_URL: ${{ secrets.DECAY_URL }}
          DECAY_CRON_SECRET: ${{ secrets.DECAY_CRON_SECRET }}
```

Configura `DECAY_URL` e `DECAY_CRON_SECRET` em GitHub Secrets.

## 7. Diagnóstico

| Sintoma | Causa provável | Resolução |
|---|---|---|
| 401 | Secret errado ou ausente | Confirma `DECAY_CRON_SECRET` no header e env |
| 503 | Env var não definida no servidor | `printenv DECAY_CRON_SECRET` no host do Next |
| 200 com `processed: 0` | Não há TrustScores elegíveis | Esperado se a equipa interage com tudo regularmente |
| 200 com `decayed < processed` | Race condition (score chegou a 0 entre query e write) | Conta como skippedZero — esperado |
| `errors[]` populado | DB connection ou constraint | Vê o `error` por trustScoreId |
| Decay parece não estar a aplicar | Timer parou ou hora errada | `systemctl list-timers cc-decay.timer` mostra `last`/`next` |
| Quero ver o que vai decair antes | Usa `dryRun: true` | Resposta tem `candidates: [...]` com a lista |

## 8. Como confirmar que funcionou

Após um run, no postgres:

```sql
-- Audit log das últimas 24h
SELECT created_at, agent_id, extraction_type, score_before, score_after
FROM maestro_actions
WHERE action = 'decay'
  AND created_at > now() - interval '24 hours'
ORDER BY created_at DESC;
```

Cada linha = uma categoria que perdeu 1 ponto. `performed_by` é sempre NULL
nestas linhas (acção sistémica).
