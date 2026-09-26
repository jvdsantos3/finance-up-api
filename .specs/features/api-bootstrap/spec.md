# API Bootstrap Specification

**Status**: Approved

## Problem Statement

O `finance-up-api` ainda não existe. Sem uma base NestJS com banco, validação e contrato OpenAPI, cada feature de finanças nasceria com decisões de stack diferentes. Este corte cria só a fundação executável: app sobe, fala com Postgres, valida ambiente com Zod e publica um contrato OpenAPI.

## Goals

- [ ] `pnpm start:dev` sobe a API com env válido e Postgres acessível
- [ ] `GET /health` distingue API no ar de banco indisponível
- [ ] O mesmo Zod que valida o ambiente e os contratos alimenta o OpenAPI
- [ ] Postgres local sobe com Docker Compose, sem instalação manual do banco

## Out of Scope

| Feature | Reason |
| --- | --- |
| Contas, lançamentos, categorias, orçamento | Domínio vem em features seguintes |
| Autenticação e autorização | Não há recurso protegido neste corte |
| Frontend (`finance-up-web`) | Repositório separado |
| CQRS, event sourcing, microsserviços | Peso sem ganho num app pessoal neste estágio |
| `@nestjs/observe` / tracing | Observabilidade nativa do Nest 12 fica para depois |
| CI, deploy, Dockerfile de produção da API | Compose do Postgres basta para desenvolver |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Forma do produto | API NestJS neste repositório; frontend em `finance-up-web`, projeto separado | Confirmado pelo usuário: o produto não junta front e API | y |
| Organização da API | Um processo Nest, módulos por capacidade (`config`, `database`, `health`) | Organização oficial de módulos do Nest, dentro da API apenas | y |
| Runtime | NestJS 12.1.0, Node >= 20 (máquina atual: 24.15.0) | Linha atual no npm em 2026-09-26; exige Node 20.19+ / 22.12+ | y |
| Validação e OpenAPI | Zod 4.6 + `StandardSchemaValidationPipe` + `@nestjs/swagger` 12 | Zod 4.2+ expõe `~standard.jsonSchema`; o Swagger do Nest 12 converte o schema sem `zod-openapi`. `nestjs-zod` 5.5.0 declara peer só até Nest 11 | y |
| ORM | Drizzle 0.45.3 + `pg` + drizzle-kit 0.31.11 (`generate` / `migrate`) | SQL-first, tipado. Schema em `src/database/schema` até existir módulo de domínio | y |
| HTTP | Fastify (`@nestjs/platform-fastify` + `@fastify/static`) | Confirmado pelo usuário no lugar do Express | y |
| Módulos | ESM + Vitest, strict TypeScript, pnpm | CLI do Nest 12 usa ESM e Vitest quando o `nest new` roda sem prompt | y |
| Falha de banco | Processo sobe; `GET /health` responde 503 se o Postgres não responder | O processo precisa continuar vivo para o healthcheck | y |
| Env inválido | Processo não escuta porta; falha no bootstrap | Config inválida não deve servir tráfego | y |
| Dinheiro | Fora deste corte; futuro usa inteiro em centavos ou `numeric`, nunca `float` | Evita erro clássico de finanças quando o domínio chegar | y |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Fundação executável ⭐ MVP

**User Story**: Como desenvolvedor do finance-up, quero uma API NestJS que sobe com Postgres, validação Zod e OpenAPI para que as próximas features entrem num contrato estável.

**Why P1**: Sem isso não há onde implementar domínio.

**Acceptance Criteria**:

1. WHEN o ambiente obrigatório está ausente ou inválido THEN o processo SHALL encerrar no bootstrap e SHALL NOT escutar a porta HTTP.
2. WHEN `pnpm start:dev` roda com env válido e o Postgres aceita conexão THEN `GET /health` SHALL responder 200 com corpo JSON `{ "status": "ok", "database": "up" }`.
3. WHEN o Postgres não aceita conexão THEN `GET /health` SHALL responder 503 com corpo JSON `{ "status": "error", "database": "down" }`.
4. WHEN um cliente abre a UI de documentação THEN o servidor SHALL servi-la em `GET /docs`.
5. WHEN um cliente pede o documento OpenAPI THEN `GET /docs-json` SHALL incluir a operação `GET /health`.
6. WHEN `docker compose up -d` THEN um Postgres SHALL ficar aceitando conexão na porta publicada do compose, com usuário, senha e database definidos no `.env.example`.

**Independent Test**: Subir o compose, copiar `.env.example` para `.env`, rodar `pnpm start:dev` e chamar `/health` e `/docs`. Parar o Postgres e ver `/health` em 503. Apagar `DATABASE_URL` e ver o processo recusar o start.

---

## Edge Cases

- WHEN `DATABASE_URL` aponta para um host inexistente THEN `GET /health` SHALL responder 503 sem derrubar o processo.
- WHEN a porta HTTP já está em uso THEN o processo SHALL falhar no listen com erro do Node, sem mascarar a causa.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| BOOT-01 | P1: env inválido aborta o bootstrap | Specify | Pending |
| BOOT-02 | P1: health 200 com banco up | Specify | Pending |
| BOOT-03 | P1: health 503 com banco down | Specify | Pending |
| BOOT-04 | P1: UI OpenAPI em `/docs` | Specify | Pending |
| BOOT-05 | P1: documento inclui `GET /health` | Specify | Pending |
| BOOT-06 | P1: Postgres via Docker Compose | Specify | Pending |

**Coverage:** 6 total, 0 mapped to tasks, 6 unmapped

---

## Success Criteria

- [ ] Os seis critérios de aceite passam num ambiente local com Docker
- [ ] Nenhuma dependência de domínio (auth, contas, lançamentos) entra neste corte
