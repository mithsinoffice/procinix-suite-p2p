# Procinix S2P — Claude Code Context (rolling memory)

## Project context (locked-in facts)
- **Name:** procinix-p2p-automation-erp — P2P/S2P ERP for Indian mid-market AP automation
- **Stack:** React 18 + Vite 6 + TS frontend, Node ESM raw `http.createServer`, Azure MySQL, Gemini OCR, Anthropic Claude agents, IMAP/SMTP, node-cron
- **Server entry:** `server/index.mjs` (4 092+ lines, all routes inline — **DO NOT add more inline routes**; new routes go into `server/routes/<domain>.mjs` once we start the split)
- **Frontend API client invariant:** paths passed to `mysqlApiRequest()` start with `/<route>` NOT `/api/<route>`. `VITE_API_BASE_URL` already ends with `/api`
- **Multi-tenant:** every AP endpoint requires `X-Tenant-Id` header. `tenantId` comes from `AuthContext` after login
- **Dev ports:** Vite on `:3000` (per `vite.config.ts`). API server on `:8787`. Any doc that says 5173 is wrong
- **`xlsx`** pinned to npm registry `^0.18.5` (CDN URL removed in Tier-0 B6 pass)
- **Tests:** `npm test` (vitest run, no watch). 17 test files, 359 tests
- **Auth:** session-token based. Login calls `POST /api/auth/login`, token stored in `sessionStorage['procinix.session.token']`. Reload rehydrates via `GET /api/auth/me`.

## Commands
```bash
npm run dev               # API server + Vite (concurrently, recommended)
npm run server:mysql      # API server only
npm run dev:web           # Vite only
npm test                  # vitest run (all unit tests)
npm run typecheck         # tsc --noEmit (frontend only)
npm run build             # Vite prod build → build/
npm run start             # Prod: serve API + static from build/
npm run migrate:tenant-schema  # Apply multi-tenancy migration
```

## Key Files
| File | Purpose |
|---|---|
| `server/index.mjs` | 4 092-line monolith — all API routes as inline if/else |
| `server/mysql.mjs` | MySQL connection pool + `query`, `withTransaction`, `connExecute` helpers |
| `server/masterStorage.mjs` | Registry of 30+ master table names → DB/table mapping |
| `server/services/agents/orchestrator.mjs` | Agent pipeline: intake → extraction → vendor → dup → match → tax → coding → routing + retry scheduler |
| `src/lib/mysql/client.ts` | `mysqlApiRequest(path)` — the frontend API client |
| `src/lib/mysql/documentStore.ts` | `ensureDomainDocument('domain', fallback)` — JSON blob store |
| `src/lib/paymentsApi.ts` | Payments dashboard + batch API helpers |
| `server/routes/auth.mjs` | Auth routes — `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` |
| `server/services/auth/loginService.mjs` | `authenticateUser`, `createSession`, `lookupSession`, `fetchContext`, `getUserById`, `revokeSession` |
| `src/contexts/AuthContext.tsx` | Session-token login, `/auth/me` rehydration, `useAuth()` hook |
| `src/contexts/APDataContext.tsx` | Invoice list fetched from `/api/invoices` |
| `src/App.tsx` | React Router route tree |
| `sql/mysql/init.sql` | Base schema (item_master + erp_master_* tables) |
| `sql/mysql/migrations/` | 14 date-prefixed migration SQL files |

## API Auth
All endpoints require `Authorization: Bearer <API_SECRET_KEY>`. If `API_SECRET_KEY` unset, auth is **disabled** (dev footgun — see B3). AP endpoints additionally require `X-Tenant-Id` header.

## Data Sources
| Source | What lives there |
|---|---|
| **Real MySQL** | invoices, vendors, master data, payment batches, auth, KPIs |
| **Domain doc** | PR, PO, GRN, Advances, Debit Notes, Budget (JSON blobs in `domain_documents`) |
| **Mock/hardcoded** | `EntityTransactionData.tsx`, `DemoVendorDataset.ts` (demo only) |

## Agent pipeline (orchestrator.mjs)
8 sequential steps: intake → extraction → vendorIdentity → duplicateFraud → match → taxCompliance → coding → workflowRouting.

Steps 3-8 each wrapped in try/catch (`makeStepRunner`): one failing step uses a safe fallback and continues — does **not** abort the pipeline. Failures are recorded to `invoice_exceptions` (type `AGENT_FAILURE`).

Retry mechanism: `agent_retry_queue` table (CREATE TABLE IF NOT EXISTS). On failure, `scheduleRetry()` upserts a row. `startAgentRetryScheduler()` (started at server boot) calls `processRetryQueue()` every 30 s. Max `MAX_AGENT_RETRIES = 3` attempts with backoff (30 s, 2 min, 10 min). On exhaustion: invoice → `processing_status='agent_failed'`, alert email to `ALERTS_EMAIL || MAIL_FROM`.

Manual retry: `POST /api/invoice-ingestion/agent-retry/:invoiceId` → calls `resetAndRequeueInvoice(invoiceId)`.

