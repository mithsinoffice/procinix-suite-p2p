# Procinix S2P — Architecture

**Status:** Living document. Last updated 2026-05-11.
Companion to `CLAUDE.md` (rolling memory). This file is the structural map;
`CLAUDE.md` is the change log + open-decisions queue.

---

## 1. Stack

| Layer      | Choice                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| Frontend   | React 18 + Vite 6 + TypeScript (strict-pending), TailwindCSS, Radix primitives, Recharts                  |
| API server | Node ESM, raw `http.createServer` (no Express/Hono on hot path)                                           |
| Database   | Azure MySQL (mysql2 connection pool)                                                                      |
| OCR        | Gemini (Google AI) primary, n8n webhook secondary, Anthropic Claude fallback                              |
| Agents     | Anthropic Claude — orchestrator pipeline of 8 specialized agents (intake → routing)                       |
| Mail       | IMAP polling (`imapflow`) + SMTP (`nodemailer`)                                                           |
| Schedulers | `node-cron` for periodic jobs; bespoke retry-queue scheduler for agent failures                           |
| Auth       | bcrypt-hashed passwords, session-token cookies (sessionStorage), `Bearer` API key in Authorization header |
| CI         | GitHub Actions: lint → format:check → typecheck → test → build (linux/x64 runner)                         |

**Dev ports:** Vite `:3000`, API `:8787`. Don't trust any doc that says 5173.

---

## 2. Repository layout

```
procinix-s2p/
├── server/                       # Node ESM API
│   ├── index.mjs                 # 4 092-line monolith (B4 in queue)
│   ├── mysql.mjs                 # query/withTransaction/connExecute helpers
│   ├── masterStorage.mjs         # registry of 30+ master tables → DB/table mapping
│   ├── routes/                   # Domain route files — DO NOT add to index.mjs
│   │   ├── auth.mjs              # /api/auth/login, /me, /logout
│   │   ├── invoices.mjs          # workbench submit/approve/reject
│   │   ├── payments.mjs          # queue, dashboard, forecast, banking, settings
│   │   ├── advances.mjs          # vendor advances lifecycle
│   │   └── procurement.mjs       # PR / PO / GRN / SRN (this PR)
│   ├── services/
│   │   ├── agents/               # 8-step pipeline + orchestrator + retry queue
│   │   │   ├── orchestrator.mjs  # processInvoiceWithAgents + reprocessAgentPipeline
│   │   │   ├── intakeAgent.mjs
│   │   │   ├── extractionAgent.mjs
│   │   │   ├── vendorIdentityAgent.mjs
│   │   │   ├── duplicateFraudAgent.mjs
│   │   │   ├── matchAgent.mjs    # exact + fuzzy PO + recurring + 3-way (procurement)
│   │   │   ├── taxComplianceAgent.mjs
│   │   │   ├── codingAgent.mjs
│   │   │   └── workflowRoutingAgent.mjs
│   │   ├── auth/                 # loginService (authenticateUser/createSession/...)
│   │   ├── invoices/             # lifecycleMapping, lifecycleTransitions, ledger
│   │   ├── invoiceIngestion/     # touchlessEngine, n8nOCR, invoiceCreator
│   │   ├── payments/             # paymentSettings, paymentBatches, paymentsDashboard,
│   │   │                         # payoutFileGenerator, utrIngestParser, jvCreator
│   │   ├── kyc/                  # PAN/GSTIN/BankAccount/MSME verification
│   │   ├── settings/, po/, startup/, tenant/, approvals/
│   │   └── ...
│   └── scripts/                  # one-off migrations (bcrypt rehash, tenant schema)
├── src/                          # React frontend
│   ├── App.tsx                   # React Router v7 route tree
│   ├── contexts/                 # AuthContext, APDataContext, ProcurementDataContext, ...
│   ├── components/
│   │   ├── payments/             # PaymentQueue/Banking/Forecast/Settings/VendorAdvances/Layout
│   │   ├── procurement/          # PR forms (Regular/Catalogue/Service/Kit/Asset/Blanket),
│   │   │                         # PRListing, PRtoPOConversion(Enhanced), AuditTrailDrawer
│   │   ├── PurchaseOrders.tsx    # PO listing (legacy APData-backed; relational drawer wired)
│   │   ├── GoodsReceipt.tsx
│   │   ├── PaymentsDashboard.tsx, Invoices.tsx, ...
│   │   └── ui/                   # primitives (premium-register, form-primitives, ...)
│   ├── lib/
│   │   ├── mysql/client.ts       # mysqlApiRequest — frontend API client
│   │   ├── mysql/documentStore.ts # ensureDomainDocument JSON blob store
│   │   ├── paymentsApi.ts, formatCurrency.ts, msmeDueDate.ts
│   ├── pages/                    # Approvals.tsx, InvoiceDetail.tsx, ...
│   ├── types/                    # payments.ts, procurement.ts, vendorGovernance.ts, ...
│   └── utils/
├── sql/mysql/
│   ├── init.sql                  # base schema (item_master + erp_master_*)
│   └── migrations/               # 22 date-prefixed SQL files (see §6)
├── docs/                         # this file + multi-tenancy spec + ws1a docs + legacy/
└── .github/workflows/ci.yml      # CI pipeline
```

---

## 3. Backend: API server (`server/index.mjs`)

The 4 092-line monolith is the single Node entry point. Inside, request handling
proceeds in this order:

