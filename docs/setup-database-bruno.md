# Command Center — Setup Base de Dados

**Para:** Bruno
**Data:** 2 Abril 2026
**Tempo estimado:** 5 minutos

---

## O que é preciso

O Command Center (Next.js) precisa de uma base de dados PostgreSQL no servidor (91.99.211.238). O PostgreSQL já está a correr na porta 5432 (Docker), só falta criar a database e o user.

---

## Passos

### 1. Criar user e database

Ligar ao PostgreSQL como superuser (`aura`) e correr:

```sql
CREATE USER cc WITH PASSWORD 'cc_command_2026';
CREATE DATABASE command_center OWNER cc;
GRANT ALL PRIVILEGES ON DATABASE command_center TO cc;
```

Se preferires outra password, actualiza no ficheiro `.env.local` (passo 3).

### 2. Verificar que funciona

```bash
psql -h localhost -U cc -d command_center -c "SELECT 1;"
```

Deve pedir a password (`cc_command_2026`) e devolver `1`.

### 3. Confirmar o .env.local

O ficheiro já existe em `/home/miguel/command-center/.env.local` com:

```
DATABASE_URL="postgresql://cc:cc_command_2026@localhost:5432/command_center"
```

Se mudaste a password no passo 1, actualiza aqui.

### 4. Correr as migrations e o seed

```bash
cd /home/miguel/command-center
npx prisma migrate dev --name init
npx prisma db seed
```

Isto cria todas as tabelas (17) e insere os dados iniciais (projectos, pessoas, tarefas, objectivos, etc.).

---

## Tabelas que vão ser criadas

| Tabela | Descrição |
|--------|-----------|
| `projects` | Projectos (AURA PMS, iPME, etc.) |
| `project_phases` | Fases de cada projecto |
| `objectives` | Objectivos anuais |
| `people` | Equipa + clientes (Miguel, Bruno, Sérgio, etc.) |
| `tasks` | Tarefas com prioridade, estado, AI fields, GitHub fields |
| `clients` | Clientes (Fiscomelres/iPME) |
| `client_contacts` | Contactos de cada cliente |
| `interactions` | Feed de interacções (calls, emails, decisões) |
| `alerts` | Alertas automáticos |
| `content_items` | Pipeline de conteúdo |
| `trust_scores` | Trust Score por tipo de extracção AI |
| `sync_log` | Log de sincronizações |
| `areas` | Áreas operacionais (RH, Financeiro, etc.) |
| `workflow_templates` | Templates de workflow |
| `workflow_template_steps` | Passos de cada template |
| `workflow_instances` | Instâncias activas de workflow |
| `workflow_instance_tasks` | Tarefas geradas por workflows |
| `github_repos` | Repos GitHub ligados a projectos |
| `github_events` | Eventos GitHub (commits, PRs, deploys) |
| `dev_metrics_daily` | Métricas diárias de desenvolvimento |

---

## Se algo correr mal

- **"permission denied to create database"** → não estás ligado como superuser. Usa o user `aura`.
- **"database already exists"** → já foi criado. Podes avançar para o passo 4.
- **"connection refused"** → PostgreSQL não está a correr. Verificar Docker.

Qualquer dúvida, fala com o Miguel.
