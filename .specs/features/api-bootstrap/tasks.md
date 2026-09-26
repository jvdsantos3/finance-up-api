# API Bootstrap Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/api-bootstrap/design.md`
**Status**: In Progress

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: none — strong defaults applied. Repo sem testes; runner definido pelo scaffold ESM do Nest 12 (Vitest). Comandos abaixo serão conferidos com o `package.json` gerado em T1 antes do primeiro gate.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Env schema | unit | 1:1 com BOOT-01: env ausente ou vazio falha | `src/config/env.schema.spec.ts` | `pnpm test` |
| Health HTTP | e2e | BOOT-02, BOOT-03 e host inacessível: status e corpo exatos | `test/health.e2e-spec.ts` | `pnpm test:e2e` |
| OpenAPI HTTP | e2e | BOOT-04 e BOOT-05: `/docs` e `/docs-json` com `GET /health` | `test/openapi.e2e-spec.ts` | `pnpm test:e2e` |
| Bootstrap process | e2e | BOOT-01: exit diferente de zero e listen não ocorre; porta em uso encerra | `test/bootstrap.e2e-spec.ts` | `pnpm test:e2e` |
| Compose / env | unit | BOOT-06: user, senha, database e porta do compose batem com `.env.example` | `test/compose.spec.ts` | `pnpm test` |
| Drizzle module / schema vazio | none | build gate only | — | build gate only |

## Parallelism Assessment

> Generated from codebase — confirm before Execute.

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
| --------- | -------------- | --------------- | -------- |
| unit | Yes | Sem banco compartilhado; lê arquivo ou schema puro | Nenhum teste ainda; os unitários planejados não abrem conexão |
| e2e | No | Health sobe Postgres via Compose na porta 5432 | `docker-compose.yml` (T3) |

## Gate Check Commands

> Generated from codebase — confirm before Execute. Ajustar se T1 gerar scripts diferentes.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Depois de tarefa só com unit | `pnpm test` |
| Full | Depois de tarefa com e2e | `pnpm test && pnpm test:e2e` |
| Build | Fim de fase ou tarefa sem teste | `pnpm build && pnpm lint` |

---

## Execution Plan

### Phase 1: Foundation (Sequential)

```
T1
```

### Phase 2: Config, Compose, Drizzle

```
T1 ──→ T2 ──→ T4
   └──→ T3
```

### Phase 3: HTTP surface (Sequential)

```
T4 ──→ T5 ──→ T6
T3 ──→ T5
```

---

## Task Breakdown

### T1: Scaffold NestJS 12 ESM no Fastify

**What**: Gerar o app com o CLI e trocar o adapter HTTP para Fastify.
**Where**: raiz do `finance-up-api` (arquivos do CLI) e `src/main.ts`
**Depends on**: None
**Reuses**: `@nestjs/cli` 12
**Requirement**: base de BOOT-04

**Tools**:

- MCP: context7 (doc Fastify já consultada)
- Skill: NONE

**Done when**:

- [x] `src/main.ts` cria `NestFastifyApplication` com `FastifyAdapter`
- [x] `@nestjs/platform-express` não está nas dependências
- [x] `@nestjs/platform-fastify` e `@fastify/static` estão nas dependências
- [x] Gate de build passa

**Tests**: none
**Gate**: build

**Commit**: `chore(api): scaffold nestjs on fastify`

---

### T2: Validar env com Zod antes do listen

**What**: `ConfigModule` com `envSchema`; `DATABASE_URL` obrigatória.
**Where**: `src/config/env.schema.ts`, `src/app.module.ts`
**Depends on**: T1
**Reuses**: `ConfigModule.forRoot`
**Requirement**: BOOT-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Schema exige `DATABASE_URL` não vazia e aceita `PORT` numérico com default 3000
- [x] Teste unitário falha o parse quando `DATABASE_URL` está ausente e quando está vazia
- [x] `AppModule` registra o schema no `ConfigModule`
- [x] Gate quick passa
- [x] Test count: 2 testes passam

**Tests**: unit
**Gate**: quick

**Commit**: `feat(config): reject boot when database url is missing`

---

### T3: Postgres no Docker Compose [P]

**What**: Compose e `.env.example` com a mesma credencial.
**Where**: `docker-compose.yml`, `.env.example`, `test/compose.spec.ts`
**Depends on**: T1
**Reuses**: nenhum
**Requirement**: BOOT-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `.env.example` define `DATABASE_URL=postgres://finance:finance@localhost:5432/finance`
- [ ] Compose publica `5432` e usa o mesmo user, senha e database
- [ ] Teste unitário compara os quatro valores
- [ ] Gate quick passa
- [ ] Test count: 1 teste passa

