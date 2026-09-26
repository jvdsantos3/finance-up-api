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

### AD-005
- **Decision**: Redis guarda estado efêmero da API: blacklist de access token, refresh token e cache de permissões.
- **Reason**: O logout precisa invalidar o JWT na hora, e o refresh rotaciona com TTL. O Postgres continua dono de usuários, perfis e permissões.
- **Trade-off**: Se o Redis reiniciar, as sessões abertas caem e o cache esfria. Os usuários permanecem.
- **Scope**: Autenticação e cache de autorização
- **Date**: 2026-09-26
- **Status**: active

## Handoff

- **Feature**: auth-access (`.specs/features/auth-access/`)
- **Phase / Task**: Validação PASS
- **Completed**: AUTH-01..AUTH-12, Redis, identidade e sessão
- **In-progress**: nenhum
- **Next step**: próximo domínio financeiro, quando for pedido
- **Blockers**: nenhum
- **Uncommitted files**: nenhum depois do commit da validação
- **Branch**: main
