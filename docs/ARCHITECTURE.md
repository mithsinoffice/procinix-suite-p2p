# Procinix v2 (S2P) — Architecture

_Last updated: 2026-05-19 (simplified invoice creation — single InvoiceFormPage)_

Indian Source-to-Pay (S2P) platform — Procurement, Goods Receipt, AP Invoice processing, Payments, Vendor management, Approvals and Masters — for mid-market Indian enterprises. Multi-tenant, RBAC-gated, n8n-driven email ingestion, Gemini OCR.

This document describes the **current state** of the codebase (not aspirational design). When state changes, update this file in the same commit.

---

## §1 Stack (locked — do not deviate)

| Layer            | Choice                                                          |
| ---------------- | --------------------------------------------------------------- |
| Frontend         | React 18 + Vite + TypeScript strict                             |
| Styling          | Tailwind CSS + shadcn/ui + Radix UI                             |
| Server state     | TanStack Query v5 (no raw fetch anywhere — `src/lib/http.ts`)   |
| Routing          | React Router v6 (all pages `React.lazy`)                        |
| Forms            | React Hook Form + Zod (`src/lib/schemas/`)                      |
| Global state     | Zustand (`src/stores/auth.store.ts`)                            |
| Fuzzy match      | fuse.js                                                         |
| Dates            | date-fns                                                        |
| HTTP server      | Fastify (logger via pino, pino-pretty in dev)                   |
| ORM              | Prisma (no raw SQL outside migration files)                     |
| Database         | Azure MySQL Flexible (local: localhost:3306)                    |
| Cache            | Redis (Azure Cache; local: localhost:6379)                      |
| Auth             | httpOnly + SameSite=Strict cookies + JWT (access 15m, refresh 7d) |
| Secrets          | `.env` in dev (gitignored), Azure Key Vault in prod             |
| OCR              | `@google/generative-ai` — `gemini-2.0-flash`                    |
| Email ingestion  | n8n (canonical) + Gmail API poller (legacy, gated by env flag)  |
| Mobile           | PWA → Capacitor post-MVP                                        |
| CI               | GitHub Actions + Vitest + Playwright + Snyk                     |

Ports — Frontend `:3000`, Backend `:8787`, MySQL `:3306`, Redis `:6379`.

---

## §2 Repository layout

```
src/                                    # React frontend
  components/
    ErrorBoundary.tsx                   # Top-level + RouteErrorPage
    Approvals/
    layout/
      AppShell.tsx                      # Sidebar + Outlet, perm-gated nav
      TopBar.tsx                        # Sticky h-12, page title, entity chip, bell, avatar
    masters/
      MasterListScreen.tsx              # Generic list+form for masters
      MasterFormLayout.tsx              # FormSection / FormField / FormInput / FormSelect / ApiSelect / MasterPageHeader
      MasterTabs.tsx                    # ACTIVE / DRAFT / PENDING_APPROVAL / ALL counts
    shared/
      AuditTrailDrawer · BulkUploadModal · OcrUploader · MatchScoreBadge ·
      KycBadge · ChannelBadge · FlagImage · PageSkeleton
  hooks/  useFeature · useMasterData · usePermission
  lib/
    api/ auth · dashboard · invoices · vendors
    http.ts                             # fetch wrapper + HttpError; throws on !ok
    query-client.ts                     # TanStack Query singleton
    schemas/  · utils/ formatters · utils.ts
  pages/                                # All React.lazy in router.tsx
    auth/LoginPage
    dashboard/DashboardPage
    approvals/ApprovalDeskPage
    intake/IntakePage
    purchase-orders/  PurchaseOrdersPage · PRFormPage · POFormPage
    grn/  GRNPage · GRNFormPage
    invoices/  InvoiceListPage · InvoiceFormPage · InvoiceDetailPage · InvoiceNewPage · InvoiceReviewQueuePage ·
               components/invoice-shared.ts
               (InvoiceTypeSelector / InvoiceCreatePO / InvoiceCreateDirect — orphaned wizard files, retained on disk but not routed; see §10b)
    payments/  PaymentListPage · PaymentDetailPage
    workflow/WorkflowHubPage             # /workflow — engine entry
    masters/                             # MastersPage + 30+ masters
      Departments · GlCodes · CostCentres · TaxCodes · Designations · Locations ·
      Entities · Employees · TaxRegimes · FinancialYears · CountryMaster · StateMaster ·
      CityMaster · CurrencyMaster · FxRateMaster · VendorCategory · VendorGroup ·
      ProfitCentre · TdsSections · WorkflowRules · MastersPage
      vendors/  VendorListPage · VendorFormPage · VendorDetailPage
      users/    UserListPage · UserFormPage
      roles/    RolePrivilegePage
      items/    ItemMasterPage · ItemFormPage · ItemCategoryPage
      workflow/ WorkflowDefinitionsPage · WorkflowDefinitionFormPage
      budget/   BudgetListPage · BudgetFormPage · BudgetDetailPage
    admin/AdminTenantsPage
    NotFoundPage
  router.tsx                            # All routes; AppShell wraps authenticated pages
  stores/ auth.store.ts                 # Zustand — current user + tenant

server/src/                             # Fastify backend
  plugins/                              # Registered in order (see §3)
    env · cors · helmet · rate-limit · auth · tenant · error-handler
  middleware/
    rbac.ts                             # `preHandler` gates mutating routes
  routes/
    health · auth · vendors · masters · invoices · dashboard · workflow · admin ·
    procurement · webhooks
  services/
    auth.service                        # loginUser, JWT mint, cookie opts
    invoice.service · invoice-ingestion.service
    gemini-ocr.service                  # extractInvoiceFromFile()
    email-poller.service                # Gmail API poll, in-flight lock + 1h circuit-breaker
    vendor.service · master.service
    workflow-engine.service             # startWorkflow / approveStage / rejectStage / putOnHold / addChatMessage
    match-scoring.service               # 2-way + 3-way match scoring
    po-consumption.service              # augmentPOWithOpenValue / filterByOpenValue / validatePOConsumption (pure, unit-tested)
    kyc.orchestrator.ts · kyc/          # PAN / GSTIN / IFSC verification
    surepass.service · ongrid.service · transbnk.service
  lib/
    prisma · redis · audit · result

prisma/
  schema.prisma                         # 74 models + 7 enums
  seed.ts                               # Master data seed (GL codes, TDS sections, etc.)

vitest.config.ts                        # Frontend + backend pure-function specs
```