**Tests**: unit
**Gate**: quick

**Commit**: `feat(db): add postgres compose aligned with env example`

---

### T4: Módulo Drizzle

**What**: Provider global Drizzle em cima do pool `pg`.
**Where**: `src/database/database.module.ts`, `src/database/schema/index.ts`, `drizzle.config.ts`
**Depends on**: T2
**Reuses**: `ConfigService`
**Requirement**: suporte de BOOT-02 e BOOT-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Token `DRIZZLE` exportado pelo `DatabaseModule`
- [ ] Pool usa `DATABASE_URL` e `connectionTimeoutMillis: 2000`
- [ ] `drizzle.config.ts` aponta para `src/database/schema/index.ts`
- [ ] Gate de build passa

**Tests**: none
**Gate**: build

**Commit**: `feat(db): add drizzle postgres module`

---

### T5: GET /health

**What**: Endpoint com os dois corpos do spec e host inacessível em 503.
**Where**: `src/health/`, `test/health.e2e-spec.ts`, `test/bootstrap.e2e-spec.ts`
**Depends on**: T3, T4
**Reuses**: `DRIZZLE`
**Requirement**: BOOT-01, BOOT-02, BOOT-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Postgres do compose no ar: `GET /health` responde 200 e `{ "status": "ok", "database": "up" }`
- [ ] `DATABASE_URL` em host inacessível: `GET /health` responde 503 e `{ "status": "error", "database": "down" }` sem derrubar o processo
- [ ] Processo com `DATABASE_URL` ausente encerra com código diferente de zero e não loga startup concluído
- [ ] Porta já em uso: processo encerra com código diferente de zero
- [ ] Gate full passa
- [ ] Test count: 4 testes e2e passam, além dos unitários já existentes

**Tests**: e2e
**Gate**: full

**Commit**: `feat(health): report database up or down`

---

### T6: OpenAPI em /docs

**What**: UI e documento JSON incluindo `GET /health`.
**Where**: `src/setup-app.ts`, `src/main.ts`, `src/health/health.controller.ts`, `test/openapi.e2e-spec.ts`
**Depends on**: T5
**Reuses**: `SwaggerModule`, schema Zod do health
**Requirement**: BOOT-04, BOOT-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `GET /docs` responde 200
- [ ] `GET /docs-json` inclui a operação `GET /health`
- [ ] Gate full passa
- [ ] Test count: 2 testes e2e novos passam, sem apagar os anteriores

**Tests**: e2e
**Gate**: full

**Commit**: `feat(openapi): serve swagger for the health route`

---

## Parallel Execution Map

```
Phase 1 (Sequential):
  T1

Phase 2:
  T1 complete, then:
    ├── T2 ──→ T4
    └── T3 [P]

Phase 3 (Sequential):
  T3 and T4 complete, then:
    T5 ──→ T6
```

**Parallelism constraint:** T3 é unit e parallel-safe. T5 e T6 são e2e e sequenciais.

---

## Diagram-Definition Cross-Check

| Task | Depends on (definition) | Diagram shows | Match? |
| ---- | ----------------------- | ------------- | ------ |
| T1 | None | Phase 1 start | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T1 | T1 → T3 | ✅ |
| T4 | T2 | T2 → T4 | ✅ |
| T5 | T3, T4 | T3 and T4 → T5 | ✅ |
| T6 | T5 | T5 → T6 | ✅ |

## Test Co-location Validation

| Task | Layer created | Matrix test type | Task Tests field | Match? |
| ---- | ------------- | ---------------- | ---------------- | ------ |
| T1 | scaffold / config de CLI | none | none | ✅ |
| T2 | Env schema | unit | unit | ✅ |
| T3 | Compose / env | unit | unit | ✅ |
| T4 | Drizzle module | none | none | ✅ |
| T5 | Health HTTP + bootstrap process | e2e | e2e | ✅ |
| T6 | OpenAPI HTTP | e2e | e2e | ✅ |

---

## Commit Plan

| Task | Commit Message |
| ---- | -------------- |
| T1 | `chore(api): scaffold nestjs on fastify` |
| T2 | `feat(config): reject boot when database url is missing` |
| T3 | `feat(db): add postgres compose aligned with env example` |
| T4 | `feat(db): add drizzle postgres module` |
| T5 | `feat(health): report database up or down` |
| T6 | `feat(openapi): serve swagger for the health route` |
