# Feedback Tester — Como criar um tester

O sistema de feedback do Command Center suporta dois tipos de caller:

1. **Agentes OpenClaw** — usam o `AGENT_API_SECRET` (Bearer) para envio automatizado.
2. **Testers humanos** — fazem login no plugin Chrome com email + password e recebem um JWT de 30 dias.

Este documento descreve como criar **testers humanos**, incluindo clientes externos.

## 1. Criar o tester via CLI

```bash
# Criar tester (password obrigatória via flag)
pnpm tsx scripts/create-tester.ts cliente@empresa.pt "João Silva" --password=teste123

# Criar e atribuir acesso a um projecto específico
pnpm tsx scripts/create-tester.ts cliente@empresa.pt "João Silva" --password=teste123 --project=aura-pms
```

> Para evitar gravar a password no histórico da shell, prefixa o comando com um espaço (com `HISTCONTROL=ignorespace`) ou usa `HISTIGNORE='*password*'`.

O script:
- Cria um `Person` com type `cliente`
- Cria um `User` com role `cliente`, `isActive=true`
- Opcionalmente cria um `UserProjectAccess` se `--project=<slug>` for passado
- Falha cleanly se já existir user com o mesmo email (P2002)
- Hash da password com bcrypt (10 rounds)

## 2. Entregar credenciais ao cliente

Envia ao cliente:
- O **email** com que o registaste
- A **password inicial** (sugere que ele a mude depois — a UI de mudança de password fica para fase futura)
- O **link do plugin** ou as instruções de instalação (ver `extension/README.md`)
- O **URL do projecto** que ele vai testar (ex: `https://staging.aura.com`)
- O **slug do projecto** no Command Center (ex: `aura-pms`)

## 3. Revogar acesso

```bash
# Via Prisma Studio ou directamente em SQL:
UPDATE users SET is_active = false WHERE email = 'cliente@empresa.pt';
```

Tokens já emitidos continuam válidos até expirarem (30 dias máx). Para invalidação imediata, considera rotar `SESSION_SECRET` (invalida TODOS os tokens, incluindo dashboard).

## 4. Verificar logins recentes

Não há ainda log estruturado de logins. Consulta os logs do servidor:
```bash
journalctl --user -u cc-feedback-server -n 100 | grep "feedback/auth/login"
```

## 5. Smoke test do fluxo completo

```bash
# 1. Criar tester
pnpm tsx scripts/create-tester.ts demo@teste.pt "Demo" --password=demo123

# 2. Login
curl -X POST http://localhost:3100/api/feedback/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@teste.pt","password":"demo123"}'
# Esperado: { token: "eyJ...", expiresAt: 1234..., email, name }

# 3. Usar o token
curl http://localhost:3100/api/feedback/sessions/<id> \
  -H "Authorization: Bearer <token-do-passo-2>"
```