1. CORS / OPTIONS preflight
2. **Public-path allowlist** (login, health, password-reset)
3. Auth gate — `Authorization: Bearer <API_SECRET_KEY>` (B3: refuses to boot in
   `NODE_ENV=production` without `API_SECRET_KEY`)
4. Domain route delegation (in order — first to return `true` wins):
   ```js
   handleAuthRoute; // server/routes/auth.mjs
   handleInvoiceRoute; // server/routes/invoices.mjs
   handlePaymentsRoute; // server/routes/payments.mjs
   handleAdvancesRoute; // server/routes/advances.mjs
   handleProcurementRoute; // server/routes/procurement.mjs   ← latest
   ```
5. Inline `if/else` branches for everything else (invoices, vendors, masters,
   approvals, KYC, banking, dashboards, …) — **B4 backlog: continue extracting
   to `server/routes/<domain>.mjs`**.

### Convention: never add new inline routes to `server/index.mjs`

New endpoints go into a new or existing `server/routes/<domain>.mjs` file
exposing a single `handleXxxRoute(req, res, pathname, sendJson)` function that
returns `true` when handled. Pattern is shared by all 5 route files.

### Multi-tenancy

Every AP / procurement endpoint requires `X-Tenant-Id` header (read by
`readTenant(req, url)` helper, also accepts `?tenantId=` query). Queries are
scoped by `tenant_id` column. No cross-tenant fallback.

---

## 4. Frontend: contexts and routing

### React Router (v7.13.0)

The route tree lives in `src/App.tsx`. Routes are lazy-imported by component.
Key clusters:

```
/auth/login                       → LoginScreen
/dashboard                        → DashboardsHub
/invoices                         → Invoices
/invoices/:id                     → InvoiceDetail (lazy)
/invoices/edit/:id                → InvoiceEditLoader → InvoiceFormPO | NonPOInvoiceForm
/invoices/create-po               → InvoiceFormPO (create)
/invoices/create-direct           → InvoiceFormDirectV2 (non-PO create)
/ap/payments/queue                → PaymentQueue (under PaymentsLayout)
/ap/payments/forecast             → PaymentForecast
/ap/payments/banking              → PaymentBanking
/ap/payments/settings             → PaymentSettings
/ap/vendor-advances               → VendorAdvances
/procurement/pr/listing           → PRListing
/procurement/pr/create            → PRTypeSelection
/procurement/pr/create/regular    → RegularPRForm
/procurement/pr/detail/:id        → PRDetailView
/purchase-orders                  → PurchaseOrders
/purchase-orders/create-from-prs  → PRtoPOConversionEnhanced
/goods-receipts                   → GoodsReceipt
/masters/*                        → master CRUD UIs
```

### Contexts

| Context                                                | Owns                                                           | Storage                                                               |
| ------------------------------------------------------ | -------------------------------------------------------------- | --------------------------------------------------------------------- |
| AuthContext                                            | session-token, current user, tenant, entity                    | `sessionStorage['procinix.session.token' \| 'procinix.session.user']` |
| APDataContext                                          | invoices, vendors (live + mock), purchase orders (legacy)      | API + mock blends                                                     |
| MasterDataContext                                      | 30+ master tables (entities, departments, items, etc.)         | API + localStorage cache                                              |
| ProcurementDataContext                                 | **PR / PO / GRN / SRN** (this PR — relational + blob fallback) | `mysqlApiRequest('/procurement/...')` + `domain_documents` fallback   |
| BudgetDataContext                                      | budgets, GL accounts, cost centres                             | mock data + localStorage                                              |
| RBACContext, FinanceRBACContext, PermissionRBACContext | role/permission gates                                          | hardcoded role matrices                                               |
| PortalUsersContext                                     | vendor-portal user management                                  | API                                                                   |

### Frontend API client invariant

Paths passed to `mysqlApiRequest()` start with `/<route>` **NOT**
`/api/<route>`. `VITE_API_BASE_URL` already ends with `/api`.

```ts
// ✅ correct
await mysqlApiRequest('/procurement/prs', { headers: tenantHeaders() });

// ❌ wrong — double /api prefix
await mysqlApiRequest('/api/procurement/prs', ...);
```

---

## 5. Agent pipeline (`server/services/agents/orchestrator.mjs`)

Email → invoice processing flows through 8 sequential agents:

```
1. intakeAgent           ─ parse email, dedupe by content hash, create document
2. extractionAgent       ─ Gemini OCR + line-item extraction
3. vendorIdentityAgent   ─ match against vendor_master / governance
4. duplicateFraudAgent   ─ duplicate invoice check + fraud signals
5. matchAgent            ─ exact PO → fuzzy PO → recurring pattern;
                            now runs procurement 3-way match (this PR)
6. taxComplianceAgent    ─ GST arithmetic + GST type validation
7. codingAgent           ─ GL/cost-centre coding suggestions
8. workflowRoutingAgent  ─ touchless / 1-touch / manual lane decision
```

**Crash-safe (INV-5):** Steps 3–8 each wrapped in `makeStepRunner` (try/catch
with safe-fallback). Failures persist to `invoice_exceptions` (type
`AGENT_FAILURE`), schedule retries via `agent_retry_queue` (30 s / 2 min / 10 min
backoff, max 3 attempts), then mark `processing_status='agent_failed'` + alert
email.