Structured metrics: each agent run emits `JSON.stringify({ event: 'agent_run', invoice_id, agent, duration_ms, status, attempt, ts })` to stdout.

## AP Endpoints (require `X-Tenant-Id`)
```
GET  /api/invoices                    full invoice list (lifecycle + payment progress)
GET  /api/ap/payments-dashboard       KPIs + invoice list
GET  /api/ap/payable-invoices         invoices ready for payment
GET  /api/ap/payment-batches          batch list
POST /api/ap/payment-batches          create batch
POST /api/ap/payment-batches/:id/submit|approve|reject|execute
POST /api/invoice-ingestion/agent-retry/:invoiceId    manual agent retry
```

## Module → Component Map
| Module/Page | Component |
|---|---|
| APInvoices.tsx | Invoices.tsx |
| APPayments.tsx | PaymentsDashboard.tsx |
| InvoicesModule.tsx | Invoices.tsx |
| PaymentsModule.tsx | PaymentsDashboard.tsx |
| VendorAdvancesModule.tsx | AdvancesHub.tsx |
| PurchaseOrderModule.tsx | PurchaseOrders.tsx |
| IntakePRModule.tsx | procurement/PRListing.tsx |

## Tests
```
src/utils/__tests__/                        4 tests (GST, TDS, journal entries, BOE)
server/services/invoices/__tests__/         7 tests (lifecycle, GST, TDS, vendor ledger)
server/services/agents/__tests__/           2 test files: matchAgent + orchestratorRetry (12 tests)
Total: 13 test files, 297 tests
```
No integration tests, no E2E tests, no component tests.

## DB State (single-tenant, May 2026)
- **Tenants:** `tenant-default-001` (all live data) + orphan `4755d4d4-…` (PTPL, no users)
- **Entities:** `entity-default-001` (under DEFAULT) + orphan `c7756192-…` (Opptra, under PTPL)
- **Users:** 5 active on `tenant-default-001`. Login: `mithilesh@procinix.ai` / `Demo@123`
- All 10 invoices on `tenant-default-001 / entity-default-001`

## Known issues — prioritized fix queue

### Tier 0 (do first)
- **B3:** refuse to boot in `NODE_ENV=production` without `API_SECRET_KEY`
- **B6:** pin `xlsx` to a versioned npm package (no CDN URL)
- **F2:** pin `react-router` and `react-router-dom` (currently `"*"`)
- **F6:** move stale `.md` files out of `src/` into `docs/`
- **W6:** reconcile port mismatch (Vite is 3000, not 5173)

### Tier 1 (auth overhaul, in this order)
- ~~**B2:** bcrypt-hash existing passwords in `user_master` (migration)~~ ✅ Done 2026-05-07
- ~~**B1:** build `POST /api/auth/login` server-side~~ ✅ Done 2026-05-07
- ~~**F1:** replace client-side password compare with `/api/auth/login` call~~ ✅ Done 2026-05-07

### Tier 2 (ingestion robustness)
- ~~**INV-5:** crash-safe agent pipeline (try/catch, retries, alerts)~~ ✅ Done 2026-05-07
- **INV-6:** validate API keys (`GOOGLE_AI_API_KEY`, `ANTHROPIC_API_KEY`) at startup with clear log
- **INV-1, INV-2:** fix TS errors + replace bare `fetch` in `InvoiceFormPO.tsx` and `NonPOInvoiceForm.tsx`

### Tier 3 (architecture)
- **B4:** split 4 092-line `server/index.mjs` by domain
- **B5:** real DB migration runner with `schema_migrations` table
- **F4:** fix 7 TS errors then enable `strict` + `noImplicitAny`
- **F3:** migrate remaining bare `fetch` calls (`EntityMaster.tsx`, `pages/Approvals.tsx`)

### Tier 4 (quality gates)
- **W2:** GitHub Actions CI (typecheck + test + build on PR)
- **W3:** ESLint + Prettier baseline
- **W4:** Husky + lint-staged pre-commit
- **W1:** integration tests for payment batches, approvals, invoice ingestion

## Working conventions (MUST follow)
1. Before starting any change, read `CLAUDE.md` and `DISCOVERY.md` first. Use them as ground truth.
2. After completing any change, append a one-line entry to the **Change log** section below (date + what + file paths).
3. After completing any change, update the "Known issues" queue: cross out completed items, add newly discovered issues.
4. **Never add new inline routes to `server/index.mjs`** — create `server/routes/<domain>.mjs`.
5. **Never use raw `fetch()` in frontend code** — always `mysqlApiRequest` from `src/lib/mysql/client.ts`.
6. Never store new secrets in code or commit `.env` files. Update `.env.example` when adding env vars.
7. Type errors are not allowed in any file you touch — fix them even if pre-existing.
8. Every new server feature needs at least one vitest test in the matching `__tests__` folder.
9. Multi-tenant: any new AP endpoint must require `X-Tenant-Id` and scope queries by `tenant_id`.

