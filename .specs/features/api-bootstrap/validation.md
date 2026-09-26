# API Bootstrap Validation

**Date**: 2026-09-26
**Spec**: `.specs/features/api-bootstrap/spec.md`
**Diff range**: `f45da3a..2f32991`
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 Scaffold NestJS Fastify | ✅ Done | commit `5dc413c` |
| T2 Env Zod validation | ✅ Done | commit `eba6947` |
| T3 Postgres Compose | ✅ Done | commit `e4f2d1f` |
| T4 Drizzle module | ✅ Done | commit `cf9f4be` |
| T5 GET /health | ✅ Done | commit `268bbef` |
| T6 OpenAPI /docs | ✅ Done | commit `2f32991` |

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN ambiente obrigatório ausente/inválido THEN encerra no bootstrap e NÃO escuta HTTP | exit ≠ 0; sem listen | `test/bootstrap.e2e-spec.ts:54-55` — `expect(result.code).not.toBe(0)`; `expect(result.output).not.toContain('Nest application successfully started')`; `src/config/env.schema.spec.ts:7` — `expect(result.success).toBe(false)` (ausente); `src/config/env.schema.spec.ts:13` — `expect(result.success).toBe(false)` (vazio) | ✅ PASS |
| WHEN `pnpm start:dev` com env válido e Postgres aceita THEN `GET /health` → 200 `{ status: "ok", database: "up" }` | status 200; corpo exato | `test/health.e2e-spec.ts:30-31` — `expect(response.statusCode).toBe(200)`; `expect(response.json()).toEqual({ status: 'ok', database: 'up' })` | ✅ PASS |
| WHEN Postgres não aceita conexão THEN `GET /health` → 503 `{ status: "error", database: "down" }` | status 503; corpo exato | `test/health.e2e-spec.ts:41-42` — `expect(response.statusCode).toBe(503)`; `expect(response.json()).toEqual({ status: 'error', database: 'down' })` | ✅ PASS |
| WHEN cliente abre UI de documentação THEN servidor serve em `GET /docs` | resposta HTTP em `/docs` | `test/openapi.e2e-spec.ts:15` — `expect(response.statusCode).toBe(200)` | ✅ PASS |
| WHEN cliente pede OpenAPI THEN `GET /docs-json` inclui operação `GET /health` | path `/health` com `get` | `test/openapi.e2e-spec.ts:27-28` — `expect(response.statusCode).toBe(200)`; `expect(document.paths?.['/health']?.get).toBeDefined()` | ✅ PASS |
| WHEN `docker compose up -d` THEN Postgres aceita na porta publicada com user/senha/db do `.env.example` | user/senha/db/porta alinhados; conexão aceita | `test/compose.spec.ts:14-22` — `expect(url.username/password/hostname/port/pathname)` + `expect(compose).toContain(...)` para `POSTGRES_*` e `5433:5432`; evidência viva: `test/health.e2e-spec.ts:19-31` (`docker compose up -d --wait` + health 200 com URL do `.env.example`) | ✅ PASS |

**Status**: ✅ All ACs covered

---

## Discrimination Sensor

Scratch state: `git worktree add --detach /tmp/finance-up-api-sensor 2f32991` (árvore real em `/home/jvdsantos3/finance-up/finance-up-api` não mutada). Worktree removido após o sensor.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `src/health/health.controller.ts` (`database === 'down'` → `'up'`) | Inverte condição do 503 | ✅ Killed — `health.e2e-spec.ts` falhou (503→200 no caminho unreachable) |
| 2 | `src/config/env.schema.ts` (`DATABASE_URL` → `.optional()`) | Permite env sem `DATABASE_URL` | ✅ Killed — `env.schema.spec.ts:7` (`success` true vs false). Nota: `bootstrap.e2e-spec.ts` sozinho sobrevive via `getOrThrow` no `DatabaseModule` (ainda exit ≠ 0); a suíte unitária relevante mata o mutante |
| 3 | `src/health/health.service.ts` (sempre retorna `{ status: 'ok', database: 'up' }`) | Ignora falha de DB | ✅ Killed — `health.e2e-spec.ts:41` esperava 503, recebeu 200 |

**Sensor depth**: lightweight (3 behavior-level mutations)
**Result**: 3/3 killed — PASS ✅

---

## Interactive UAT Results (if performed)

N/A — feature de infraestrutura/backend; gates automatizados bastam.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ (sem domínio auth/contas) |
| Matches patterns | ✅ Nest modules + Fastify |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ |
| Every test maps to a spec requirement — no unclaimed tests | ✅ |
| Documented guidelines followed: none — strong defaults applied | ✅ |

---

## Edge Cases

- [x] `DATABASE_URL` host inexistente → 503 sem derrubar processo: `test/health.e2e-spec.ts:35-43` (`127.0.0.1:1`; inject completa após 503)
- [x] Porta HTTP em uso → falha no listen com erro Node: `test/bootstrap.e2e-spec.ts:76-77` — `expect(result.code).not.toBe(0)`; `expect(result.output).toContain('EADDRINUSE')`

---

## Gate Check

- **Gate command**: `pnpm test && pnpm test:e2e` (+ `pnpm build`; lint via `pnpm exec oxlint --type-aware src/ test/` — não `pnpm lint` neste ambiente)
- **Result**: unit 3 passed / 0 failed; e2e 6 passed / 0 failed; build 0; oxlint 0; skipped 0
- **Test count before feature**: 0 (repo novo neste corte)
- **Test count after feature**: 9 (3 unit + 6 e2e)
- **Delta**: +9
- **Skipped tests**: none
- **Failures**: none
- **Working tree**: clean on `main` @ `2f32991`

---

## Fix Plans (if issues found)

Nenhum.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| BOOT-01 | Verified | ✅ Verified (reconfirmado) |
| BOOT-02 | Verified | ✅ Verified (reconfirmado) |
| BOOT-03 | Verified | ✅ Verified (reconfirmado) |
| BOOT-04 | Verified | ✅ Verified (reconfirmado) |
| BOOT-05 | Verified | ✅ Verified (reconfirmado) |
| BOOT-06 | Verified | ✅ Verified (reconfirmado) |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 6/6 ACs matched spec outcome | 0 spec-precision gaps
**Sensor**: 3/3 mutations killed
**Gate**: 9 passed (3 unit + 6 e2e), 0 failed

**What works**: Bootstrap rejeita env inválido; health 200/503 com corpos exatos; OpenAPI em `/docs` e `/docs-json` com `GET /health`; Compose alinhado ao `.env.example` na porta 5433; edge cases de host inacessível e `EADDRINUSE`.

**Issues found**: none

**Next steps**: feature pronta para merge/uso como base das features de domínio