**Structured metrics:** every agent run emits
`JSON.stringify({ event: 'agent_run', invoice_id, agent, duration_ms, status, attempt, ts })`
to stdout.

**3-way match wiring:** `matchAgent.mjs::DEFAULT_FETCHERS.getThreeWayMatch`
looks up the procurement `purchase_orders_proc` row by `po_ref` matching the
legacy PO's `po_number`, then calls `evaluatePOMatch(poId, tenantId)`. Returns
null gracefully when no procurement counterpart exists.

---

## 6. Database schema

**22 migrations** under `sql/mysql/migrations/`, run in date order. Idempotent.
There's no schema-migrations runner yet (B5 in queue) — they're applied manually
via the Azure MySQL workbench.

### Domain table groups

| Domain                    | Key tables                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tenancy                   | `tenants`, `entities`, `tenant_registry`, `user_entity_access`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Auth                      | `user_master.user_master`, `sessions`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Master data               | `erp_master_entities/vendors/departments/.../categories`, `master_records`, `vendor_master.vendor_master`, `roles_master.roles_master`, `entity_master.entity_master`, **`vendor_group_master.vendor_group_master` (5 demo groups, vendors.vendor_group_id/name FK columns)**, `location_master.location_master` (5 seeded), `gl_code_master.gl_code_master` (12 seeded), **`profit_centre_master.profit_centre_master` (8 PTPL seeds)**, **`kit_bundle_master.kit_bundle_master` + `kit_bundle_items` child (3 seed bundles)**, **`employee_master.employee_master` (15 PTPL seeds, self-ref FK on `reporting_manager_id`)** |
| Invoices                  | `invoices`, `invoice_line_items`, `invoice_exceptions`, `invoice_audit_log`, `invoice_ingestion_log`, `invoice_risk_flags` (12-rule evaluator)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Agents                    | `ap_invoice_documents`, `ap_invoice_match_results`, `ap_invoice_agent_decisions`, `ap_invoice_explainability_logs`, `agent_retry_queue`, `ocr_field_corrections`, `ocr_learning_patterns`                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Payments                  | `payment_batches` (PaymentProposal flow), `bank_payment_batches` + `bank_payment_batch_items` (Banking tab), `bank_accounts`, `payment_settings`                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Vendor advances           | `vendor_advances`, `advance_ref_sequence`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Procurement** (this PR) | `doc_ref_sequences`, `purchase_requests` + `purchase_request_items`, `purchase_orders_proc` + `purchase_order_items`, `po_pr_links`, `goods_receipt_notes` + `grn_items`, `service_receipt_notes` + `srn_items`, `procurement_audit_log`                                                                                                                                                                                                                                                                                                                                                                                      |
| Legacy                    | `purchase_orders` (old PO table, still referenced by `matchAgent` for invoice → PO matching; the procurement subsystem uses the suffixed `purchase_orders_proc` to avoid collision)                                                                                                                                                                                                                                                                                                                                                                                                                                           |

### Procurement subsystem — table relationships

```
doc_ref_sequences  (UNIQUE (tenant_id, entity_code, doc_type, year))
                  │ feeds collision-safe ref generation (PR-PTPL-2026-0001)
                  ▼
purchase_requests  ──┬─ purchase_request_items  (FK pr_id)
       ▲             │
       │             │
       │ (po_pr_links: many-to-many)
       │             │
       ▼             ▼
purchase_orders_proc ──┬─ purchase_order_items  (FK po_id, optional pr_item_id)
                       │     ├─ qty_received  (rolled up from grn_items)
                       │     └─ amount_consumed (rolled up from srn_items)
                       │     └─ match_status (set by evaluatePOMatch)
                       ▼
                goods_receipt_notes  ── grn_items  (FK po_item_id)
                service_receipt_notes ── srn_items (FK po_item_id)

procurement_audit_log  (INDEX (doc_type, doc_id))
                  ▲
                  │ every state change writes one row
```

### Procurement endpoints (route file: `server/routes/procurement.mjs`)

```
PRs:   GET  /api/procurement/prs                  ?status= &search=
       GET  /api/procurement/prs/summary
       POST /api/procurement/prs                  create
       GET  /api/procurement/prs/:id
       PUT  /api/procurement/prs/:id              draft only
       POST /api/procurement/prs/:id/submit       draft → pending_approval
       POST /api/procurement/prs/:id/approve      approver gate (isPaymentApprover)
       POST /api/procurement/prs/:id/reject
       POST /api/procurement/prs/:id/cancel
       GET  /api/procurement/prs/:id/audit

POs:   GET  /api/procurement/pos
       POST /api/procurement/pos                  create from prIds[]
       GET  /api/procurement/pos/:id
       PUT  /api/procurement/pos/:id              draft only
       POST /api/procurement/pos/:id/issue
       POST /api/procurement/pos/:id/close
       POST /api/procurement/pos/:id/cancel
       GET  /api/procurement/pos/:id/audit
       GET  /api/procurement/pos/:id/match-status  3-way line-level

GRNs:  GET  /api/procurement/grns
       POST /api/procurement/grns                 over-receipt guarded
       GET  /api/procurement/grns/:id
       POST /api/procurement/grns/:id/confirm     rolls up qty_received
       GET  /api/procurement/grns/:id/audit

SRNs:  GET  /api/procurement/srns
       POST /api/procurement/srns                 over-consumption guarded
       GET  /api/procurement/srns/:id
       POST /api/procurement/srns/:id/confirm
       GET  /api/procurement/srns/:id/audit
```

