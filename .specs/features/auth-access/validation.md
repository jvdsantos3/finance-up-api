# Auth Access Validation

**Date**: 2026-09-26
**Spec**: `.specs/features/auth-access/spec.md`
**Diff range**: `c335027..d1d6890` (`c335027` = docs bootstrap validation; `e0ad43e` = `feat(auth): keep sessions and permission cache in redis`; `d1d6890` = `test(auth): cover refresh revocation and missing admin env`; HEAD = `d1d6890`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| Spec / context / design | ✅ Done | sem `tasks.md` neste feature; STATE aponta Execute concluído |
| Implementação auth + identidade + Redis | ✅ Done | commit `e0ad43e` |
| Testes e2e / unit de env | ✅ Done | `test/auth.e2e-spec.ts`, `test/bootstrap.e2e-spec.ts`, `src/config/env.schema.spec.ts`; reforços AUTH-07 + edge `ADMIN_*` em `d1d6890` |
| Validação independente | ✅ Done | gaps do pass anterior fechados; evidência rederivada |

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| AUTH-01: tabela vazia + `ADMIN_EMAIL`/`ADMIN_PASSWORD` → cria Admin; boot seguinte não duplica | 1 usuário `admin@finance.test` com perfil `Admin`; após recriar app ainda length 1 | `test/auth.e2e-spec.ts:73-78` — `expect(listed.json()).toEqual([expect.objectContaining({ email: 'admin@finance.test', profile: expect.objectContaining({ name: 'Admin' }) })])`; `test/auth.e2e-spec.ts:88` — `expect(second.json()).toHaveLength(1)` | ✅ PASS |
| AUTH-02: `POST /auth/register` e-mail novo + senha ≥8 → 201 sem senha, perfil Usuario, login ok | 201; sem `passwordHash`; `profile.name === 'Usuario'`; login retorna access | `test/auth.e2e-spec.ts:101-110` — `expect(created.statusCode).toBe(201)`; `toMatchObject({ profile: { name: 'Usuario' } })`; `not.toHaveProperty('passwordHash')`; `expect(session.accessToken).toEqual(expect.any(String))` | ✅ PASS |
| AUTH-03: e-mail duplicado → 409 | status 409 | `test/auth.e2e-spec.ts:121` — `expect(duplicate.statusCode).toBe(409)` | ✅ PASS |
| AUTH-04: login válido → 200 + `accessToken` JSON + refresh `httpOnly` | 200; corpo com `accessToken`; cookie `HttpOnly` | `test/auth.e2e-spec.ts:365-372` — `expect(response.statusCode).toBe(200)`; `expect(response.json()).toEqual({ accessToken: expect.any(String), expiresIn: 900 })`; `expect(...set-cookie).toContain('HttpOnly')` | ✅ PASS |
| AUTH-05: e-mail inexistente ou senha errada → 401 corpo idêntico | ambos 401; `{ statusCode: 401, message: 'Credenciais inválidas' }` | `test/auth.e2e-spec.ts:149-154` — `expect(unknown.statusCode).toBe(401)`; `expect(wrong.statusCode).toBe(401)`; `expect(unknown.json()).toEqual(wrong.json())`; `expect(unknown.json()).toEqual({ statusCode: 401, message: 'Credenciais inválidas' })` | ✅ PASS |
| AUTH-06: refresh válido → 200 access novo + cookie rotacionado | 200; novo `accessToken`; novo refresh ≠ antigo; antigo → 401 | `test/auth.e2e-spec.ts:164-178` — `expect(refreshed.statusCode).toBe(200)`; `expect(nextRefresh).not.toBe(session.refreshToken)`; `expect(reused.statusCode).toBe(401)` | ✅ PASS |
| AUTH-07: logout com access válido → invalida access **e** refresh; próxima chamada com access → 401 | access e refresh invalidados; próxima chamada com access → 401 | `test/auth.e2e-spec.ts:191-205` — `expect(logout.statusCode).toBe(204)`; `expect(me.statusCode).toBe(401)`; `expect(refresh.statusCode).toBe(401)` (refresh pós-logout) | ✅ PASS |
| AUTH-08: autenticado `GET/PATCH /me` → ver/alterar nome e senha sem permissão admin | PATCH nome/senha ok; sem hash; login com senha nova | `test/auth.e2e-spec.ts:216-221` — `expect(updated.statusCode).toBe(200)`; `toMatchObject({ name: 'Ana Souza' })`; `not.toHaveProperty('passwordHash')`; `expect(next.accessToken).toEqual(expect.any(String))` | ✅ PASS |
| AUTH-09: rota users/profiles sem permissão → 403 | 403 | `test/auth.e2e-spec.ts:247` — `expect(forbidden.statusCode).toBe(403)` (`GET /users` como Usuario) | ✅ PASS |
| AUTH-10: Admin do seed autoriza catálogo de identidade | Admin usa users/profiles do catálogo | `test/auth.e2e-spec.ts:250-309` — Admin `GET /profiles` 200; `POST /users` 201; `PATCH` nome; `POST /profiles`; `PATCH` `profileId` (assign) | ✅ PASS |
| AUTH-11: `REDIS_URL` ausente → encerra sem listen | exit ≠ 0; sem “successfully started”; schema rejeita | `test/bootstrap.e2e-spec.ts:62-63` — `expect(result.code).not.toBe(0)`; `expect(result.output).not.toContain('Nest application successfully started')`; `src/config/env.schema.spec.ts:24` — `expect(result.success).toBe(false)` | ✅ PASS |
| AUTH-12: Redis sem conexão → login 503; processo segue | 503; inject completa | `test/auth.e2e-spec.ts:354` — `expect(response.statusCode).toBe(503)` (app isolado sobe, responde e `close`) | ✅ PASS |

**Status**: ✅ All ACs covered

---

## Discrimination Sensor

Scratch state: `git worktree add --detach /tmp/finance-up-api-auth-sensor-v2 d1d6890` (árvore real em `/home/jvdsantos3/finance-up/finance-up-api` não mutada). Worktree removido após o sensor. Compose do host (portas 5433/6379) reutilizado.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `src/auth/session.service.ts` (revoke) | Remove gravação da blacklist do `jti` | ✅ Killed — `rejects the access token after logout` esperava 401 no `/me`, falhou |
| 2 | `src/auth/auth.service.ts` (register) | Não lança `ConflictException` em e-mail duplicado | ✅ Killed — esperava 409, recebeu 500 |
| 3 | `src/identity/access.guard.ts` | Não lança `ForbiddenException` sem permissão | ✅ Killed — `forbids Usuario` esperava 403 |
| 4 | `src/auth/auth.schemas.ts` | `password.min(8)` → `min(1)` no register | ✅ Killed — esperava 400, recebeu 201 |
| 5 | `src/auth/auth.service.ts` (login) | Mensagem `Credenciais inválidas` → `Senha incorreta` | ✅ Killed — corpo 401 divergiu |
| 6 | `src/config/env.schema.ts` | `REDIS_URL` → `.optional()` | ✅ Killed — `env.schema.spec.ts` (`success` true vs false) |
| 7 | `src/auth/session.service.ts` (rotate) | Não apaga refresh antigo | ✅ Killed — reuso do refresh esperava 401, recebeu 200 |
| 8 | `src/auth/session.service.ts` (revoke) | Não apaga refresh no logout | ✅ Killed — `expect(refresh.statusCode).toBe(401)` pós-logout |

**Sensor depth**: P0-full (≥5 behavior-level mutations; auth/sessão; 8 injetadas)
**Result**: 8/8 killed — PASS ✅

---

## Interactive UAT Results (if performed)

N/A — feature de API/backend; gates automatizados bastam.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ (sem domínio financeiro) |
| Matches patterns | ✅ Nest modules + Fastify + Zod |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ |
| Every test maps to a spec requirement — no unclaimed tests | ✅ |
| Documented guidelines followed: none — strong defaults applied | ✅ |

---

## Edge Cases

- [x] `ADMIN_EMAIL` ou `ADMIN_PASSWORD` falta e não há usuários → boot falha antes do listen: `test/bootstrap.e2e-spec.ts:77-78` (`ADMIN_EMAIL` ausente) e `test/bootstrap.e2e-spec.ts:92-93` (`ADMIN_PASSWORD` ausente) — `expect(result.code).not.toBe(0)`; `expect(result.output).not.toContain('Nest application successfully started')`
- [x] Senha de cadastro &lt; 8 → 400: `test/auth.e2e-spec.ts:134` — `expect(response.statusCode).toBe(400)`
- [x] `PATCH /me` altera e-mail ou perfil → 400: `test/auth.e2e-spec.ts:229` e `:237` — `expect(...).toBe(400)`
- [x] Apagar perfil com usuários → 409: `test/auth.e2e-spec.ts:343` — `expect(deleteInUse.statusCode).toBe(409)`
- [x] Apagar/renomear Admin ou Usuario → 409: `test/auth.e2e-spec.ts:328` e `:336` — `expect(...).toBe(409)`

---

## Gate Check

- **Gate command**: `pnpm test && pnpm test:e2e` (+ lint `pnpm exec oxlint --type-aware src/ test/`)
- **Result**: unit 4 passed / 0 failed; e2e 19 passed / 0 failed; oxlint 0; skipped 0
- **Test count before feature**: 9 (3 unit + 6 e2e, bootstrap validation)
- **Test count after feature**: 23 (4 unit + 19 e2e)
- **Delta**: +14
- **Skipped tests**: none
- **Failures**: none
- **Working tree**: `src/` e `test/` limpos em `main` @ `d1d6890`; untracked apenas artefatos de validação/lessons do pass anterior (não commitados)

---

## Fix Plans (if issues found)

Nenhum.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| AUTH-01 | Implemented | ✅ Verified |
| AUTH-02 | Implemented | ✅ Verified |
| AUTH-03 | Implemented | ✅ Verified |
| AUTH-04 | Implemented | ✅ Verified |
| AUTH-05 | Implemented | ✅ Verified |
| AUTH-06 | Implemented | ✅ Verified |
| AUTH-07 | Implemented | ✅ Verified |
| AUTH-08 | Implemented | ✅ Verified |
| AUTH-09 | Implemented | ✅ Verified |
| AUTH-10 | Implemented | ✅ Verified |
| AUTH-11 | Implemented | ✅ Verified |
| AUTH-12 | Implemented | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 12/12 ACs matched spec outcome | 0 spec-precision gaps | 5/5 edge cases covered
**Sensor**: 8/8 mutations killed
**Gate**: 23 passed (4 unit + 19 e2e), 0 failed

**What works**: seed Admin idempotente; register/login/refresh/logout (access **e** refresh); CASL 403/Admin; Redis obrigatório e 503 no login; edge cases de `ADMIN_*` ausente, senha curta, `/me` estrito, perfis sistema/em uso; sensor discrimina regressões críticas incluindo conjunção AUTH-07.

**Issues found**: none

**Next steps**: feature pronta; lessons candidatas do FAIL anterior (`L-001`, `L-002`) mantidas — PASS limpo não grava lição nova nem remove candidatos (per `lessons.md`: signal → write; clean PASS → write nothing)