---

## §3 Server boot (`server/src/server.ts`)

Plugin registration order (each depends on those before it):

1. `envPlugin` — validate env, crash on invalid
2. `redisPlugin` — Redis connect + ping
3. `prismaPlugin` — Prisma connect + ping
4. `corsConfig` — CORS headers
5. `helmetConfig` — security headers
6. `rateLimitConfig` — per-IP rate limiting (needs Redis)
7. `authPlugin` — JWT + cookies (`@fastify/cookie`, `@fastify/jwt`)
8. `tenantPlugin` — `req.tenant` from JWT (never from body)
9. `errorHandlerPlugin` — global catch (never leaks stack traces)

After plugins: a `preHandler` hook runs `rbacHook` on every request that has a user; mutating routes are gated by the permission matrix (read routes fall through; SUPER_ADMIN bypasses).

Route prefix table (registered in `buildApp()`):

| Prefix             | File                | Purpose                                    |
| ------------------ | ------------------- | ------------------------------------------ |
| (root)             | `health.ts`         | `/health/live`, `/health/ready`, `/health` |
| (root)             | `webhooks.ts`       | n8n + TransBnk webhooks (HMAC-verified)    |
| `/auth`            | `auth.ts`           | login / logout / me / refresh / OAuth      |
| `/api/masters/vendors` | `vendors.ts`    | Vendor CRUD + KYC verifications            |
| `/api/masters`     | `masters.ts`        | All masters + bulk + audit (~65 routes)    |
| `/api/invoices`    | `invoices.ts`       | Invoice CRUD + approval + ingestion + OCR  |
| `/api/dashboard`   | `dashboard.ts`      | KPIs + spend-trend + spend-by-gl + activity |
| `/api/workflow`    | `workflow.ts`       | Workflow engine: definitions + instances + start |
| `/api`             | `admin.ts`          | Tenant + user admin (`/api/admin/...`)     |
| `/api`             | `procurement.ts`    | PR + PO + GRN + SRN + advances + budgets   |
| `/api/email-poll`  | inline in server.ts | `/trigger` (auth) + `/debug` (auth)        |

Gmail poller cron (`startEmailPoller`) starts only when `EMAIL_POLLER_ENABLED=true`. Default is **disabled** — n8n drives ingestion via `POST /webhooks/n8n/invoice-ingest`.

---

## §4 Modules — current state

| Module                  | Status         | Notes                                                                              |
| ----------------------- | -------------- | ---------------------------------------------------------------------------------- |
| Auth                    | Shipped        | JWT in httpOnly cookies; `/auth/login` / `/logout` / `/me` / `/refresh`            |
| Tenant + RBAC           | Shipped        | UserEntityAccess + UserEntityRole + RolePrivilege; 9-module × 6-action matrix      |
| Masters (35+ entities)  | Shipped        | `MasterListScreen` generic UI; bespoke pages for Vendors, Employees, Items, Users, Budget, Workflow Defs |
| Vendor Master           | Shipped        | Full form, KYC verification (PAN/GSTIN/IFSC via SurePass + OnGrid), bank accounts, entity mappings |
| Item Master             | Shipped        | Category-typed items (EXPENSE / ASSET / PROVISION); per-entity GL mappings; rate contracts |
| Intake (PR)             | Shipped        | Standalone nav module; PRFormPage with identity, line items, budget check          |
| Purchase Orders         | Shipped        | POFormPage — GST type banner (CGST/SGST vs IGST), milestones for services, EXCLUSIVE/INCLUSIVE tax, GRN-driven |
| GRN                     | Shipped        | PO-driven line auto-load, qty validation                                            |
| Invoices                | Shipped        | OCR extract → form, n8n ingestion, 3-way match scoring, full workflow              |
| Payments                | List/Detail    | List + detail pages; batch flow not yet wired                                       |
| Budget                  | Shipped        | List, form, detail; utilisation check on PO                                          |
| Dashboard               | Shipped        | KPIs, spend trend, spend by GL, recent activity                                     |
| Approvals               | Shipped        | `ApprovalDeskPage` — pending approvals across modules                              |
| Workflow Definitions    | Shipped        | `/workflow` hub + `/workflow/definitions` list + form (22 module types)             |
| Workflow Engine Runtime | Shipped        | Definitions → instances → stages → approver routing; chat + holds + SLA tracking   |
| Admin / Tenants         | Shipped        | SUPER_ADMIN-only — tenants, modules, features, users                                |
| Email Ingestion         | Shipped via n8n | `POST /webhooks/n8n/invoice-ingest` (HMAC `X-N8N-Secret`) → `ingestInvoice()`     |

---

## §5 Auth & RBAC

### §5.1 Cookies + JWT

- Access token — JWT, 15-minute TTL (`JWT_EXPIRES_IN` env, default `15m`). Cookie name `access_token`, path `/`.
- Refresh token — JWT, 7-day TTL (`JWT_REFRESH_EXPIRES_IN` env, default `7d`). Cookie name `refresh_token`, path `/auth/refresh`.
- Both `httpOnly` + `sameSite: 'strict'`; `secure` in production only.

Sources — [server/src/services/auth.service.ts](../server/src/services/auth.service.ts), [server/src/routes/auth.ts](../server/src/routes/auth.ts).

### §5.2 `/auth/me` resolution chain

