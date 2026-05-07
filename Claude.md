# Procinix S2P — Claude Code Context

## Stack
- **Frontend:** React 18 + TypeScript + Vite 6 (SWC), port 3000 in dev
- **Backend:** Node.js ESM `http.createServer` (no Express), `server/index.mjs`, port 8787
- **DB:** Azure MySQL 8 via `mysql2/promise`; credentials in `.env.mysql.local`
- **AI:** Google Gemini (OCR), Anthropic Claude (agent reasoning)
- **Email:** `imapflow` IMAP polling + `nodemailer` SMTP

## Commands
```bash
npm run dev               # API server + Vite (concurrently, recommended)
npm run server:mysql      # API server only
npm run dev:web           # Vite only
npm test                  # vitest run (unit tests only)
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
| `src/lib/mysql/client.ts` | `mysqlApiRequest(path)` — the frontend API client |
| `src/lib/mysql/documentStore.ts` | `ensureDomainDocument('domain', fallback)` — JSON blob store |
| `src/lib/paymentsApi.ts` | Payments dashboard + batch API helpers |
| `src/contexts/AuthContext.tsx` | Login, tenantId, `useAuth()` hook |
| `src/contexts/APDataContext.tsx` | Invoice list fetched from `/api/invoices` |
| `src/App.tsx` | React Router route tree |
| `sql/mysql/init.sql` | Base schema (item_master + erp_master_* tables) |
| `sql/mysql/migrations/` | 13 date-prefixed migration SQL files |

## URL Construction Rule — CRITICAL
`VITE_API_BASE_URL` already ends with `/api` (e.g. `http://127.0.0.1:8787/api`).
**Every path passed to `mysqlApiRequest(path)` must start with `/<route>` — NEVER `/api/<route>`.**
`/api/<route>` → resolves to `…/api/api/<route>` → HTTP 404.

Vite dev proxy: `/api/*` → `http://localhost:8787` (path preserved). Bare `fetch('/api/foo')` calls work in dev but bypass `mysqlApiRequest` (no auth headers).

## API Auth
All endpoints require `Authorization: Bearer <API_SECRET_KEY>`.
If `API_SECRET_KEY` is unset, auth is **disabled** (dev convenience, footgun in prod).
AP endpoints additionally require `X-Tenant-Id` header.

## Data Sources
| Source | What lives there |
|---|---|
| **Real MySQL** | invoices, vendors, master data, payment batches, auth, KPIs |
| **Domain doc** | PR, PO, GRN, Advances, Debit Notes, Budget (JSON blobs in `domain_documents`) |
| **Mock/hardcoded** | `EntityTransactionData.tsx`, `DemoVendorDataset.ts` (demo only) |

## Server Route Pattern
```javascript
// No framework — inline pathname matching
if (req.method === 'GET' && pathname === '/api/invoices') { ... }
if (pathname.match(/^\/api\/invoices\/([^/]+)$/)) { ... }
```

## AP Endpoints (require `X-Tenant-Id`)
```
GET  /api/invoices                    full invoice list (lifecycle + payment progress)
GET  /api/ap/payments-dashboard       KPIs + invoice list
GET  /api/ap/payable-invoices         invoices ready for payment
GET  /api/ap/payment-batches          batch list
POST /api/ap/payment-batches          create batch
POST /api/ap/payment-batches/:id/submit|approve|reject|execute
```

## Master Data Pattern
```
GET  /api/masters/:masterKey          fetch all records
PUT  /api/masters/:masterKey          bulk replace
```
30+ masters defined in `server/masterStorage.mjs`. Each master has its own MySQL database (e.g. `user_master.user_master`).

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
src/utils/__tests__/          4 unit tests (GST, TDS, journal entries, BOE)
server/services/invoices/__tests__/  7 unit tests (lifecycle, GST, TDS, vendor ledger)
server/services/agents/__tests__/   1 unit test (matchAgent — DB mocked)
```
No integration tests, no E2E tests, no component tests.

## Missing Endpoints (not yet built)
- GET/POST `/api/purchase-orders` (PO data currently in domain_documents)
- GET/POST `/api/purchase-requisitions`
- GET/POST `/api/grns`

## DB State (single-tenant, May 2026)
- **Tenants:** `tenant-default-001` (all live data) + orphan `4755d4d4-…` (PTPL, no users)
- **Entities:** `entity-default-001` (under DEFAULT) + orphan `c7756192-…` (Opptra, under PTPL)
- **Users:** 5 active on `tenant-default-001`. Login: `mithilesh@procinix.ai` / `Demo@123`
- All 10 invoices on `tenant-default-001 / entity-default-001`

## Known Security Issues
- **Plaintext passwords** stored in `user_master.payload.password`; compared client-side in `loginFromMasters`. Must hash before production.
- `loginFromMasters` (AuthContext.tsx:599) downloads all user records to the browser for comparison.

## Known Remaining Issues
- 7 pre-existing TS errors: `InvoiceFormPO.tsx` (3), `NonPOInvoiceForm.tsx` (1), `VendorGroupMaster.tsx` (3)
- Bare `fetch('/api/...')` in `EntityMaster.tsx`, `InvoiceFormPO.tsx:222`, `pages/Approvals.tsx` — dev-only via Vite proxy, bypass `mysqlApiRequest`
- Orphan tenant/entity rows (PTPL/Opptra) — harmless until multi-tenant testing needed

## loginFromMasters Guardrail (May 2026)
`AuthContext.tsx:606-613` requires `record.status === 'Active'` before matching. Prevents stale "Pending Approval" duplicates from blocking real login.

## How to Verify Payments Dashboard
```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "X-Tenant-Id: tenant-default-001" \
  "http://127.0.0.1:8787/api/ap/payments-dashboard?tenantId=tenant-default-001"
# Expected: 200
```
After login, DevTools console: `[AuthContext] post-merge user: { tenantId: 'tenant-default-001', ... }`

## Required Env Vars
```
MYSQL_HOST, MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD
API_SECRET_KEY              (empty = auth disabled)
VITE_API_BASE_URL           (= http://127.0.0.1:8787/api locally)
GOOGLE_AI_API_KEY           (Gemini OCR)
ANTHROPIC_API_KEY           (Claude agents)
AP_EMAIL_HOST/USER/PASSWORD (IMAP invoice polling)
SUPER_ADMIN_EMAILS          (super-admin console access)
```

## Deployment
- **Railway:** `railway.json` — `npm install && npm run build` → `NODE_ENV=production node server/index.mjs`
- **Heroku-compatible:** `Procfile` — `web: NODE_ENV=production node server/index.mjs`
- **Health check:** `GET /health` → `{ ok: true, uptime: N }`
