# Procinix v2 — CLAUDE.md

## Before EVERY session
1. Read this file + ARCHITECTURE.md
2. Run `npm run typecheck` — must stay at 0 errors
3. Run `npm run lint` — 0 warnings on new code
4. Update ARCHITECTURE.md after every structural change

## Stack (locked — do not deviate)
| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite + TypeScript strict |
| Styling | Tailwind CSS + shadcn/ui + Radix UI |
| Server state | TanStack Query v5 — no raw fetch() anywhere |
| Tables | TanStack Table v8 + TanStack Virtual |
| Routing | React Router v6 (all pages React.lazy) |
| Forms | React Hook Form + Zod (shared schemas) |
| Global state | Zustand |
| Fuzzy match | fuse.js |
| Dates | date-fns |
| HTTP server | Fastify |
| ORM | Prisma + Prisma Accelerate |
| Database | Azure MySQL Flexible |
| Cache | Redis (Azure Cache) |
| Auth | httpOnly + Secure + SameSite=Strict cookies + JWT |
| Secrets | Azure Key Vault (never .env in production) |
| Workflows | XState v5 → Temporal.io post-MVP |
| Mobile | PWA → Capacitor post-MVP |
| CI | GitHub Actions + Vitest + Playwright + Snyk |

## Absolute rules — never break these

### Frontend
- No raw `fetch()` anywhere — TanStack Query only
- No inline route handlers — all API calls through `src/lib/api/` modules
- No hardcoded dropdown data — all master data via `useMasterData()` hook
- Zod schemas live in `shared/schemas/` — same schema frontend + backend
- All forms use React Hook Form + zodResolver
- Mobile-first CSS — `sm:` for desktop, never `max-md:` for mobile

### Backend
- All endpoints validate tenant from JWT — never from request body
- All inputs validated with Zod before touching Prisma
- No raw SQL — Prisma only (exception: migration files)
- All mutations write to audit_log — append-only, never delete
- Rate limiting on all public endpoints

### Validation
- Deduplication server-side — client warns, server enforces
- 3-way match (Invoice ↔ PO ↔ GRN) enforced before invoice approval
- GSTIN uniqueness = hard DB constraint
- Invoice dedupe = unique index on (tenant_id, vendor_id, invoice_number)

### Performance
- Cursor pagination everywhere — never OFFSET
- Redis cache for master data — TTL 1h, invalidate on edit
- Skeleton loading on all listing pages
- Optimistic updates on approve/reject
- Every page is React.lazy()

## Dev commands
```bash
npm run dev          # frontend :3000 + backend :8787
npm run typecheck    # 0 errors required
npm run lint         # 0 warnings on new code
npm run test         # Vitest
npm run test:e2e     # Playwright
npm run db:push      # Prisma db push (dev only)
npm run db:seed      # seed demo data
npm run db:studio    # Prisma Studio
```

## Ports
- Frontend: 3000 | Backend: 8787 | Redis: 6379 | MySQL: 3306

## Demo login (dev only)
- Email: mithilesh@procinix.ai | Password: Demo@123
