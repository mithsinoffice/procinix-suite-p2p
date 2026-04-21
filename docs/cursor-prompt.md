You are implementing the multi-tenancy and access-control overhaul for this
codebase. Substantial work has already been done in a previous session and is
committed to branch `wip-apr21-preserve-current-state`. Your job is to extend
that work, not replace it.

Do NOT write application code or SQL yet.

## Reading order (all three are required)

1. @docs/multi-tenancy-spec.md — the original spec (reference)
2. @docs/multi-tenancy-existing-state.md — reconciliation addendum; when it
   contradicts the main spec, the addendum wins
3. @AGENTS.md and @.cursorrules — project conventions

## What to do

Steps 1–3: read.

Step 4: verify the addendum against reality. For each section of
`multi-tenancy-existing-state.md` §1, open the referenced files and confirm
they match the description. Flag any discrepancies.

Step 5: audit the current auth flow end-to-end. Trace a login request from
the frontend `Login.tsx` through the API to the point where `X-User-Email` is
set. Document which endpoints accept it.

Step 6: grep for every endpoint in `server/index.mjs` that queries the
database. For each, note whether it currently filters by `tenant_id`. Produce
a table: `endpoint | method | tables touched | filters by tenant_id? | needs permission`

Step 7: run this and report findings:
```
find . -path ./node_modules -prune -o -type f -print | grep -E ' [0-9]+\.' | grep -v node_modules
```
List any macOS duplicate files that should be deleted in Phase 0.

Step 8: produce a phase-by-phase delivery plan based on the 9 phases in
addendum §4. For each phase list:
  - Existing files to modify (cite paths)
  - New files to create (cite paths)
  - Migrations to add (cite filename, e.g. `sql/mysql/migrations/20260422_...sql`)
  - Tests to add (paths under `src/utils/__tests__/` and any new server tests)
  - Risks and how to mitigate
  - Rollback procedure

Output everything above as a single markdown response. Do not write
application code, do not write SQL, do not modify any files. I will review
the plan and only then will we begin Phase 0.

## Hard constraints

- UUIDs (`VARCHAR(36)`) everywhere for new tables — do not introduce BIGINT IDs
- All new and altered tables live in the default application schema, NOT in a
  separate `tenant_master` schema
- ES modules only; `.mjs` on server; mysql2/promise; parameterized queries
- Match the existing idempotent migration pattern (information_schema checks,
  PREPARE/EXECUTE blocks) from `sql/mysql/migrations/20260421_multi_tenant_entity.sql`
- Do not break: IMAP email poller, Gemini OCR, existing super-admin console,
  invoice forms, any master data screen
- Do not revert any Supabase → MySQL migration work
- Phase 1 is security hardening (plaintext passwords + JWT). Nothing else
  ships before that.
- Keep `X-User-Email` and `SUPER_ADMIN_EMAILS` as dev-only fallbacks until
  Phase 8