Returns the current user plus pre-resolved profile defaults so forms can auto-populate without N round-trips:

- `entityId` ← first `UserEntityAccess(isActive=true)` → fallback: first Entity in tenant by `createdAt asc`.
- `accessibleEntityIds[]` ← all active UserEntityAccess rows.
- `departmentId` ← `Employee(email = user.email).departmentId` → fallback: first ACTIVE Department by `name asc`.
- `designationId` / `locationId` ← `Employee(email = user.email)` (null otherwise).

Fallbacks are UI defaults, not authorisation grants.

### §5.3 `/auth/my-permissions`

Per-user RBAC matrix `{ MODULE: { action: boolean } }`. Modules: `INTAKE`, `PO`, `GRN`, `INVOICE`, `PAYMENT`, `VENDOR`, `BUDGET`, `MASTERS`, `ADMIN`. Actions: `create`, `view`, `edit`, `delete`, `submit`, `approve`. SUPER_ADMIN gets implicit all-access. Otherwise: every role assigned via `UserEntityRole` (or `User.role` if no entity roles) → look up `RolePrivilege(roleCode).permissions` → OR-merge across roles.

### §5.4 Server-side gate

`server/src/middleware/rbac.ts` runs as a `preHandler` on every authenticated request. Read routes and unmapped routes fall through. SUPER_ADMIN bypasses.

### §5.5 Client-side gate

`AppShell.tsx` filters nav items by `view` permission. `ALWAYS_VISIBLE = ['/dashboard', '/masters', '/admin/tenants']` short-circuits the filter so these items render regardless of perms state — Masters must remain reachable even mid-refresh / on 401 from `/my-permissions`.

---

## §6 Multi-tenancy

- Every business table has `tenantId String` (FK to `Tenant`). Set on the request via `tenantPlugin` from the JWT — **never** trusted from request body.
- Per-tenant `TenantModule` + `TenantFeature` rows gate which modules/features are enabled (admin-managed via `/api/admin/tenants/:id/modules`).
- Local dev seed creates a single demo tenant (`procinix-s2p`) with one admin user (`mithilesh@procinix.ai` / `Demo@123`).

---

## §7 Workflow engine

Two halves: **definitions** (configured by admins) and **instances** (created on document submission).

### §7.1 Schema (Prisma)

| Model                          | Purpose                                                                                 |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| `WorkflowDefinition`           | Per-tenant rule. Fields: `module`, `entityId?`, `departmentId?`, `priority`, `isDefault`, `status`. |
| `WorkflowDefinitionStage`      | Ordered approval stages. `approverType` ∈ {USER, ROLE, MANAGER_OF, DEPT_HEAD}; SLA hours; auto-approve threshold. |
| `WorkflowDefinitionCondition`  | Filter on the document. `field`, `operator` (GT/LT/EQ/IN/CONTAINS/STARTS/…), `value`, `logicGroup` (AND/OR). |
| `WorkflowInstance`             | One per (entityType, entityId). `status` ∈ {IN_PROGRESS, APPROVED, REJECTED, ON_HOLD, CANCELLED}. |
| `WorkflowInstanceStage`        | Stage state — `PENDING`, `APPROVED`, `REJECTED`, `SKIPPED`, `AUTO_APPROVED`, `ESCALATED`, `INFO_REQUESTED`. |
| `WorkflowChat`, `WorkflowAttachment` | Conversation thread per instance.                                                  |
| `ApprovalStep`                 | Legacy table — used by older invoice approval routes; superseded by `WorkflowInstanceStage`. |

### §7.2 Modules (22 codes)

`WfModule` (type union in `workflow-engine.service.ts`) — persisted as a plain string in `WorkflowDefinition.module`:

```
INVOICE · PAYMENT · VENDOR · MASTER · PR · PO · GRN · BUDGET ·
DEPARTMENT · GL_CODE · COST_CENTRE · EMPLOYEE · DESIGNATION ·
LOCATION · ITEM · VENDOR_CATEGORY · FINANCIAL_YEAR · TAX_CODE ·
TDS_SECTION · ENTITY · USER · CURRENCY · PROFIT_CENTRE
```

The `WorkflowDefinitionFormPage` Module dropdown shows the same list with human-readable labels.

### §7.3 Routes (`/api/workflow`)

| Method | Path                            | Purpose                                                                                  |
| ------ | ------------------------------- | ---------------------------------------------------------------------------------------- |
| POST   | `/start`                        | Generic dispatcher. Body `{ module, entityType, entityId, record? }`. Returns `{ ok: false, reason: 'NO_WORKFLOW_DEFINED' }` if no ACTIVE definition matches, otherwise `{ ok: true, instanceId }`. |
| GET    | `/instances/:id`                | Instance + stages + chat + definition.                                                   |
| GET    | `/:entityType/:entityId`        | Active instance for a record.                                                            |
| POST   | `/instances/:id/approve`        | Approve current stage; advances to next pending; on final stage flips invoice → APPROVED. |
| POST   | `/instances/:id/reject`         | Reject with mode ∈ {`RETURN_TO_DRAFT`, `REQUEST_INFO`, `RETURN_TO_PREV`}. Comments required. |
| POST   | `/instances/:id/hold`           | Put on hold with reason.                                                                 |
| POST   | `/instances/:id/release`        | Release from hold; remarks required.                                                     |
| POST   | `/instances/:id/chat`           | Add chat message + optional attachments.                                                 |
| GET    | `/definitions`                  | List per tenant, filtered by `module` + `status`. Sorted by `priority desc`.             |
| GET    | `/definitions/:id`              | Single definition with stages + conditions.                                              |
| POST   | `/definitions`                  | Create. Transactional insert of definition + stages + conditions.                        |
| PUT    | `/definitions/:id`              | Update — replaces stages + conditions in a transaction.                                   |
| POST   | `/definitions/:id/duplicate`    | Clone → new code `<src>-COPY-<rand>` in DRAFT status.                                    |

