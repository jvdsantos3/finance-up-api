# Auth Access Specification

**Status**: Approved

## Problem Statement

O finance-up organiza a vida financeira de quem usa o produto. Antes de contas e lançamentos, a API precisa saber quem está chamando e o que o perfil dessa pessoa permite. Este corte entrega usuários, perfis e permissões na API.

## Goals

- [x] Um admin inicial existe depois do primeiro boot, vindo do ambiente, só quando não há usuários
- [x] Qualquer pessoa cria conta com e-mail e senha, entra na hora e fica no perfil Usuario
- [x] Cada usuário tem um perfil; permissões do perfil vêm do CASL, semeadas num arquivo
- [x] Login, refresh e logout seguem o contrato de JWT, cookie e revogação imediata
- [x] Redis guarda a blacklist do access, o refresh e o cache das permissões do usuário

## Out of Scope

| Feature | Reason |
| --- | --- |
| Contas, lançamentos, categorias, orçamento | Domínio financeiro vem depois |
| Nomes de permissão de finanças | O catálogo deste corte é só identidade |
| Frontend | Repositório separado |
| Confirmação de e-mail, OAuth, convite | Login é imediato, com e-mail e senha |
| Apagar usuário | Não foi pedido |
| Criar permissão nova pela API | A lista nasce no código e na seed |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Seed do admin | Se não existe usuário, o boot cria um com `ADMIN_EMAIL` e `ADMIN_PASSWORD` no perfil Admin | O usuário pediu seed. Variáveis de ambiente evitam senha no código | y |
| Cadastro | `POST /auth/register` público, e-mail e senha, perfil Usuario, login imediato | Fechado na discussão | y |
| Perfis por usuário | Exatamente um | Fechado na discussão | y |
| Catálogo de perfis | Quem tem permissão cria, renomeia e apaga perfis. Admin e Usuario nascem no seed e não podem ser apagados nem renomeados | Apagar Usuario quebra o cadastro público; apagar Admin quebra o seed | y |
| Perfil em uso | Apagar um perfil que ainda tem usuário responde 409 | Evita usuário sem perfil | y |
| Sessão | JWT Bearer. Access no JSON (15 min). Refresh em cookie httpOnly (7 dias), rotaciona a cada uso. Logout torna o access atual inválido na próxima chamada (401) | Fechado na discussão | y |
| Autorização | CASL. Cada policy nova entra num arquivo de seed de permissões. Perfil só liga itens dessa lista | Pedido explícito do usuário | y |
| Catálogo deste corte | `users.read`, `users.create`, `users.update`, `users.assign-profile`, `profiles.read`, `profiles.manage` | Identidade apenas. Nomes exatos ficam ajustáveis no design se o CASL pedir outro formato, sem mudar a capacidade | y |
| Admin | O seed liga o perfil Admin a todas as permissões do catálogo | Fechado na discussão | y |
| Usuario e /me | O perfil Usuario não recebe essas permissões. Qualquer autenticado lê e edita a si em `/me` (nome e senha). `/me` não troca e-mail nem perfil | Confirmado ao seguir com o contexto | y |
| Login inválido | E-mail desconhecido e senha errada respondem 401 com o mesmo corpo `{ "statusCode": 401, "message": "Credenciais inválidas" }` | Não revela se o e-mail existe | y |
| E-mail duplicado | Segundo cadastro com o mesmo e-mail responde 409 | E-mail é o identificador | y |
| Senha | Mínimo 8 caracteres. Hash argon2id | Regra curta e testável. argon2id é o hash adequado para senha | y |
| Limite de tentativas | Sem bloqueio de conta neste corte | Fica para um corte de abuso | y |
| Redis | `REDIS_URL` obrigatória. Blacklist do `jti` do access, refresh opaco com TTL de 7 dias, cache das permissões do usuário por 60s. Redis fora do ar: login, refresh e logout respondem 503 e o processo continua | Pedido do usuário. Postgres segue como fonte de usuários, perfis e permissões | y |

**Open questions:** nenhuma em aberto fora desta tabela. Itens com Confirmed `n` são o default adotado; a confirmação do contexto aceita esses defaults, salvo correção.

---

## User Stories

### P1: Entrar e agir segundo o perfil ⭐ MVP

**User Story**: Como pessoa que usa o finance-up, quero criar conta, entrar e ser limitada pelo meu perfil para que a API saiba o que posso fazer.

