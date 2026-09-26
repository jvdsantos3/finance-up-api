# Auth Access Context

**Gathered:** 2026-09-26
**Spec:** `.specs/features/auth-access/spec.md`
**Status:** Ready for design

---

## Feature Boundary

A API passa a ter usuários, um perfil por usuário e permissões de identidade. O finance-up continua sendo organização financeira; contas e lançamentos não entram aqui. O frontend continua em outro repositório.

---

## Implementation Decisions

### Entrada de usuários

- O primeiro admin nasce por seed no boot, só se a tabela de usuários estiver vazia, com e-mail e senha do ambiente, no perfil Admin.
- Depois, qualquer pessoa se cadastra com e-mail e senha.
- A conta pode fazer login assim que existe. Não há confirmação de e-mail nem ativação manual.
- O cadastro público grava o perfil Usuario.

### Perfil

- Cada usuário tem exatamente um perfil.
- O seed cria dois perfis distintos: Admin para o primeiro usuário, Usuario para o cadastro público.
- Quem tem permissão cria, renomeia e apaga perfis.
- Quem tem permissão troca o perfil de outro usuário. A pessoa não escolhe o perfil no cadastro.

### Sessão

- A API reconhece a chamada por JWT no header `Authorization: Bearer`.
- O login devolve o access no JSON e o refresh em cookie `httpOnly`.
- O access dura 15 minutos. O refresh dura 7 dias e rotaciona a cada uso.
- O logout invalida na hora. A próxima chamada com esse access responde 401.

### Catálogo de permissões

- Autorização com CASL.
- Cada policy nova popula um arquivo de permissões usado na seed.
- Neste corte a lista é só identidade: ver, criar e editar usuários; trocar o perfil de um usuário; ver e gerenciar perfis.
- O perfil Admin do seed recebe todas as permissões dessa lista.
- O perfil Usuario não administra ninguém.
- Qualquer autenticado vê e edita a si em `/me`, sem permissão de administração.

### Redis

- Blacklist do access: chave pelo `jti`, TTL até o access expirar. Logout grava essa chave. A chamada seguinte com o mesmo access responde 401.
- Refresh opaco no Redis, TTL de 7 dias. Cada uso apaga o token antigo e grava outro.
- Cache das permissões do usuário no Redis por 60 segundos. Troca de perfil ou de permissões do perfil apaga esse cache.
- Usuários, perfis e o catálogo de permissões ficam no Postgres.

### Agent's Discretion

- Atributos do cookie além de `httpOnly` (SameSite, Path, Secure em produção).
- Formato interno da ability do CASL, desde que as capacidades do catálogo permaneçam as da spec.

### Declined / Undiscussed Gray Areas → Assumptions

Nenhuma das quatro áreas foi recusada. Defaults não discutidos estão na tabela de assumptions da spec, com Confirmed `n`:

- Admin e Usuario não podem ser apagados nem renomeados.
- Perfil com usuários não pode ser apagado (409).
- `/me` altera nome e senha, e rejeita troca de e-mail ou perfil.
- Login inválido usa o mesmo 401 para e-mail desconhecido e senha errada.
- Senha com no mínimo 8 caracteres.
- Sem bloqueio por tentativas neste corte.

---

## Specific References

- CASL para as policies. Cada policy nova entra no arquivo de seed de permissões.
- Perfil padrão do cadastro público se chama Usuario.
- Perfil do admin inicial se chama Admin.

---

## Deferred Ideas

- Permissões e rotas de contas e lançamentos.
- Confirmação de e-mail, OAuth e convite.
- Apagar usuário.
- Bloqueio após várias senhas erradas.
- Telas no `finance-up-web`.
