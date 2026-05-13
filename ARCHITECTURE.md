# Procinix v2 — Architecture
_Last updated: scaffold_

## Overview
Multi-tenant cloud-native P2P ERP. React 18 frontend + Fastify backend + Azure MySQL + Redis.
VAPT-ready, SOC II aligned, mobile-first (PWA → Capacitor post-MVP).

## MVP modules
Invoices · Payments · Masters/Config · Dashboard & KPIs

## Directory structure
src/                        # React frontend
lib/
api/                    # TanStack Query hooks per domain
utils/
validators.ts         # GSTIN, PAN, IFSC, mobile, date, amount
formatters.ts         # INR, Indian number system, DD/MM/YYYY
dedupe.ts             # fuse.js vendor + invoice deduplication
query-client.ts         # TanStack Query singleton + query keys
http.ts                 # Authenticated fetch wrapper (api/ only)
components/
ui/                     # shadcn/ui components (copy-paste)
shared/                 # App-level shared components
layout/                 # AppShell, Sidebar, Topbar
pages/                    # Route-level components (all React.lazy)
hooks/                    # Custom React hooks
stores/                   # Zustand stores
router.tsx                # React Router v6
server/src/
plugins/                  # Fastify plugins (registered in order)
env.ts                  # Startup env validation — crashes if invalid
auth.ts                 # JWT httpOnly cookie auth
tenant.ts               # Tenant context from JWT
cors.ts / helmet.ts     # Security headers
rate-limit.ts           # Per-tenant + per-IP rate limiting
error-handler.ts        # Global error handler, never leaks stack traces
routes/                   # Route files per domain
services/                 # Business logic (no HTTP concerns)
lib/
prisma.ts               # Singleton + startup DB ping
redis.ts                # Singleton + startup ping + cache helpers
result.ts               # Result<T,E> type — no thrown exceptions
audit.ts                # Append-only audit log writer
shared/schemas/             # Zod schemas shared by frontend + backend
prisma/schema.prisma        # Single source of truth for DB schema

## Plugin registration order (server.ts)
1. env       — validate all env vars, crash if invalid
2. redis     — connect + ping
3. prisma    — connect + ping
4. cors      — CORS headers
5. helmet    — security headers
6. rateLimit — needs Redis
7. auth      — JWT + cookies
8. tenant    — needs auth
9. errorHandler — catches everything

## Auth flow
POST /auth/login → sets access_token (httpOnly, 15m) + refresh_token (httpOnly, 7d)
Every request → auth plugin reads cookie → verifies JWT → request.user
POST /auth/refresh → rotates both tokens
POST /auth/logout → clears both cookies

## Multi-tenancy
Every table has tenant_id. Prisma middleware auto-injects it.
tenant.ts extracts from JWT — never from request body.

## Validation layers
1. Field-level: Zod on React Hook Form (client UX)
2. Schema-level: Same Zod schema on Fastify route (server security)
3. Business rules: service layer (budget, 3-way match, TDS)
4. DB constraints: unique indexes (GSTIN, invoice_number per vendor)

## Deduplication
- Vendor: fuse.js fuzzy name match + GSTIN unique DB index (hard block)
- Invoice: unique(tenant_id, vendor_id, invoice_number) + near-duplicate service
- Bank: same IFSC+account across vendors = fraud alert

## Caching (Redis)
| Key | TTL | Content |
|---|---|---|
| tenant:{id}:masters | 1h | All dropdown master data |
| tenant:{id}:dashboard | 5min | KPI aggregates |
| session:{token} | 15min | User + permissions |
| search:{tenant}:{term} | 10min | Vendor/item search results |
| idem:{key} | 24h | Idempotency keys |

## Performance targets
- List (cached): <100ms | List (cold): <500ms
- Form submit: <300ms | Search: <200ms | Initial JS: <150kb

## Mobile
Phase 1: Responsive + PWA (ships with v2)
Phase 2: Capacitor → iOS + Android (camera, biometrics, push)
Mobile UI = approval-first: approve/reject in ≤ 3 taps

## Key DB indexes (required on every new table)
```sql
CREATE INDEX idx_{table}_tenant_status ON {table}(tenant_id, status, created_at DESC);
CREATE UNIQUE INDEX idx_invoice_dedupe  ON invoices(tenant_id, vendor_id, invoice_number);
CREATE UNIQUE INDEX idx_vendor_gstin    ON vendors(tenant_id, gstin);
```