**Why P1**: Sem isso não há dono para os dados financeiros que virão.

**Acceptance Criteria**:

1. WHEN a tabela de usuários está vazia e o processo sobe com `ADMIN_EMAIL` e `ADMIN_PASSWORD` THEN o sistema SHALL criar um usuário com esse e-mail, no perfil Admin, e SHALL NOT criar outro no boot seguinte.
2. WHEN `POST /auth/register` recebe e-mail novo e senha com pelo menos 8 caracteres THEN o sistema SHALL responder 201, sem a senha, com o perfil Usuario, e esse usuário SHALL conseguir login em seguida.
3. WHEN `POST /auth/register` recebe um e-mail já usado THEN o sistema SHALL responder 409.
4. WHEN `POST /auth/login` recebe e-mail e senha corretos THEN o sistema SHALL responder 200 com `accessToken` no JSON e SHALL enviar o refresh em cookie `httpOnly`.
5. WHEN `POST /auth/login` recebe e-mail inexistente ou senha errada THEN o sistema SHALL responder 401 com o mesmo corpo nos dois casos.
6. WHEN `POST /auth/refresh` envia um refresh válido THEN o sistema SHALL responder 200 com um access novo e SHALL rotacionar o cookie de refresh.
7. WHEN `POST /auth/logout` é chamado com um access válido THEN o sistema SHALL invalidar esse access e o refresh, e a próxima chamada com esse access SHALL responder 401.
8. WHEN um autenticado chama `GET /me` ou `PATCH /me` THEN o sistema SHALL permitir ver e alterar o próprio nome e a própria senha, sem permissão de administração.
9. WHEN um autenticado chama uma rota de usuários ou perfis sem a permissão do perfil THEN o sistema SHALL responder 403.
10. WHEN o perfil Admin do seed chama as rotas de identidade THEN o sistema SHALL autorizar todas as permissões do catálogo.
11. WHEN `REDIS_URL` está ausente THEN o processo SHALL encerrar no bootstrap e SHALL NOT escutar a porta HTTP.
12. WHEN o Redis não aceita conexão THEN `POST /auth/login` SHALL responder 503 e o processo SHALL continuar no ar.

**Independent Test**: Subir com o banco vazio e as variáveis do admin, entrar com esse usuário, cadastrar outro por `/auth/register`, ver que o segundo é Usuario e recebe 403 em `/users`, e que o admin lista usuários.

---

## Edge Cases

- WHEN `ADMIN_EMAIL` ou `ADMIN_PASSWORD` falta e não há usuários THEN o boot SHALL falhar antes de escutar a porta.
- WHEN a senha do cadastro tem menos de 8 caracteres THEN o sistema SHALL responder 400.
- WHEN `PATCH /me` tenta alterar o perfil ou o e-mail THEN o sistema SHALL responder 400.
- WHEN se apaga um perfil que ainda tem usuários THEN o sistema SHALL responder 409.
- WHEN se tenta apagar ou renomear Admin ou Usuario THEN o sistema SHALL responder 409.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| AUTH-01 | P1: seed do admin | Execute | Implemented |
| AUTH-02 | P1: cadastro público no perfil Usuario | Execute | Implemented |
| AUTH-03 | P1: e-mail duplicado | Execute | Implemented |
| AUTH-04 | P1: login com access e cookie de refresh | Execute | Implemented |
| AUTH-05 | P1: login inválido indistinguível | Execute | Implemented |
| AUTH-06 | P1: refresh rotaciona | Execute | Implemented |
| AUTH-07 | P1: logout revoga na hora | Execute | Implemented |
| AUTH-08 | P1: /me sem permissão de admin | Execute | Implemented |
| AUTH-09 | P1: rota sem permissão responde 403 | Execute | Implemented |
| AUTH-10 | P1: Admin do seed tem o catálogo inteiro | Execute | Implemented |
| AUTH-11 | P1: REDIS_URL ausente aborta o boot | Execute | Implemented |
| AUTH-12 | P1: Redis fora do ar responde 503 no login | Execute | Implemented |

**Coverage:** 12 total, 12 mapped to `test/auth.e2e-spec.ts` e `test/bootstrap.e2e-spec.ts`, 0 unmapped

---

## Success Criteria

- [ ] Os dez critérios de aceite passam contra a API local
- [ ] Nenhuma rota de finanças entra neste corte