### Procurement domain rules

- **Doc ref:** `${docType}-${entityCode}-${YEAR}-NNNN` (e.g. `PR-PTPL-2026-0001`).
  Generated atomically inside a `withTransaction` block via `INSERT … ON
DUPLICATE KEY UPDATE` then `SELECT … FOR UPDATE` then `UPDATE`. Two concurrent
  writers can't grab the same number.
- **GST auto-calc:** `vendorState` = first 2 digits of `vendor_gstin`,
  `entityState` = first 2 digits of `bill_to_gstin`. Same → `CGST_SGST`,
  different → `IGST`, `gstRate=0` → `exempt`. Per line.
- **PO creation guards:** all input PRs same tenant + status='approved' + same
  vendor_id (across all line items). Mixed-vendor → 400 `mixed_vendors`.
- **GRN over-receipt guard:** `SUM(qty_received for po_item) + new ≤
po_item.quantity`. Else 400 `over_receipt`.
- **SRN over-consumption guard:** `SUM(amount_consumed for po_item) + new ≤
po_item.line_amount`. Else 400 `over_consumption`.
- **Confirm rollup:** confirming a GRN/SRN updates
  `purchase_order_items.qty_received` / `amount_consumed`, then promotes the
  parent PO to `partially_received` (any line received) or `fully_received` (all
  lines satisfied).
- **3-way match** (`evaluatePOMatch(poId, tenantId)` — exported for agent use):
  - material lines: matched if `SUM(grn_items.qty_accepted) ≥ poLine.quantity`
  - service lines: matched if `SUM(srn_items.amount_consumed) ≥ poLine.line_amount`
  - header matched only if every line matched
  - updates per-line `match_status` (pending / matched / partial / exception)
  - returns `null` when poId is null/empty (skip 3-way for non-PO invoices)
- **Audit log:** every state change (created / updated / submitted / approved /
  rejected / cancelled / issued / closed / confirmed) writes one row to
  `procurement_audit_log`.

---

## 7. Auth flow

```
1. POST /api/auth/login (public path)
     body: { email, password }
     → bcrypt.compare against user_master.password_hash
     → INSERT into sessions
     → returns { token, user, tenant, defaultEntity, accessibleEntities }
2. Client stores token in sessionStorage['procinix.session.token']
3. Subsequent calls include `Authorization: Bearer <token>` (also accepts
   API_SECRET_KEY for service-to-service)
4. GET /api/auth/me — rehydrate on page reload
5. POST /api/auth/logout — revoke session
```

`API_SECRET_KEY` empty in dev = auth disabled (B3 footgun, but
prod-startup refuses).

---

## 8. Tooling

| Concern     | What                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| Lint        | ESLint 9 flat config (`eslint.config.mjs`); F4 deferrals — see CLAUDE.md                               |
| Format      | Prettier 3 + `.prettierignore` (excludes `.claude/`, `docs/legacy/`, `sql/`)                           |
| Pre-commit  | Husky + lint-staged on `*.{ts,tsx,mjs,js,json,md,yml,css}`                                             |
| Test runner | Vitest 4 (`npm test` = `vitest run`, no watch)                                                         |
| TypeScript  | Strict-pending — F4 unblocks `strict` + `noImplicitAny` after the last 7 pre-existing errors are fixed |
| CI          | GitHub Actions: install (`npm ci --legacy-peer-deps --ignore-scripts`) → lint → format:check →         |
|             | typecheck (continue-on-error until F4) → test → build                                                  |
| Build       | Vite production bundle to `build/` — chunked by lazy import boundary                                   |

---

## 9. Test inventory (21 files, **431 tests**)

| File / Folder                                                         | Tests  | What it covers                                      |
| --------------------------------------------------------------------- | ------ | --------------------------------------------------- |
| `src/utils/__tests__/`                                                | 4      | GST, TDS, journal entries, BOE                      |
| `server/services/invoices/__tests__/`                                 | 7      | Lifecycle, GST, TDS, vendor ledger                  |
| `server/services/agents/__tests__/matchAgent.test.mjs`                | 28     | Match agent — fetchers, persistence, 3-way wiring   |
| `server/services/agents/__tests__/orchestratorRetry.test.mjs`         | 12     | Retry queue + alert path                            |
| `server/services/auth/__tests__/loginService.test.mjs`                | 21     | authenticateUser / createSession / lookupSession    |
| `server/__tests__/loginRoute.test.mjs`                                | 24     | POST /api/auth/login + /me + /logout                |
| `server/services/invoiceIngestion/__tests__/touchlessEngine.test.mjs` | 11     | 10-rule touchless routing                           |
| `server/routes/__tests__/payments.test.mjs`                           | ~40+   | Risk flags, forecast, banking, settings, queue      |
| `server/routes/__tests__/advances.test.mjs`                           | 11     | Vendor advances lifecycle + risk flags              |
| **`server/routes/__tests__/procurement.test.mjs`** (this PR)          | **16** | PR/PO/GRN/SRN flows + GST + 3-way match + audit log |
| ... and ~10 other suites                                              | rest   | KYC, settings, paymentBatches, etc.                 |

No integration tests, no E2E, no component tests yet. **W1 in queue.**

---

## 10. Known issues — see CLAUDE.md "Known issues" queue

The deferral queue is the source of truth. Highlights:

