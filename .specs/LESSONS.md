# LESSONS — auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation — do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 — After logout, assert both access and refresh are rejected on the next use, not only the access token
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `auth,sessions` · harmful: 0
- features: auth-access
- evidence: AUTH-07 (auth,sessions)
- last seen: 2026-09-26T15:40:20Z

### L-002 — When the spec requires boot failure for a missing env var, add a schema or bootstrap test that omits that var and asserts non-zero exit
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `config,bootstrap` · harmful: 0
- features: auth-access
- evidence: spec.md edge: ADMIN_EMAIL|ADMIN_PASSWORD missing (config,bootstrap)
- last seen: 2026-09-26T15:40:20Z

## Quarantined (failed when applied — ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
