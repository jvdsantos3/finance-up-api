# STATE

## Decisions

### AD-001
- **Decision**: O finance-up separa API e frontend; este repositório contém somente a API.
- **Reason**: O frontend vive em `finance-up-web` e não entra no processo HTTP da API.
- **Trade-off**: Não há app full-stack neste repositório; o contrato entre os dois é o OpenAPI.
- **Scope**: Todos os features da API
- **Date**: 2026-09-26
- **Status**: active

### AD-002
- **Decision**: O adapter HTTP da API é Fastify.
- **Reason**: Escolha explícita para este projeto.
- **Trade-off**: Plugins e exemplos da comunidade em Express precisam do equivalente Fastify.
- **Scope**: Bootstrap e todos os controllers
- **Date**: 2026-09-26
- **Status**: active

### AD-003
- **Decision**: Validação e OpenAPI usam Zod 4 com o Standard Schema do NestJS 12.
- **Reason**: É o caminho documentado do Nest 12. O `nestjs-zod` 5.5.0 não declara peer para Nest 12.
- **Trade-off**: DTOs de classe do `class-validator` não são o padrão daqui.
- **Scope**: Env, request, response e Swagger
- **Date**: 2026-09-26
- **Status**: active

### AD-004
- **Decision**: Persistência é Drizzle ORM com `pg` e Postgres.
- **Reason**: SQL tipado, migrations via drizzle-kit, sem Active Record.
- **Trade-off**: Não há repositório genérico; cada módulo escreve as queries que precisa.
- **Scope**: Acesso a dados
- **Date**: 2026-09-26
- **Status**: active

## Handoff

- **Feature**: api-bootstrap (`.specs/features/api-bootstrap/`)
- **Phase / Task**: Execute / T1 — scaffold NestJS no Fastify
- **Completed**: Specify, Design, Tasks
- **In-progress**: T1 ainda sem arquivos de aplicação
- **Next step**: gerar o app com o CLI em diretório temporário e copiar para `finance-up-api`
- **Blockers**: none
- **Uncommitted files**: `.specs/`
- **Branch**: git ainda não iniciado