- **B4** — split `server/index.mjs` by domain (in-progress; 5 routes extracted so far)
- **B5** — real DB migration runner with `schema_migrations` table
- **F3** — migrate remaining bare `fetch()` calls in `EntityMaster.tsx`,
  `InvoiceFormPO.tsx`, `pages/Approvals.tsx`
- **F4** — fix 7 TS errors then enable `strict` + `noImplicitAny`
- **W1** — integration tests for payment batches, approvals, invoice ingestion
- **Asset register wiring** for CAPEX PRs (deferred to next sprint)

---

## 11. Deployment

- **Railway:** `railway.json` — `npm install && npm run build` →
  `NODE_ENV=production node server/index.mjs`
- **Heroku-compatible:** `Procfile` — same command
- **Health check:** `GET /health` → `{ ok: true, uptime: N }`
- Required env: `MYSQL_*`, `API_SECRET_KEY`, `VITE_API_BASE_URL`,
  `GOOGLE_AI_API_KEY`, `ANTHROPIC_API_KEY`, `AP_EMAIL_*`, `SUPER_ADMIN_EMAILS`,
  `ALERTS_EMAIL`. Server refuses to boot in production without
  `API_SECRET_KEY` or AI keys (INV-6).

---

## 12. Conventions cheat-sheet

1. Read `CLAUDE.md` and this file first.
2. Append a one-line change-log entry to `CLAUDE.md` after every change.
3. **Never** add inline routes to `server/index.mjs` — extract to
   `server/routes/<domain>.mjs`.
4. **Never** use raw `fetch()` in frontend — always `mysqlApiRequest`.
5. Type errors not allowed in any touched file (fix even pre-existing).
6. Every new server feature gets at least one vitest test.
7. AP / procurement endpoints: require `X-Tenant-Id`, scope queries by
   `tenant_id`.
8. Run `npm run lint` and `npm run format:check` before pushing — Husky
   handles staged files automatically.
9. **Universal master rule** — system-generated fields (`id`, `code`, ref
   numbers, document numbers like invoice number / debit note number / GRN
   ref / PR ref / PO ref) MUST render on every create/edit form as a
   read-only input. On create: placeholder `Auto-generated on save`. On
   edit: show the real value, still not editable. Never accept user input
   into these fields. Pattern applied so far: `InvoiceFormPO.invoiceNumber`,
   `InvoiceFormDirectV2.invoiceNumber`, `NonPOInvoiceForm.invoiceNumber`,
   `DebitNoteFormV2Enhanced.debitNoteNumber`. The same rule is wired
   into `SimpleMasterScreenV2` — every master form's Code field is
   read-only, with `autoGenerated: true` available for any other field
   that should follow the same pattern. See §14.

### Invoice form routing

`/invoices/edit/:id` mounts `<InvoiceEditLoader>` (`src/components/InvoiceEditLoader.tsx`),
a thin wrapper that GETs `/api/invoices/:id` once to inspect the row, then
renders `<NonPOInvoiceForm>` when `po_number` is empty or `<InvoiceFormPO>`
when a PO is attached. The form itself does a second GET on mount to hydrate
state — this is the only cleanly typed way to share the prefill path with
the AI-capture flow (`location.state.fromAI`).

Both forms branch on `isEditMode = Boolean(useParams().id)`:

- **Create** — POST `/api/invoices` with flat fields. `total_amount`
  stays as `netPayable` (status-quo PO form) or `finalNetPayable`
  (non-PO) so existing list/detail rendering is preserved.
- **Edit** — PUT `/api/invoices/:id` with
  `{ invoice: {...flatFields}, line_items: [...] }`. `total_amount` is
  `grossAmount` (subtotal + GST) so the server's PUT reconciler
  (`lineTaxable + lineGST ≈ total_amount`, ±₹1) passes. The form sends
  `cgst/sgst/igst` on each line for the reconciler — these are read
  but not persisted at the line level (server's `invoice_line_items`
  table has only `description / quantity / unit_price / amount /
hsn_sac / gst_rate`).
- **Success** — POST navigates to `/invoices` (listing); PUT navigates
  to `/invoices/:id` (detail).
- **Errors** — `ApiRequestError.details[]` surfaced verbatim via
  `alert()` in both forms (legacy UX; future cleanup: inline banner).
- **`addInvoice()` from `useAPData()` is no longer called by either
  form.** `useAPData` import dropped entirely from `NonPOInvoiceForm`;
  retained in `InvoiceFormPO` only for vendor/PO/GRN lookups.

---

## 13. Application audit (2026-05-10)

This section captures the full read-only audit of the codebase as of the
procurement-relational landing. It complements §3-§9 (which describe how
things are designed) with **what the actual current state is** — including
modules that work end-to-end, modules that exist as stubs, and orphans.

### Subsystem status