### §7.4 Definition selection (`selectDefinition`)

1. Query all ACTIVE definitions for `(tenantId, module)`, sorted by `priority desc`.
2. Skip definitions where `entityId` / `departmentId` is set and doesn't match the record.
3. First definition whose conditions all evaluate true (AND-group all true AND OR-group at least one true) wins.
4. Else fall back to the first `isDefault` definition with no entity/department scope.
5. Else null → caller decides what to do (typically auto-approve).

### §7.5 Approver resolution (`resolveApprover`)

- `USER` — the configured `approverUserId`.
- `ROLE` — first active `User(role = stage.approverRole, departmentId?)` ordered by `createdAt asc`.
- `MANAGER_OF` — `Employee(tenantId).managerId` (uses first employee; needs scoping by requester).
- `DEPT_HEAD` — first active `User(role='DEPT_HEAD', departmentId = record.departmentId)`.

### §7.6 Masters wired through the engine

`MasterListScreen.MasterConfig.workflowModule` is the per-master opt-in:

- Set on: Departments → `DEPARTMENT`, GL Codes → `GL_CODE`, Cost Centres → `COST_CENTRE`, Tax Codes → `TAX_CODE`, Designations → `DESIGNATION`, Locations → `LOCATION`.
- When set, the submit-for-approval button calls `POST /api/workflow/start`. On `NO_WORKFLOW_DEFINED` or a network failure, falls back to the legacy `POST /:apiPath/:id/submit` route (which just flips `status` to `PENDING_APPROVAL`).
- Other masters (Vendors, Employees, Items, Users, Budget, Entity, FY, Currency, TDS, Profit Centres, etc.) use their own bespoke form pages and have **not** been wired to the engine yet — they still POST directly to `/{...}/submit`. See §11 Pending.

### §7.7 Engine-driven UI

| Page                                              | Path                                          | Role                                                  |
| ------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------- |
| `WorkflowHubPage`                                 | `/workflow`                                   | Engine entry — pending approvals, quick links, +New   |
| `WorkflowDefinitionsPage`                         | `/workflow/definitions`                       | List + status tabs + module pills                     |
| `WorkflowDefinitionFormPage`                      | `/workflow/definitions/new`, `/.../:id`       | 22-module dropdown; stages + conditions builder; JV preview |
| `ApprovalDeskPage`                                | `/approvals`                                  | Cross-module pending-approvals queue                  |

Legacy `/masters/workflow-definitions/*` routes are still registered for backwards compat — they render the same components.

---

## §8 Email ingestion

Two paths exist; n8n is canonical, the in-process Gmail poller is gated and used as fallback only.

### §8.1 n8n → `POST /webhooks/n8n/invoice-ingest`

- HMAC-style shared secret in header `X-N8N-Secret`, compared via `Buffer.timingSafeEqual` (constant-time).
- Body: Zod-validated envelope `{ gmailMessageId, from, subject, date, attachment: { filename, mimeType, base64 }, ocr: OcrInvoiceData }`.
- Idempotency — per-message lookup on `InvoiceIngestionJob.extractedData JSON_EXTRACT($.gmailMessageId)` before inserting.
- Path — Maps the request body to the canonical `OcrInvoiceData` shape (including ISO→DD/MM/YYYY date conversion) and delegates to `ingestInvoice()` in `invoice-ingestion.service.ts`. The service handles vendor match, dedupe, persist, match scoring and audit. No vendor match → job is parked as `NO_VENDOR_MATCH` (it does NOT FK-fail).

### §8.2 In-process Gmail poller (`email-poller.service.ts`) — fallback

- Started only when `EMAIL_POLLER_ENABLED=true` (default off). 5-minute cron.
- Per-tenant in-flight `Set` lock (prevents overlapping runs on the same tenant).
- Module-level `rateLimitedUntil` circuit-breaker — when Gemini returns 429, no calls go out for 60 minutes (cleared on next process boot).
- Retry wrapper does **not** retry 429/quota errors — only transient 5xx / network errors get one retry.
- Dedup uses MySQL JSON path syntax `path: '$.gmailMessageId'` (not Postgres `path: ['gmailMessageId']`).

### §8.3 Gemini OCR (`gemini-ocr.service.ts`)

- Default model `gemini-2.0-flash`; overridable via `GEMINI_MODEL` env.
- `extractInvoiceFromFile(base64, mimeType)` is the entry point. Vendor identity, line items, GST splits and TDS fields (`tdsRate`, `tdsAmount`, `tdsSection`) are extracted in a single prompt.
- JSON.parse has a graceful fallback — if the model wraps the JSON, the service extracts the first `{...}` block via regex.

---

## §9 Frontend infrastructure

### §9.1 HTTP client (`src/lib/http.ts`)

All API calls go through `http.get/post/put/delete<T>(url)`. Throws `HttpError` on non-2xx. **No raw `fetch()` is allowed** — TanStack Query wraps `http` for cache + invalidation. Cookies are sent with `credentials: 'include'`.

### §9.2 Routing (`src/router.tsx`)

- `createBrowserRouter` with `RequireAuth` → `AppShell` → page routes; every page is `React.lazy`.
- `errorElement: <RouteErrorPage />` is set at every depth so route-level errors render a clickable retry UI instead of a blank screen.
- Catch-all `*` → `NotFoundPage`.

### §9.3 AppShell + TopBar

- `AppShell` — left sidebar (h-screen), nav permission-gated, `ALWAYS_VISIBLE` shortcut for `/dashboard`, `/masters`, `/admin/tenants`.
- `TopBar` — sticky `h-12 top-0 z-30`. Resolves page title via longest-prefix match on pathname. Right side: entity chip (`currentEntity.name` → `tenantCode` fallback), notification bell with pending-approvals badge, user avatar Radix DropdownMenu.

### §9.4 Auth store (`src/stores/auth.store.ts`)