## Open decisions (need human answer)
- Password migration: **bcrypt** or argon2? Default to bcrypt unless told otherwise.
- Migration runner: build minimal in-house or adopt a library? Default to minimal in-house (single-file, MySQL-native).
- Should AR module (`src/components/ar/`) be removed or kept as stubs?
- Vite port: confirm 3000 is the locked choice.
- Super-admin scope: Procinix-only or customer admins too?

## Required env vars
```
MYSQL_HOST, MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD
API_SECRET_KEY              (empty = auth disabled — see B3)
VITE_API_BASE_URL           (= http://127.0.0.1:8787/api locally)
GOOGLE_AI_API_KEY           (Gemini OCR)
ANTHROPIC_API_KEY           (Claude agents)
AP_EMAIL_HOST/USER/PASSWORD (IMAP invoice polling)
SUPER_ADMIN_EMAILS          (super-admin console access)
ALERTS_EMAIL                (agent failure alert recipient — falls back to MAIL_FROM)
```

## Deployment
- **Railway:** `railway.json` — `npm install && npm run build` → `NODE_ENV=production node server/index.mjs`
- **Heroku-compatible:** `Procfile` — `web: NODE_ENV=production node server/index.mjs`
- **Health check:** `GET /health` → `{ ok: true, uptime: N }`

## macOS dev note
On first `npm install`, macOS Gatekeeper may block native binaries (rollup, esbuild). Fix:
```bash
xattr -dr com.apple.quarantine node_modules/
```

## Known remaining issues (pre-existing)
- 7 pre-existing TS errors: `InvoiceFormPO.tsx` (3), `NonPOInvoiceForm.tsx` (1), `VendorGroupMaster.tsx` (3)
- Bare `fetch('/api/...')` in `EntityMaster.tsx`, `InvoiceFormPO.tsx:222`, `pages/Approvals.tsx` — dev-only via Vite proxy, bypass `mysqlApiRequest`
- Orphan tenant/entity rows (PTPL/Opptra) — harmless until multi-tenant testing needed
- **CRITICAL:** Plaintext passwords in `user_master.payload.password`; compared client-side in `loginFromMasters`. Migrate before production.

## loginFromMasters guardrail (May 2026)
`AuthContext.tsx:606-613` requires `record.status === 'Active'` before matching. Prevents stale "Pending Approval" duplicates from blocking real login.

## How to verify payments dashboard
```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "X-Tenant-Id: tenant-default-001" \
  "http://127.0.0.1:8787/api/ap/payments-dashboard?tenantId=tenant-default-001"
# Expected: 200
```
After login, DevTools console: `[AuthContext] post-merge user: { tenantId: 'tenant-default-001', ... }`

## Change log
- 2026-05-07 — added DISCOVERY.md (full codebase discovery, 15 sections)
- 2026-05-07 — updated CLAUDE.md to rolling memory format with issue queue + conventions
- 2026-05-07 — INV-5: crash-safe agent pipeline with per-step try/catch, bounded retry, SMTP alert, manual retry endpoint, structured metrics. Files: `server/services/agents/orchestrator.mjs`, `server/services/agents/__tests__/orchestratorRetry.test.mjs`, `sql/mysql/migrations/20260507_agent_retry_queue.sql`, `server/index.mjs` (import + route + startup), `.env.example` (ALERTS_EMAIL)
- 2026-05-07 — macOS quarantine fix: `xattr -dr com.apple.quarantine node_modules/` clears Gatekeeper blocks on native .node binaries after npm install
- 2026-05-07 — INV-5 done: agent pipeline crash-safe, retry queue, alerts, manual retry endpoint. Tests: 297 passing.
- 2026-05-07 — INV-6 done: startup env validation; prod refuses to boot on missing API keys. Tests: 314 passing.
- 2026-05-07 — Tier-0 quick wins: B6 (xlsx pinned to npm ^0.18.5), F2 (react-router/dom pinned to 7.13.0, clsx + tailwind-merge unpinned from *), F6 (54 stale src/*.md files → docs/legacy/), W6 (port 5173 ref removed from CORS comment → 3000), B3 (prod API_SECRET_KEY guard added to validateEnv + 4 new tests). Tests: 318 passing.
- 2026-05-07 — B2+B1 done: 5 users migrated to bcrypt; POST /api/auth/login + sessions table live; first route module at server/routes/auth.mjs (B4 starts organically). Old client-side login still works in parallel until F1.
- 2026-05-07 — F1 done: client-side password compare removed; AuthContext uses POST /api/auth/login + session token in sessionStorage; GET /api/auth/me for rehydration; POST /api/auth/logout revokes session; fetchContext/getUserById/revokeSession added to loginService; isAuthenticated always attempts session lookup even when API_SECRET_KEY unset. Files: server/services/auth/loginService.mjs, server/routes/auth.mjs, server/__tests__/loginRoute.test.mjs, server/services/auth/__tests__/loginService.test.mjs, src/lib/mysql/client.ts, src/contexts/AuthContext.tsx, server/index.mjs. Tests: 359 passing.