| Subsystem                          | Verdict               | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Auth**                           | working               | bcrypt + sessions; `/api/auth/login`+`/me`+`/logout` extracted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Masters** (32 keys; 15 on V2 UI) | working               | **V2 UI (2026-05-11 sweep)** — 15 masters now driven by `src/components/masters/SimpleMasterScreenV2.tsx` (12 base + 3 added on 2026-05-11 pm: `ProfitCentreMaster`, `KitBundleMaster`, `EmployeeMaster`): `DepartmentMaster`, `DesignationMaster`, `LocationMaster`, `CostCentreMaster`, `GLCodeMaster`, `TaxCodeMaster`, `UOMMaster`, `VendorGroupMaster`, `AssetCategoryMaster`, `DepreciationMethodMaster`, `ServiceTypeMaster`, `ExpenseCategoryMaster`. Each is a 20–60-line config wrapper. The 7 heavy ones (Department/Location/CostCentre/GLCode/TaxCode/UOM/VendorGroup) kept their approval-workflow + entity-mapping behaviour via the new `entityScoped` + `requiresApproval` config flags (see §14). Cross-ref of `masterTables.ts` ↔ `masterStorage.mjs` is **31 perfect matches** (after the 2026-05-11 removal of Product / SKU / PaymentMethod / Color / Size masters). Sprint 1 (2026-05-10) added 4 new masters: `asset_category_master` (8 rows), `depreciation_method_master` (4), `service_type_master` (13), `expense_category_master` (11) — all with UNIQUE on `(record_code, tenant_id)` so seeds are idempotent on re-run. `MasterDataContext` now hydrates `assetCategories`, `depreciationMethods`, `serviceTypes`, `expenseCategories` alongside `designations`/`vendorGroups`/`locations`. **5 new admin UI screens** (`DesignationMaster`, `AssetCategoryMaster`, `DepreciationMethodMaster`, `ServiceTypeMaster`, `ExpenseCategoryMaster`) all use a new shared `<SimpleMasterScreen>` shell (`src/components/ui/SimpleMasterScreen.tsx`) — list / add / edit / delete / status badges with configurable extra columns (top-level row fields or payload-JSON fields). All 5 wired at `/masters/{designation,asset-category,depreciation-method,service-type,expense-category}-master`. **Form rewires**: `AssetCapexPRForm` now reads asset categories + depreciation methods from masters with hardcode fallback, and `budgetYear` dropdown is now dynamically computed (Indian FY = Apr–Mar; current + 2 future FYs). `ServicePRForm` service-type dropdown wired to `serviceTypes`. `InvoiceFormPO` currency dropdown wired to `currencies` (with 6-currency fallback INR/USD/EUR/GBP/AED/SGD); TDS section already used `getActiveTDSSections()`. `NonPOInvoiceForm` expense-category dropdown wired to `expenseCategories` with fallback. Earlier landings (item_master 500 fix, vendor_group_master end-to-end, KitBundlePRForm hardcodes, full COA seeds, designation master) all still in place. Realistic Indian mid-market org seeds: department_master 16 rows, designation_master 20, location_master 12, gl_code_master 51, user_master 15. **Vendors**: 12 new realistic seeds (TCS, Infosys, Wipro, Mahindra, Rajan, Balaji, Shree, Micro Tech, Sri Venkat, Kaveri, AWS, Zomato) on `p2p_schema_mt.vendors` — vendor_group_id/code backfilled via JOIN to `vendor_group_master.record_name`. MSME compliance rows added to `vendor_pan_compliance` for the 6 small-vendor seeds (`msme_category='small'`). The `init.sql` contains CREATE statements for the 5 per-master DBs (location, gl_code, vendor_group, designation; the 4 sprint-1 ones live in the migration only) |
| **Procurement** (PR/PO/GRN/SRN)    | working               | New relational stack — see §6. Note: PO table is `purchase_orders_proc` to avoid collision with the legacy `purchase_orders` (still hit by matchAgent)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Payments** (5 tabs)              | working with one stub | Queue/Dashboard/Forecast/Settings: working. Banking: Mode B fully working, **Mode A is a connected-stub** (mock balance, fake UTRs)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Vendor Advances**                | working               | `/ap/vendor-advances` — relational lifecycle                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Vendor Management**              | working               | governance desk, invitations, review, master CRUD; `PortalUsers` is thin (blob-only)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Invoices / AP pipeline**         | mostly working        | 8 lifecycle states wired; touchless engine + 12-rule risk flags + manual retry. Pre-existing TS errors in `InvoiceFormPO.tsx` (F4)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Agent pipeline (orchestrator)**  | working               | 8-step pipeline, retry queue, structured metrics, alerts                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Agent Configurator UI**          | partial               | CRUD persists to `agents` table, but **runtime is gated by `ENABLE_AGENT_BUILDER_RUNTIME` env var** — disabled in dev                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Workflow Engine UI**             | stub                  | `/workflow-engine` and `/workflow-engine/designer` render UIs; no runtime executor wires them. The actual engine is the hardcoded 8-step orchestrator                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Debit Notes**                    | partial               | Full schema + forms exist, but backend endpoints are thin/blob-driven                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Bulk Upload** (Excel)            | working               | `MasterBulkUpload.tsx` ~600 lines, schema-driven, dual-write                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Super Admin**                    | working               | `/super-admin/login` + `/super-admin` (RBAC-gated) — `SuperAdminLogin/Layout/Console`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Reports / Dashboards**           | mostly working        | Real: Dashboard, APDashboard, PaymentsDashboard, AIIngestionDashboard, ApprovalDashboard, CreatorDashboard, CombinedDashboard, OperationalDashboard, GlobalApprovalsDashboard, MSMEPaymentDashboard, AuditTrailReport. Mock/blob: BudgetDashboard. Stubs: `pages/reports/ConsolidatedReports.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Budget module**                  | mock-only             | `/budget*` and `/budgeting/*` routes registered; `BudgetDataContext` is blob-only with no real API. **No nav link**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **AR module**                      | unscoped              | `/ar/customers`, `/ar/sales-invoices`, `/ar/collections`, `/ar/credit-notes`, `/ar/revenue-recognition`, `/ar/masters`, `/ar/reports` — registered but **no nav link**; CLAUDE.md open-decision asks whether to remove or keep as stubs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Cash Flow / R2R**                | unscoped              | `/r2r/cash-flow/*` (10 routes) — registered but **no nav link**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

### Server route inventory (~157 endpoints)

| Source                              |      Lines |                              Endpoints |
| ----------------------------------- | ---------: | -------------------------------------: |
| `server/index.mjs` (inline if/else) |      5 429 |                                    ~92 |
| `server/routes/auth.mjs`            |        108 |                                      3 |
| `server/routes/invoices.mjs`        |        183 |                                      3 |
| `server/routes/payments.mjs`        |      2 499 |                                     26 |
| `server/routes/advances.mjs`        |        706 |                                     11 |
| `server/routes/procurement.mjs`     |      2 042 |                                     22 |
| **Total**                           | **10 967** | **~157** (≈41% extracted, ≈59% inline) |

Inline-monolith domains by approximate endpoint count: invoices+ingestion (24),
agents+AI helpers (13), masters+items+GL (12), approvals (10), vendors (8),
PO legacy (6), payment-batches legacy (4), KYC (5), settings/health/workflows
/documents/tenancy (~10).

### Database — 67 tables across 22 migrations

| Domain                | Count | Key tables                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------- | ----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tenancy               |     4 | `tenants`, `entities`, `user_entity_access`, `tenant_registry`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Auth                  |     2 | `user_master.user_master`, `sessions`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Vendors               |     8 | `vendors`, `vendor_spocs`, `vendor_pan_compliance`, `vendor_gst_registrations`, `vendor_bank_accounts`, `vendor_entity_mappings`, `vendor_kyc_logs`, `vendor_opening_balances`                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Invoices              |     8 | `invoices`, `invoice_line_items`, `invoice_exceptions`, `invoice_audit_log`, `invoice_risk_flags`, `ocr_field_corrections`, `ocr_learning_patterns`, `invoice_rejection_reasons`                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Procurement           |    11 | see §6                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Payments              |     6 | `payments`, `payment_batches`, `payment_batch_lines`, `bank_accounts`, `bank_payment_batches`, `bank_payment_batch_items`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Vendor advances       |     2 | `vendor_advances`, `advance_ref_sequence`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Approvals + workflows |     4 | `approvals`, `approval_workflows`, `workflow_configurations`, `master_record_versions`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Masters               |    26 | `item_master`, `master_records` + 22 `erp_master_*` (LIKE-cloned) + 5 per-master DBs (tds_section, location, gl_code, vendor_group, designation) + the 2026-05-11 trio (profit_centre, kit_bundle, employee). **Removed 2026-05-11:** Product / SKU / PaymentMethod / Color / Size masters (component + route + nav + registry + schema entries). Existing DB tables (`product_master.*`, `sku_master.*`, `payment_method_master.*`, `color_master.*`, `size_master.*`, `erp_master_products/skus/colors/sizes/payment_methods`) are intentionally **not dropped** — orphaned but preserved on Azure MySQL. |
| Configuration         |     7 | `app_settings`, `payment_settings`, `domain_documents`, `invoice_duplicate_config`, `gst_validation_config`, `kyc_provider_config`, `kyc_check_config`                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Agents                |     3 | `agent_retry_queue`, `tds_section_config`, `tds_ytd_aggregates`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Legacy                |     1 | `purchase_orders` (still queried by matchAgent's exact-match path)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

**Schema health:** collation mismatch — `tenants`/`entities` use
`utf8mb4_unicode_ci` while business tables use `utf8mb4_0900_ai_ci`. No FKs
across the boundary (deliberate; flagged for WS-1b harmonization).

### Contexts (15 files)

Core (high consumer count): `AuthContext` (~79), `MasterDataContext` (~107),
`APDataContext` (~45), `ProcurementDataContext` (~33).

Mid-low: `BudgetDataContext` (5–8, blob-only),
`DashboardDataContext` (~8, mock+blob), `EntityRegistry` (3),
`FinanceRBACContext`/`PermissionRBACContext`/`RBACContext` (5–9 each),
`VendorInvitationContext` (~3).

Barely used (candidates for review):

- `PortalUsersContext.tsx` — 5 consumers, blob-only, no real API
- `PurchaseRequestData.tsx` — 2–3 consumers, **superseded by ProcurementDataContext** post-migration

Demo/seed only: `ComprehensiveMasterData.ts`, `DemoVendorDataset.ts`,
`MultiEntityMasterData.ts`, `EntityTransactionData.tsx` (development-only).

### Orphans

- **Navigation variants (4 of 5 unused):** `MainNavigation.tsx` is the only one wired (imported by `DashboardLayout.tsx:3`). Orphans: `FinanceNavigation.tsx`, `EnterpriseFinanceNavigation.tsx`, `EnterpriseFinanceNavigationV2.tsx`, `PermissionBasedNavigation.tsx`, `RBACNavigation.tsx`.
- **Component orphans (likely safe to delete after manual verification):** `RootLayout.tsx` (10-line stub), `MyTasks.tsx`, `VisitingCard.tsx`, `VisitingCardNew.tsx`, `VisitingCardDesigns.tsx`, `PermissionRBACDemo.tsx`, `ScaffoldQuickAccess.tsx`, `InvoiceUploadOCR.tsx` (replaced by `AIInvoiceCapture`), `DashboardV2.tsx`, `ConsolidatedReportingDashboard.tsx`.
- **Master orphan:** `vendor_group_master` (no backend mapping).
- **Backend-only endpoints** (intentional): `/api/ap/{vendor,field}-learning/{learn,resolve}` (orchestrator-internal training), `/api/admin/tenants` (admin-only).
- **Module-level orphans (no nav reachability):** entire AR module (`/ar/*`), entire Cash Flow module (`/r2r/cash-flow/*`), entire Budget module (`/budget*`/`/budgeting/*`).

### Audit method

- 6 parallel sub-agents read each area independently, returned ~700–1500 word factual reports with file:line citations.
- Synthesis verified two cross-agent disagreements directly: SuperAdmin module **does** exist (sub-agent 5 missed it; routes confirmed at `App.tsx:481-483`); active navigation is `MainNavigation.tsx` (confirmed at `DashboardLayout.tsx:3`).
- **No code changes were made during the audit.** Findings reported as-is.

---

## 14. Master UI Standard V2

**Reference implementation:** `src/components/masters/SimpleMasterScreenV2.tsx`.
**Full spec:** `docs/FORM_STANDARD_V2.md`.

### 14.1 Listing chrome tokens — single source of truth

All listing pages source their chrome from `src/components/ui/listingStyles.ts`.
The two most-load-bearing tokens for visual consistency across the app:

| Token           | Value                                | Used for                                                                                                                                                                                                           |
| --------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tableHeaderBg` | `var(--color-nav-panel)` = `#1E2E38` | Background of every `<thead>` and every grid-style header strip across every listing page. **Same dark slate as the left navigation panel** — the visual horizon-line is identical app-wide. Set in `globals.css`. |
| `tableHeaderFg` | `rgba(255, 255, 255, 0.84)`          | Text colour on top of `tableHeaderBg`. Matches the muted-white contrast used by nav-panel item labels.                                                                                                             |

`listingThead` and `listingTh` apply both tokens automatically. Consumers
that build their own header strip (CSS-grid "fake thead" patterns in
PaymentQueue / VendorAdvances / Approvals; gradient headers in the
bespoke ProcurementMaster / VendorMaster listings) import the tokens
directly rather than hardcoding values. **If you add a new listing page,
spread `listingThead` on the `<thead>` element and `listingTh` on each
`<th>` — the chrome will follow.**

Migrated 2026-05-11 from `var(--color-background-secondary)` (cloud) /
`linear-gradient(180deg, #F8FBFD 0%, #F3F8FB 100%)` (gradient) /
`var(--color-cloud)` (thead background): PR / PO / GRN / SRN / Invoices
/ Debit Notes / Advances / Payments / Vendor Management + all 25
masters (12 on V2 + 13 still-bespoke flipped in place).

Every master in this codebase that fits the "flat reference table" shape
(rows of code + name + a handful of attribute fields, persisted via
`useIncrementalMasterRecords → PUT /api/masters/<key>`) renders through
one component — `SimpleMasterScreenV2`. Each `<Name>Master.tsx` wrapper
is a 20–60 line config that declares listing columns, form sections, and
the two optional capability flags. There is no bespoke listing or drawer
code in those wrappers any more.

### Capability flags

| Flag                     | What it does                                                                                                                                                                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entityScoped: true`     | V2 mounts `<EntityMappingSelector>` (from `src/components/shared/`) as a section between the configured sections and the Status section. Records carry `entityMappings: EntityScopeMapping[]` per the existing convention.                                                      |
| `requiresApproval: true` | Footer primary action becomes `Save & submit for approval` (writes `approvalStatus = 'Pending Approval'`). View-mode of a `Pending Approval` row shows inline `Approve` + `Reject` buttons that call `applyMasterApprovalAction`.                                               |
| `codeKey` / `nameKey`    | Override the universal `recordCode` / `recordName` keys for masters whose row shapes use bespoke field names (e.g. `deptCode` / `deptName` on Department). The save path mirrors writes back to both the custom keys and the universal mirrors so other consumers keep working. |

### Universal Master Rule (mandatory)

System-generated fields — every record's `id` / `code`, every document
ref / document number across the app — are **always read-only** on
forms. V2 enforces this for the master's Code field automatically; any
other field can opt in with `autoGenerated: true`. See §12.9 for the
cross-app field list and `docs/FORM_STANDARD_V2.md §3.2` for the
behavioural detail (placeholder, `Auto` pill, no validation, no
onChange).

### Migrated masters (2026-05-11)

12 masters wired to V2 in one pass:

- **5 thin wrappers** (already on `SimpleMasterScreen` v1): `Designation`,
  `AssetCategory`, `DepreciationMethod`, `ServiceType`, `ExpenseCategory`.
- **7 bespoke heavyweights** (each replaced 600–900 lines of drawer +
  `<ApprovalModal>` + `<EntityMappingSelector>` with a 30–60 line config):
  `Department`, `Location`, `CostCentre`, `GLCode`, `TaxCode`, `UOM`,
  `VendorGroup`. Approval workflow + entity scoping preserved via the
  two flags above.

### Adding a new master

See `docs/FORM_STANDARD_V2.md §8` for the recipe — DB migration → server
registry → master-data context (if needed) → V2 config wrapper → route.