Zustand store; `isAuthenticated` driven by presence of cookies. The store loads `/auth/me` on app boot and stores `currentUser`. Pages auto-populate from `currentUser` (e.g. `entityId`, `departmentId`).

### §9.5 Masters layer

- `MasterListScreen` — generic list + form (`FullPageForm`) for simple masters. Drives status tabs (ACTIVE / DRAFT / PENDING_APPROVAL / ALL), search, entity scoping, bulk upload, audit trail.
- `MasterFormLayout` — `MasterPageHeader` (mandatory header with ← back), `FormSection`, `FormField`, `FormInput`, `FormSelect`, `FormTextarea`, `ApiSelect`, `AutoCodeField`. **All form inputs use `React.forwardRef` with `displayName`** — ESLint `no-restricted-syntax` blocks bare arrow-function inputs in `src/components/**`.

---

## §10 Key invariants (DO NOT VIOLATE)

### Frontend

- No raw `fetch()` anywhere — TanStack Query + `http`.
- No inline API call paths — go through `src/lib/api/` modules where they exist.
- Master data — `useMasterData()` only; no hardcoded dropdowns.
- Every form input wrapper is `React.forwardRef` + `displayName`. ESLint enforces this.
- Every master/module page uses `<MasterPageHeader>` as its first element (provides the ← breadcrumb).
- Mobile-first CSS — `sm:` for desktop breakpoints, never `max-md:`.

### Backend

- Tenant from JWT only (`req.tenant.id`) — never from request body.
- All inputs validated with Zod before touching Prisma.
- No raw SQL outside migrations — Prisma queries only.
- All mutations write to `AuditLog` (append-only, never delete).
- Every Prisma model has `status String @default("ACTIVE")` — required for `MasterTabs` filtering. Route handlers filter by `status`, not the legacy `isActive` boolean.

### Validation

- Deduplication is server-enforced (client warns, server is authoritative).
- 3-way match (Invoice ↔ PO ↔ GRN) gates invoice approval.
- GSTIN uniqueness is a DB constraint.
- Invoice dedupe — unique index on `(tenantId, vendorId, invoiceNumber)`.

### Performance

- Cursor pagination, never OFFSET.
- Redis cache for master data — TTL 1h, invalidate on edit.
- Skeleton loading on all listing pages.
- Every page is `React.lazy()`.

---

## §10b Invoice creation — two-path flow

`/invoices/new` renders the existing [InvoiceFormPage.tsx](../src/pages/invoices/InvoiceFormPage.tsx) for both PO-based and direct invoices. The form switches modes based on a `?type=po|direct` query param; opening `/invoices/new` with no query param renders a small `InvoiceTypePicker` modal (a two-card overlay) that flips the URL to the chosen mode and lets the rest of the form mount.

This replaces an earlier wizard experiment ([InvoiceTypeSelector.tsx](../src/pages/invoices/InvoiceTypeSelector.tsx), [InvoiceCreatePO.tsx](../src/pages/invoices/InvoiceCreatePO.tsx), [InvoiceCreateDirect.tsx](../src/pages/invoices/InvoiceCreateDirect.tsx)) — those files remain on disk but are no longer routed; do not navigate to them.

### §10b.1 PO-based mode (`/invoices/new?type=po`)

A `POSelectionPanel` renders above Section A:

- Vendor dropdown — picking a vendor fires `GET /api/po?vendorId=X&entityId=Y&status=APPROVED&hasOpenValue=true` to list open POs.
- Open POs table with PO ref / date / open value / GRN count. Picking one auto-fills the form's `vendorId`, `entityId`, `currencyCode`, and `poRef`.
- Consumption toggle: `PARTIAL` / `FULL`.
- Match-type toggle: `2-way` / `3-way`. 3-way disabled when the selected PO has no GRN.

At submit, the panel's selection is threaded into the create payload as `poRefs: [{ poId, consumptionType, invoiceAmount: totals.totalAmount }]` and `matchType`. The existing backend route at [server/src/routes/invoices.ts:114](../server/src/routes/invoices.ts#L114) handles `validatePOConsumption()` and `InvoicePOLink` creation atomically.

### §10b.2 Direct mode (`/invoices/new?type=direct`)

Same InvoiceFormPage, three render-time differences:

- PO reference field is replaced by a read-only "Not applicable" box with an amber `DIRECT — no PO` chip; an `<input type="hidden">` keeps the form value empty so the backend never receives a phantom PO ref.
- Cost Centre + GL Code fields in Section A become required (`register(..., { required: mode === 'direct' })`).
- When `totals.totalAmount > ₹25,000`: blue info banner above Section A pointing at workflow code `WF-INV-DIRECT-L2`. The engine routes the invoice through that 2-stage L2 flow on submit. No UI hardcoding of the lane.

### §10b.3 Backend changes

**Schema** ([prisma/schema.prisma](../prisma/schema.prisma)):
- `PurchaseOrder.consumedAmount Decimal @default(0)` — running total of invoice value charged to the PO.
- `InvoicePOLink` join model — `{ invoiceId, poId, invoiceAmount, consumptionType: 'PARTIAL'|'FULL' }`. Cascade on invoice delete; tenant-scoped.
- `Invoice.matchType String?` (`'2way' | '3way'`) + `Invoice.costCentreId String?` + `Invoice.glCodeId String?` for direct-invoice allocation.

