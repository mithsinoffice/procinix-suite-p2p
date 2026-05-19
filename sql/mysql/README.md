# sql/mysql/ — legacy migration history (not the active provisioning flow)

This directory is **historical reference**. It pre-dates the migration to Prisma
and is not used to provision a fresh database.

The Procinix v2 schema lives in [prisma/schema.prisma](../../prisma/schema.prisma).
Provision a fresh database with:

```bash
npm run db:push    # apply schema.prisma to MySQL via Prisma
npm run db:seed    # seed demo tenant + masters + workflow definitions
```

See [docs/ARCHITECTURE.md §3](../../docs/ARCHITECTURE.md) for the full provisioning flow.

`init.sql` was removed (commit 2026-05-19) — it had drifted out of sync with the
Prisma schema (covered ~31 tables; the live schema has 74+ models). The
`migrations/` subdirectory is preserved as a reference for early v1 discovery
work, but those files are **not** applied by any current dev script.