**Routes:**
- `GET /api/po` ([server/src/routes/procurement.ts:131](../server/src/routes/procurement.ts#L131)) — accepts `vendorId`, `entityId`, `status`, `hasOpenValue`. Augments each PO with `openValue = totalAmount - consumedAmount` and `grnCount = _count.grns` via `augmentPOWithOpenValue`. When `hasOpenValue=true`, applies `filterByOpenValue`.
- `POST /api/invoices` ([server/src/routes/invoices.ts:114](../server/src/routes/invoices.ts#L114)) — accepts optional `poRefs[]`, `matchType`, `grnIds[]`. Calls `validatePOConsumption()` before the transaction; on success creates the invoice + `InvoicePOLink` rows + increments `PurchaseOrder.consumedAmount` for each link, all atomically. Sets `Invoice.isPOInvoice = true` when `poRefs.length > 0`.
- Invoice approval (both `approveInvoice` in invoice.service.ts AND the workflow-engine path in `routes/workflow.ts`) — on final APPROVED status, looks up `InvoicePOLink` rows with `consumptionType: 'FULL'` and flips the linked POs to `status: 'FULLY_INVOICED'` so they disappear from the open-PO list.

**Pure helpers** ([server/src/services/po-consumption.service.ts](../server/src/services/po-consumption.service.ts)) — `augmentPOWithOpenValue`, `filterByOpenValue`, `validatePOConsumption`. Zero I/O; covered by 12 Vitest specs at [server/src/services/__tests__/po-consumption.test.ts](../server/src/services/__tests__/po-consumption.test.ts).

### §10b.4 Workflow seed — `WF-INV-DIRECT-L2`

[prisma/seed.ts:861-876](../prisma/seed.ts#L861-L876) — new INVOICE-module definition, priority **25** (sits between INV-STD-LOW and INV-STD-MID). Conditions: `totalAmount >= 25000 AND isPOInvoice == false`. Stages: Finance Manager L2 → CFO L2 Sign-off. Catches direct invoices above the L2 threshold without breaking the existing amount-tier ladder (INV-STD-LOW/MID/HIGH).

---

## §10c Invoice attachment storage

PDF / image attachments are stored on disk and streamed through an auth-gated endpoint — no `@fastify/static` mount, since invoices are tenant-scoped and the read must run through `req.tenant.id` checks.

**Layout** — files land under `uploads/invoices/<tenantId>/<invoiceId>.<ext>`. `Invoice.fileUrl` holds the path relative to `uploads/` (e.g. `"invoices/<tenantId>/<invoiceId>.pdf"`) so a future move to S3 / Azure Blob only needs to swap the resolver in [invoice-file-storage.service.ts](../server/src/services/invoice-file-storage.service.ts). The `uploads/invoices/` tree is gitignored.

**Write paths** — three entry points all funnel into `saveInvoiceFile()`:
- `POST /api/invoices` with `fileBase64` / `fileMimeType` / `fileName` — manual upload from `InvoiceFormPage`. Bytes written after the DB transaction commits; storage failure logs but doesn't fail the create.
- `POST /api/invoices/ingest` and `/webhooks/n8n/invoice-email` — both call `ingestInvoice()` in [invoice-ingestion.service.ts](../server/src/services/invoice-ingestion.service.ts), which now also persists the bytes when `base64Data` is supplied. Pre-OCR'd structured-data paths (`/webhooks/n8n/invoice-ingest`) have nothing to store.
- Email poller — continues to stash bytes in `ocrRawData.attachmentData` (legacy JSON-blob path). New rows from this path don't yet hit disk; covered by the read-path fallback below.

**Read path** — `GET /api/invoices/:id/file` (auth + tenant-scoped) calls `readInvoiceFile()`, which prefers disk (`fileUrl`) and falls back to `ocrRawData.attachmentData` for back-compat. Streams with `Content-Type: <mimeType>` and `Content-Disposition: inline`, plus `Cache-Control: private, max-age=300`. Path-traversal is refused by checking the resolved absolute path stays under `UPLOADS_ROOT`.

**Detail page** — `getInvoice()` in [invoice.service.ts](../server/src/services/invoice.service.ts) strips `ocrRawData.attachmentData` from the response (so the JSON payload stays small) and adds a derived `hasFile: boolean`. The `InvoiceDetailPage` iframe points at `/api/invoices/${id}/file` when `hasFile` is true, and the LeftPanel header shows an "Open" button that opens the same URL in a new tab as a fallback when the in-page iframe fails to render.

---

## §10d Invoice match agent + detail-page layout

The match agent (the "matchAgent" the UI refers to) is composed of two services plus a one-off Gemini OCR call. Together they produce the data that drives every field-level chip, near-match dropdown, and the match-score banner on `InvoiceDetailPage`.

### §10d.1 Pipeline at ingestion time

`ingestInvoice()` in [invoice-ingestion.service.ts](../server/src/services/invoice-ingestion.service.ts) runs:

1. **OCR** ([gemini-ocr.service.ts](../server/src/services/gemini-ocr.service.ts)) — Gemini extracts the invoice into `OcrInvoiceData`. As of the detail-page redesign the response carries both a flat `overallConfidence` and a `fieldConfidence` map keyed by field name (`vendorName`, `invoiceDate`, `narration`, `periodFrom`, etc.). New fields `narration`, `periodFrom`, `periodTo` are extracted alongside the existing identifiers.
2. **Vendor resolution** — `identifyVendor()` returns `{ vendorId, method, nearMatches[] }`. Method is one of `gstin_lookup` (exact GSTIN hit), `fuzzy_name` (fuse.js across `legalName` + `tradeName`), `email_domain`, or `manual`. The full top-3 fuzzy candidates are returned even when the winner is confident enough to auto-pick — the UI uses them when overall vendor confidence is < 98.
3. **Item-master fuzzy match** ([item-match.service.ts](../server/src/services/item-match.service.ts)) — every OCR line description is matched against `item_master.name` / `description` / `ocrKeywords` / `ocrSynonyms`. Top-3 candidates per line with 0–100 scores. Winners are written to `InvoiceLine.itemId`; the full set is persisted on `InvoiceMatchScore.scoreBreakdown.itemMatches[]` (keyed by `lineIndex`).
4. **Invoice create** — `vendorMatchMethod`, `narration`, `periodFrom`, `periodTo`, `vendorGSTIN`, `vendorPAN` all persist on the Invoice. If the OCR didn't extract a `dueDate`, the service auto-computes one from `vendor.paymentTerms` (defaults to 30 days) and stores that.
5. **Match scoring** ([match-scoring.service.ts](../server/src/services/match-scoring.service.ts)) — see below.

### §10d.2 Scoring (6 buckets, total 100)

| Bucket | Max | Computation |
| --- | --- | --- |
| Vendor KYC      | 25 | PAN-valid (+15) + GST-active (+10). Field-level GSTIN/PAN exact-match is a **render-time** chip on the detail page, **not** inherited from OCR confidence (that was the bug the rewrite fixed). |
| PO reference    | 20 | 20 if `Invoice.poRef` resolves to a row in `purchase_orders`, else 0. |
| Amount match    | 15 | PO invoices: 8 PO-tolerance + 7 × line-item-master avg quality. Non-PO: full 15 × line-item-master avg quality. |
| GRN match       | 20 | 20 if a GRN exists, else 0. |
| GST compliance  | 10 | 10 when `vendor.gstComplianceScore ≥ 80`, 5 when ≥ 60. 206AB-flagged vendors get the bucket docked to 0 + a `206AB_FLAG` guardrail. |
| OCR confidence  | 10 | Blend of `overallConfidence` (weight 0.7) and `fieldConfidence.narration` (weight 0.3) when narration is present. Otherwise overall as-is. |

Non-PO invoices redistribute weight: vendor → 55, amount → 20, GST → 15, OCR → 10. Total still caps at 100.

Currency mismatch (invoice currency ≠ entity `baseCurrencyCode`) raises a `CURRENCY_MISMATCH` guardrail. Any guardrail forces `MANUAL` lane regardless of score.

**Pure-function core**: `scoreFromInputs()` is exported alongside `calculateMatchScore()` so the maths can be tested without a Prisma client — see [match-scoring.test.ts](../server/src/services/__tests__/match-scoring.test.ts) for the 13 Vitest specs covering PO/non-PO redistribution, narration blending, and 206AB dock.

### §10d.3 Persistence

`InvoiceMatchScore.scoreBreakdown` (JSON) now carries:

```ts
{
  vendor / po / amount / grn / gst / ocr / mode: string  // human-readable bucket explanation
  vendorMatchMethod:   'gstin_lookup' | 'fuzzy_name' | 'email_domain' | 'manual' | null
  vendorNearMatches:   { id, legalName, vendorCode, gstin?, score }[]   // top-3
  itemMatchAvgScore:   number   // 0–100, drives the Amount bucket
  itemMatches:         { lineIndex, winnerId, winnerName, score, candidates: top3 }[]
  currencyMatch:       boolean
  narrationConfidence: number | undefined
}
```

`getInvoice()` reads this row and merges `itemMatches` onto each `InvoiceLine` (as `itemMatchScore` + `itemCandidates`) so the detail page can render per-line match badges and near-match dropdowns without a second query.

### §10d.4 Detail-page layout

`InvoiceDetailPage.tsx` renders:

- **Match score banner** at the top (out of the lettered sections) — 6 score cards, large overall score, lane badge, guardrails row, OCR model + timestamp top-right.
- **Section A — Invoice Header**: vendor row with `MappingChip` (resolution method) + `OcrChip` (per-field confidence) + `VendorNearMatches` block when confidence < 98; GSTIN/PAN show green `MatchChip` ("Exact match · 100%") computed render-time from `invoice.vendorGSTIN` vs `vendor.gstin`. Due-date renders an `AutoChip` like "Auto · 30-day net" when computed from `vendor.paymentTerms`, or an amber `FieldWarning` when `paymentTerms` is null. PO ref / Department render `FieldWarning` text when null.
- **Section B — Financial Summary**: 4 rows only (Base, GST total, Total, TDS deducted) with cross-check footnotes ("Matches line item total · 100%", "Base + GST = Total · 100%", or red discrepancy callout).
- **Section C — Line Items**: each row shows `item.name` as the headline + a match-score badge (green ≥ 98, amber < 98); raw OCR description rendered smaller below; HSN / GST rate / TDS chip "Auto · item master"; near-matches dropdown when the winner score < 98. A footer row cross-checks line sum vs Section B subtotal.
- **Section D — Narration & Period of Expense**: narration + `periodFrom` / `periodTo`, each with `OcrChip` from `fieldConfidence`.
- **Section E — Audit Trail** and **Section F — Approval Workflow** are unchanged.

The detail-page chips that compare against the vendor master (GSTIN, PAN, currency) are computed in the React component — they don't round-trip to the server because they're trivially derivable from the raw fields and tend to update faster than the match-score row gets refreshed.

---

## §10e Dashboard

The dashboard ([DashboardPage.tsx](../src/pages/dashboard/DashboardPage.tsx)) renders 6 KPI cards + 4 charts + a pending-approvals table, all driven by real Prisma aggregates with a 60s TanStack Query refetch.

### §10e.1 Endpoints

| Endpoint | Returns | Query params |
| --- | --- | --- |
| `GET /api/dashboard/kpis`   | 6 KPI scalars + pending approvals list (top-20) + status group counts + balance | `entityId`, `dateFrom`, `dateTo` |
| `GET /api/dashboard/charts` | 4 chart datasets: statusLast30, laneDonut, topVendors (top-5), matchHistogram | `entityId`, `dateFrom`, `dateTo` |
| `GET /api/dashboard/spend-trend` | 6-month spend trend (unchanged) | — |
| `GET /api/dashboard/spend-by-gl` | Top-8 GL codes FY-to-date (unchanged) | — |
| `GET /api/dashboard/activity`    | Recent 15 audit-log events (unchanged) | — |

All endpoints scope by `request.tenant.id` (JWT claim — never trust a request body or `X-Tenant-Id` header). The `/kpis` route caches its tenant-wide result in Redis for 60s; filtered requests skip the cache because the cache key isn't filter-aware.

### §10e.2 KPI cards (top row, 6 total)

| Card | Source field | Calculation |
| --- | --- | --- |
| Pending approvals | `Invoice.status IN ('PENDING_L1','PENDING_L2','PENDING_L3')` | tenant-wide count |
| Invoice value (period) | `sum(Invoice.totalAmount)` in window for status APPROVED/PAID | sum |
| Overdue | `Invoice.dueDate < now AND status NOT IN ('PAID')` | count + sum(netPayable) |
| STP rate | `Invoice.apLane === 'STP'` over all in-window | pure `calcStpRate()` (1-decimal %) |
| Avg processing | `approvedAt - createdAt` over status APPROVED in window | pure `calcAvgProcessingDays()` (returns null when no completions) |
| TDS (period) | `sum(Invoice.tdsAmount)` in window | sum |

### §10e.3 Charts (4 datasets in one /charts call)

- **Invoice volume by status (last 30 days)** — bar chart, grouped by `status`, rolling 30-day window independent of the date filter so the bar stays comparable.
- **Lane distribution (period)** — donut, output of pure `calcLaneDistribution()`. Unknown/null lanes fold into `UNCATEGORIZED` so totals match invoice count.
- **Top 5 vendors by invoice value (period)** — horizontal bar via `groupBy(vendorId)` + `orderBy(_sum.totalAmount desc) take: 5`, with vendor names resolved in a second query.
- **Match score distribution (period)** — bar with buckets `0–50 / 51–70 / 71–85 / 86–100`, output of pure `matchScoreHistogram()`. Invoices with `matchScore = null` are excluded (so unscored DRAFTs don't spike the low bucket).

### §10e.4 Pure helpers + tests

[dashboard.service.ts](../server/src/services/dashboard.service.ts) exports `calcStpRate`, `calcAvgProcessingDays`, `matchScoreHistogram`, `calcLaneDistribution`, `monthBounds`, and `resolveDateRange` — all pure functions. The route handler pulls invoices once and delegates the maths to these helpers.

[dashboard.test.ts](../server/src/services/__tests__/dashboard.test.ts) — 22 Vitest specs covering empty-invoice fallback, bucket boundaries (50/51/85/86), float precision (1-decimal STP rate), month-end (Feb non-leap / Feb leap / December year roll), and `resolveDateRange` fallback when query strings are absent or invalid.

### §10e.5 Frontend filter state

`DashboardPage` keeps three local pieces of state — `entityId`, `preset` (`this_month` | `last_month` | `last_3_months` | `custom`), and `customFrom` / `customTo`. The active filter object is memoised and passed through to `useDashboardKpis(filters)` and `useDashboardCharts(filters)` so changing the entity or range refetches both endpoints. The refresh button calls `queryClient.invalidateQueries(['dashboard', ...])`.

---

## §11 Pending work

### Wire remaining masters through the workflow engine

Currently routed through the engine via `MasterListScreen.workflowModule`:
- Departments, GL Codes, Cost Centres, Tax Codes, Designations, Locations.

Not yet wired (still flip status directly):
- Vendors, Employees, Items, Users, Budget, Entity, Financial Year, Currency, TDS Sections, Profit Centres, Item Categories, Vendor Categories/Groups, FX Rates, Countries/States/Cities, Tax Regimes.

Each bespoke form page needs its "Submit for approval" button to call `POST /api/workflow/start` with the right `module` code (e.g. `VENDOR`, `EMPLOYEE`).

### Workflow form condition templates

`CONDITION_FIELDS` in `WorkflowDefinitionFormPage` only has templates for INVOICE / VENDOR / PAYMENT / PR / PO. New master modules currently fall back to the default field list. Add per-master condition fields where useful (e.g. DEPARTMENT → `name`, `parentId`).

### Auto-refresh on 401

`/auth/me` lives 15 min. The frontend `http` client doesn't currently catch 401 and silently call `/auth/refresh` — users hit a hard-401 if they leave a tab idle. Either add a TanStack Query global error handler that retries once after `/auth/refresh`, or wrap `http` itself.

### Payments batch flow

`PaymentListPage` + `PaymentDetailPage` exist; the actual batch-creation flow (select invoices → propose batch → submit → bank export) is not wired. `Payment` model exists in schema.

### Dashboard mocks

`/api/dashboard` returns real Prisma aggregates for KPIs and spend trend; verify per-tenant scoping and add filters (date range, entity) once business signs off on the metrics.

### KYC flow polish

PAN / GSTIN / IFSC verification via SurePass + OnGrid works on the vendor form; `KycBadge` chips render on detail pages. Bank-account verification via TransBnk webhook lands at `/webhooks/transbnk` — flow exists but UI feedback is minimal.

---

## §12 Dev commands

```bash
npm run dev          # frontend :3000 + backend :8787
npm run dev:clean    # kill ports + restart (use after env changes / poller state resets)
npm run typecheck    # 0 errors required
npm run lint         # 0 warnings on new code
npm run lint:forms   # enforces forwardRef on all native form components
npm run test         # Vitest
npm run test:e2e     # Playwright
npm run db:push      # Prisma db push (dev only — no migrations dir)
npm run db:seed      # seed demo tenant, users, masters
npm run db:studio    # Prisma Studio
```

Demo login (dev only) — `mithilesh@procinix.ai` / `Demo@123`. SUPER_ADMIN role.

---

## §13 Conventions

- **Commit messages** — describe the *what* + *why*. When a working tree contains multiple semantic changes, the message must cover all of them (don't under-describe). The user has explicitly asked for "accurate (everything in one)" messages over partial ones.
- **Comments** — default to none. Add only when the *why* is non-obvious (workaround, invariant, surprising decision). Never narrate *what* the code does.
- **Documentation files** — never create new top-level docs unless the user asks. Update this file when structure changes.
- **Pre-commit hooks** — Husky + lint-staged run typecheck on staged files; never skip with `--no-verify` unless the user explicitly asks.
