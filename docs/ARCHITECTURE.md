# Procinix v2 (S2P) — Architecture

_Last updated: 2026-05-19 (workflow engine audit — definition selection, approver resolution, auto-advance, PR/PO transitions)_

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

sql/mysql/                              # Legacy v1 SQL — reference only, NOT applied
  README.md                             # Explains why this dir is preserved but unused
  migrations/                           # Historical discovery-era migrations

vitest.config.ts                        # Frontend + backend pure-function specs
```

**Fresh database provisioning** — schema.prisma is the single source of truth.
A clean clone gets a working DB with two commands:

```bash
npm run db:push     # apply schema.prisma to MySQL via Prisma (creates all 74 tables)
npm run db:seed     # demo tenant + masters + workflow definitions
```

The legacy `sql/mysql/init.sql` was removed (2026-05-19) — it had drifted to
cover only ~31 of the live 74 tables. The `migrations/` subdirectory is kept
as a historical reference for early v1 discovery work but is not applied by
any current script. See [sql/mysql/README.md](../sql/mysql/README.md).

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

1. Query all definitions for `(tenantId, module, status='ACTIVE')`, sorted by `priority desc`. Filter is on `status` only — the legacy `isActive` boolean is no longer consulted (CLAUDE.md mandate).
2. Skip definitions where `entityId` / `departmentId` is set and doesn't match the record.
3. First definition whose conditions all evaluate true (AND-group all true AND OR-group at least one true) wins.
4. Else fall back to the first `isDefault` definition with no entity/department scope.
5. Else return null → `startWorkflow` returns `err({ message: 'NO_WORKFLOW_DEFINED' })` and callers (invoice/PR/PO submit) flip the document to `SUBMITTED` with no instance. **No orphan IN_PROGRESS instance is ever created.**

A pure helper `selectDefinitionFromList(defs, entityId, departmentId, record)` is exported alongside for unit testing — see [workflow-engine.test.ts](../server/src/services/__tests__/workflow-engine.test.ts).

### §7.5 Approver resolution (`resolveApprover`)

Resolution is multi-source so a partially-seeded tenant doesn't strand workflows on `assignedTo: null`.

- `USER` — the configured `approverUserId`, verified to be `tenantId == ctx.tenantId` and `isActive`.
- `ROLE` — tries in order:
  1. `User(role = stage.approverRole, isActive, [departmentId])` — the legacy single-role field on the user record.
  2. `UserEntityRole(roleCode = stage.approverRole, isActive, user.tenantId)` — the canonical per-entity RBAC table. Department scope honoured when set on the record.
  3. Fallback: first `User(role='SUPER_ADMIN', isActive)` in the tenant. SUPER_ADMIN bypasses RBAC anyway, so they're a legitimate approver for any otherwise-unassigned stage; this preserves business-flow continuity in dev / partially-seeded tenants instead of leaving the Approval Desk empty.
- `MANAGER_OF` — looks up the **requester's** employee row (via `record.createdByUserId` → user → employeeId, then `email` fallback) and returns `Employee.managerId`. The previous version returned the first employee in the tenant — that bug is fixed.
- `DEPT_HEAD` — first active `User(role='DEPT_HEAD', departmentId = record.departmentId)`, with `UserEntityRole(roleCode='DEPT_HEAD')` fallback.

When a stage's PENDING current stage cannot be assigned to anyone (every source returned null), the engine `console.warn`s with `{ tenantId, instanceId, stageOrder, stageName, approverType, approverRole }` so operators can diagnose the missing-role config. The stage is still created (PENDING with `assignedTo: null`) — SUPER_ADMIN can advance it via the workflow detail page.

### §7.5a Auto-approval & advancement (`computeAutoAdvance`)

When a stage has `autoApproveBelow` set, `startWorkflow` walks consecutive stages from order 1 and auto-approves each one whose threshold exceeds the record amount. The walk stops at the first non-eligible stage, which becomes the new `currentStageOrder`. If every stage auto-approves, the instance is created with `status: 'APPROVED'` and the calling document is flipped to `APPROVED` in the same `startWorkflow` call (caller's `wfResult.data.autoApproved === true`).

The walk is sequential — it does **not** skip a non-eligible middle stage. Pure helper `computeAutoAdvance(stages, amount)` is exported for unit testing (covers all-auto / partial / boundary / sort-order edge cases). The previous behaviour set stage 1 to `AUTO_APPROVED` without advancing `currentStageOrder` — workflow stuck with no PENDING stage to approve. Fixed.

### §7.6 Masters wired through the engine

All master forms now follow the unified **DRAFT → PENDING_APPROVAL → ACTIVE**
lifecycle. Submit-for-approval kicks off a workflow instance via
[startWorkflow](../server/src/services/workflow-engine.service.ts); the
listing page shows a `Pending approval` chip until an approver lands the
record. `NO_WORKFLOW_DEFINED` still flips status (so the record leaves
DRAFT) but creates no instance — TENANT_ADMIN can hand-flip from the list.

The shared pure helpers live in [master-submit.service.ts](../server/src/services/master-submit.service.ts):

- `validateMasterSubmittable(label, status)` — DRAFT/REJECTED only;
  everything else is 422.
- `resolveMasterStatusAfterSubmit({ ok, autoApproved, noWorkflowDefined })`
  — auto-approved → `ACTIVE`, otherwise `PENDING_APPROVAL`.
- `resolveMasterStatusAfterReject(mode)` — `REQUEST_INFO` →
  `PENDING_APPROVAL`, else `DRAFT`.
- `ENTITY_TO_WF_MODULE` — single source of truth mapping entityType →
  WfModule. Adding a new master is one entry + a row in workflow.ts's
  `MASTER_ENTITY_DELEGATES` map (final-flip semantics).

**In-scope masters wired with full DRAFT → PENDING_APPROVAL → ACTIVE flow:**

| Master                | Frontend                                                                                         | Backend submit endpoint                         | WfModule          |
| --------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------- | ----------------- |
| Vendor                | [VendorFormPage](../src/pages/masters/vendors/VendorFormPage.tsx) (submitModeRef + 2 buttons)    | `POST /api/masters/vendors/:id/submit`          | `VENDOR`          |
| Employee              | [EmployeeFormPage](../src/pages/masters/EmployeeFormPage.tsx) (existing `submitForApproval` flag) | Generic loop in [masters.ts](../server/src/routes/masters.ts) | `EMPLOYEE`        |
| User                  | [UserFormPage](../src/pages/masters/users/UserFormPage.tsx) (submitModeRef + 2 buttons)          | `POST /api/admin/users/:id/submit`              | `USER`            |
| Budget                | [BudgetFormPage](../src/pages/masters/budget/BudgetFormPage.tsx) (Activate → Submit-for-approval) | `POST /api/budgets/:id/submit`                  | `BUDGET`          |
| Financial Year        | [FinancialYearsPage](../src/pages/masters/FinancialYearsPage.tsx) (inline modal + FormFooter)    | `POST /api/masters/financial-years/:id/submit`  | `FINANCIAL_YEAR`  |
| Currency              | [CurrencyMasterPage](../src/pages/masters/CurrencyMasterPage.tsx) (inline modal + FormFooter)    | `POST /api/masters/currencies/:id/submit`       | `CURRENCY`        |
| Profit Centre         | [ProfitCentrePage](../src/pages/masters/ProfitCentrePage.tsx) (inline modal + FormFooter)        | `POST /api/masters/profit-centres/:id/submit`   | `PROFIT_CENTRE`   |
| Item Category         | [ItemCategoryPage](../src/pages/masters/items/ItemCategoryPage.tsx) (inline modal + FormFooter)  | `POST /api/masters/item-categories/:id/submit`  | `ITEM_CATEGORY`   |

**Already-wired generic-CRUD masters** (via the loop at [masters.ts:759](../server/src/routes/masters.ts)) —
upgraded so `submitMasterRecord` calls the workflow engine, not just a status
flip: Departments, GL Codes, Cost Centres, Tax Codes, Designations, Entities,
Locations, Tax Regimes, Workflow Rules, Employees.

**Schema deltas to support the flow:**
- `VendorStatus` enum gained `DRAFT` + `REJECTED` values (existing rows
  preserved — non-breaking).
- `User` model gained `status String @default("ACTIVE")` field plus
  `@@index([tenantId, status])`. `User.isActive` is still the live auth
  gate; `status` drives workflow visibility on the Approval Desk.

**Forward-only:** existing seeded ACTIVE records stay ACTIVE. The DRAFT
default kicks in only on new creates.

### §7.7 Engine-driven UI

| Page                                              | Path                                          | Role                                                  |
| ------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------- |
| `WorkflowHubPage`                                 | `/workflow`                                   | Engine entry — pending approvals, quick links, +New   |
| `WorkflowDefinitionsPage`                         | `/workflow/definitions`                       | List + status tabs + module pills                     |
| `WorkflowDefinitionFormPage`                      | `/workflow/definitions/new`, `/.../:id`       | 22-module dropdown; stages + conditions builder; JV preview |
| `ApprovalDeskPage`                                | `/approvals`                                  | Cross-module pending-approvals queue                  |

Legacy `/masters/workflow-definitions/*` routes are still registered for backwards compat — they render the same components.

### §7.8 Cross-module document transitions

`POST /api/workflow/instances/:id/approve` and `/reject` route based on `WorkflowInstance.entityType`:

| `entityType`              | Approve (non-final)       | Approve (final)              | Reject `RETURN_TO_DRAFT` | Reject `RETURN_TO_PREV_STAGE`           | Reject `REQUEST_INFO`                  |
| ------------------------- | ------------------------- | ---------------------------- | ------------------------- | --------------------------------------- | -------------------------------------- |
| `invoice`                 | `PENDING_L<next>`         | `APPROVED` (+ PO link flip)  | `REJECTED` + rejectionReason | `PENDING_L<prev>`                        | `PENDING_L<current>` + INFO_REQUESTED chat |
| `purchase_requisition`    | `PENDING_L<next>`         | `APPROVED`                   | `REJECTED` + rejectionReason | `PENDING_L<max(1, current-1)>`           | `PENDING_L<current>`                       |
| `purchase_order`          | `PENDING_L<next>`         | `APPROVED`                   | `REJECTED` + rejectionReason | `PENDING_L<max(1, current-1)>`           | `PENDING_L<current>`                       |
| `item`                    | (single stage; no non-final transition) | `ACTIVE`        | `DRAFT`                       | `DRAFT` (single-stage collapses to DRAFT) | `PENDING_APPROVAL` (held while chat resolves) |
| `vendor`, `employee`, `user`, `budget`, `financial_year`, `currency`, `profit_centre`, `item_category` | (single stage; no non-final transition) | `ACTIVE` (+`isActive=true` where applicable) | `DRAFT` (+`isActive=false`) | `DRAFT` (single-stage collapses) | `PENDING_APPROVAL` |
| `department`, `gl_code`, `cost_centre`, `tax_code`, `designation`, `entity`, `location`, `tax_regime`, `workflow_rule` | (single stage; no non-final transition) | `ACTIVE` (+`isActive=true`) | `DRAFT` (+`isActive=false`) | `DRAFT` | `PENDING_APPROVAL` |

PR/PO transitions were previously missing — only invoices got their document status updated on workflow advance/reject. Fixed in the audit; PR and PO submissions now go through the same engine pathway as invoices and reflect stage progression on the document. Item master added with the same pattern — see §7.9b. Every other master (8 in-scope + 9 generic-CRUD) now follows the same flow via `MASTER_ENTITY_DELEGATES` in [workflow.ts](../server/src/routes/workflow.ts) — see §7.6.

### §7.9 Submit guards

`POST /api/invoices/:id/submit`, `POST /api/pr/:id/submit`, `POST /api/po/:id/submit`, and `POST /api/masters/items/:id/submit` all enforce `status ∈ {DRAFT, REJECTED}` server-side before calling `startWorkflow`. Re-submitting an already-submitted document returns `400 WORKFLOW_INVALID_STATE` — prevents stacking workflow instances. The standard rejection loop sets the document to `REJECTED` (transactional documents) or `DRAFT` (item masters), re-enabling resubmission.

### §7.9b Item master approval flow

Items go through the same engine pattern as invoices/PR/PO, but the workflow definition (`WF-ITEM-001` seeded in [prisma/seed.ts](../prisma/seed.ts)) is single-stage with a `TENANT_ADMIN` approver. Lifecycle:

1. **Create** — `POST /api/masters/items` now defaults new items to `status: DRAFT` (was `ACTIVE`). An explicit `status` in the body is honoured for seeding / admin paths.
2. **Submit** — `POST /api/masters/items/:id/submit` checks the guard (DRAFT/REJECTED only), calls `startWorkflow('ITEM', 'item', id, {})`, then flips the item to `PENDING_APPROVAL` (or `ACTIVE` if every stage auto-approved). On `NO_WORKFLOW_DEFINED` the item still flips to `PENDING_APPROVAL` so it visibly leaves DRAFT — a TENANT_ADMIN can manually approve later.
3. **Approve / Reject** — handled by the standard workflow routes via the `entityType === 'item'` branch in [server/src/routes/workflow.ts](../server/src/routes/workflow.ts). Final approval → `ACTIVE`. Any reject mode (RETURN_TO_DRAFT or RETURN_TO_PREV_STAGE) collapses to `DRAFT` since the workflow is single-stage. `REQUEST_INFO` keeps the item in `PENDING_APPROVAL`.
4. **Approval Desk** — `GET /api/invoices/pending-approvals` joins `itemMaster` records into the cross-module queue with `module: 'ITEM'` so item approvals show alongside invoices/PRs/POs.

Pure helpers in [server/src/services/item-submit.service.ts](../server/src/services/item-submit.service.ts) — `validateItemSubmittable`, `resolveItemStatusAfterSubmit`, `resolveItemStatusAfterReject` — are covered by 13 Vitest specs at [item-submit.test.ts](../server/src/services/__tests__/item-submit.test.ts).

**Frontend** — [ItemFormPage.tsx](../src/pages/masters/items/ItemFormPage.tsx) routes the FormFooter's two buttons through distinct paths. `Save as draft` does just the POST/PUT. `Submit for approval` does POST/PUT and then `POST /api/masters/items/:id/submit`. A ref tracks which button was clicked so the wrapped RHF `handleSubmit` can branch without duplicating the handler.

The 8 bespoke masters (Vendor, Employee, User, Budget, Financial Year, Currency, Profit Centre, Item Category) now follow the same pattern — see §7.6 for the full per-master breakdown. Shared pure helpers live in [master-submit.service.ts](../server/src/services/master-submit.service.ts).

### §7.9c Item master change request flow (material edits on ACTIVE items)

ACTIVE items can't have material fields mutated directly. Editing `gstRate`, `tdsSectionId`, `hsnCode`, `sacCode`, or any of the provision fields (`provisionRequired`, `provisionAmount`, `provisionFrequency`, `provisionBasis`) creates a workflow-gated change request. The live item stays ACTIVE and unchanged until the request is approved. Non-material edits (description, OCR keywords, RCM toggle, advance flag) save directly via the existing PUT route.

**Data model** — [prisma/schema.prisma](../prisma/schema.prisma) `ItemMasterChangeRequest`:

```
id, tenantId, itemId, changedFields Json, status,
workflowInstanceId?, createdBy, createdAt,
reviewedBy?, reviewedAt?, reviewComments?
```

`changedFields` holds `{ before, after, fields[] }` — both pre/post values for diff display and the field list for quick filtering. Only one PENDING_APPROVAL request per item at a time (enforced by the route guard, not a DB constraint, so REJECTED/APPROVED rows remain as history).

**Routes** — all in [server/src/routes/masters.ts](../server/src/routes/masters.ts):

| Method | Path                                       | Purpose                                                                 |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| POST   | `/api/masters/items/:id/request-change`    | Detect material diff, persist a PENDING_APPROVAL request, start `WF-ITEM-CHANGE`. 422 if item not ACTIVE / no material change / pending request already exists. |
| GET    | `/api/masters/items/:id/pending-change`    | The current pending request for an item, or `null`.                     |
| GET    | `/api/masters/items`                       | Augments every list row with `hasPendingChange: boolean` for the listing's "CHANGE PENDING" badge. |

**Workflow approve/reject** — [server/src/routes/workflow.ts](../server/src/routes/workflow.ts) adds an `entityType === 'item_change'` branch:

- **Final approve** → load the change request, run `applyChangeDiff(after)` to extract only material fields from the persisted payload, and apply them to the live item inside a transaction. Mark the request `APPROVED` with reviewer + timestamp.
- **Reject (RETURN_TO_DRAFT / RETURN_TO_PREV_STAGE)** → mark the request `REJECTED`. The live item is untouched.
- **REQUEST_INFO** → leave the request `PENDING_APPROVAL` while the chat thread resolves.

**Pure helpers** ([server/src/services/item-change.service.ts](../server/src/services/item-change.service.ts)) covered by 19 Vitest specs at [item-change.test.ts](../server/src/services/__tests__/item-change.test.ts):

- `MATERIAL_FIELDS` — the policy-pinned list of fields that require approval. Changing the list is a deliberate decision; one spec locks it.
- `detectMaterialChange(old, new)` — returns `{ hasMaterialChange, fields[], before, after }`. Normalises Decimal-as-string vs Decimal-as-number drift (only for numeric fields like `gstRate`, `provisionAmount` — HSN/SAC codes stay strings to preserve leading zeros). Treats `null`/`undefined`/`""` as the same "absent" value so empty-input forms don't register false diffs.
- `validateChangeRequest(status, diff, hasPendingChange)` — gate logic surfaced as a structured error (`ITEM_NOT_ACTIVE` / `NO_MATERIAL_CHANGE` / `PENDING_CHANGE_EXISTS`).
- `applyChangeDiff(after)` — defensive: strips any non-material keys that snuck into the payload before applying to the item, so a manually-crafted JSON can't override fields the policy excludes.

**Frontend** — [ItemFormPage.tsx](../src/pages/masters/items/ItemFormPage.tsx) detects material change locally (best-effort, backend is authoritative). For an ACTIVE item with a material edit, the save path calls `POST /request-change` instead of `PUT`. An amber banner above the form shows when a pending change exists (loaded via `pending-change` query) or when one was just submitted (in-form state). [ItemMasterPage.tsx](../src/pages/masters/items/ItemMasterPage.tsx) adds a `CHANGE PENDING` chip next to PROV/CAPEX flags in the listing when `hasPendingChange === true`.

**Existing data** — Seeded items remain `ACTIVE`. The flow only applies to material edits on those items going forward. The 30 seed items were created before the DRAFT default was introduced; retroactively flipping them was deliberately avoided so an admin run doesn't suddenly fill the Approval Desk.

**Seed** — `WF-ITEM-CHANGE` workflow definition added to [prisma/seed.ts](../prisma/seed.ts) (TENANT_ADMIN approver, priority 10). Wired via `module: 'ITEM_CHANGE'`.

### §7.10 Cross-module pending-approvals queue

`GET /api/invoices/pending-approvals` (despite the path, it's cross-module) returns every `WorkflowInstanceStage` with `assignedTo = currentUser, status = 'PENDING'` enriched with the underlying document. Each row carries a `module` tag (`INVOICE` / `PR` / `PO`) plus uniform `invoiceNumber` / `totalAmount` / `currencyCode` fields parallel to the invoice shape so the Approval Desk renders all three without per-module column logic. Previously the endpoint silently filtered to invoices only — PR and PO approvers saw "All caught up!" while their work queue grew.

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

An earlier wizard experiment (`InvoiceTypeSelector.tsx` / `InvoiceCreatePO.tsx` / `InvoiceCreateDirect.tsx`) was deleted in commit 2026-05-19 — those files no longer exist on disk.

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

## §10f Gemini OCR — dual-model routing + error surfacing

The OCR call ([gemini-ocr.service.ts](../server/src/services/gemini-ocr.service.ts)) picks one of two models per call:

| Input | Model | Why |
| --- | --- | --- |
| Image (`image/jpeg` / `image/png` / `image/webp`) | `gemini-2.5-pro` | Pro is significantly better at handwriting. Phone-camera shots of paper invoices land here. |
| PDF with raw size > 500 KB | `gemini-2.5-pro` | Big PDFs are usually scans (no text layer); pro again. |
| PDF with raw size ≤ 500 KB | `gemini-2.5-flash` | Small PDFs are typically born-digital with clean text — flash is ~3× faster and ~10× cheaper. |

Raw-byte size is estimated from the base64 string length (`base64.length × 0.75`) so the caller doesn't have to ship the file size separately. The routing decision is **always input-driven** — there's deliberately no single `GEMINI_MODEL` env knob, since pinning everything to one model defeats the purpose. Individual model ids are overridable via `GEMINI_MODEL_FLASH` / `GEMINI_MODEL_PRO` if you need a preview build or a specific pinned version.

Pure picker: `pickModelForOcr(mimeType, base64Length)` — no I/O, covered by 7 Vitest specs at [gemini-ocr.test.ts](../server/src/services/__tests__/gemini-ocr.test.ts).

**Prompt**: the extraction prompt now opens with an explicit handwriting block — common confusions (1/l/I, 0/O, 5/S, 8/B), Indian-style comma thousands separators, multi-format date normalisation, and "return null when illegible, do not guess". This is independent of which model runs; both benefit but pro acts on it more reliably.

**Error path**: every catch in the OCR service `console.error()`s with `{ model, reason, mimeType, bytes, message, stack }`. The route handler forwards the full error object (`{ code, message, detail, details, httpStatus }`) so the frontend can render the actual Gemini message instead of the global handler's generic "An unexpected error occurred". On the form, the OCR error banner shows the detail verbatim with a "Try manual entry instead" link that dismisses OCR state and lets the user type in the form directly. The "OCR extracted · gemini-2.5-pro" tag below the confidence bar makes the routing visible to the operator.

---

## §10g Purchase requisition edit mode

PRs are editable only while in `DRAFT` status. Once submitted (any of `SUBMITTED` / `PENDING_L1` / `APPROVED` / `REJECTED` / `ON_HOLD`), `PRFormPage` switches to a read-only view and the backend rejects mutations with `422 WORKFLOW_INVALID_STATE`. The standard rejection loop returns a PR to `DRAFT`, re-enabling edits.

**Backend** ([server/src/routes/procurement.ts](../server/src/routes/procurement.ts)) — `PUT /api/pr/:id`:

1. Tenant-scoped read (`findFirst` with `tenantId` from JWT) — 404 if missing.
2. `validatePrEditable()` guard — 422 if `status !== 'DRAFT'`.
3. Payload filtered down to `EDITABLE_FIELDS` (`departmentId`, `locationId`, `costCentreId`, `notes`, `narration`, `requestedDeliveryDate`, `lines`, `estimatedTotal`). Anything else is silently dropped — `prRef`, `requesterId`, `entityId`, `createdAt`, `status` can't be smuggled in.
4. `diffPrFields()` computes the changed-fields list before the transaction.
5. Atomic update: header `update()` + `purchaseRequisitionLine.deleteMany() → createMany()`. `estimatedTotal` recomputed from the new lines via `calcEstimatedTotal()`.
6. Append-only audit log entry `{ action: 'pr.edited', after: { changedFields, userName } }`. Log failures warn but don't fail the request.

Pure helpers ([server/src/services/pr-edit.service.ts](../server/src/services/pr-edit.service.ts)) covered by 14 Vitest specs at [pr-edit.test.ts](../server/src/services/__tests__/pr-edit.test.ts) — DRAFT-only enforcement across every non-DRAFT status, field-level diff with date normalisation, line-collapse to single entry, total recomputation including string-number coercion.

**Frontend** ([src/pages/purchase-orders/PRFormPage.tsx](../src/pages/purchase-orders/PRFormPage.tsx)): when `isEdit && existing.status !== 'DRAFT'`, the page wraps the form in `<fieldset disabled>`, hides the Save Draft + Submit buttons, swaps the title to "PR-XXXX" (no "Edit" prefix), shows an amber lock banner explaining the status, and changes Cancel → Back.

---

## §11 Accounting — provisioning, amortization & ERP push

End-to-end GL workflow that runs alongside the AP flow. When an invoice is
approved, the trigger writes the right journal entries; at month-end a job
posts provisions + amortizations; an ERP-push adapter syncs the JVs to an
external GL system (stub for now).

### Schema additions

Three models, all tenant-scoped:

- `JournalEntry` — the canonical record of every GL impact.
  Status lifecycle: `POSTED → REVERSED` (paired reversal executed) /
  `NULLIFIED` (invoice nullified the open provision) /
  `SKIP_REVERSAL` (paired reversal that was short-circuited).
  ERP lifecycle: `PENDING → SYNCED | FAILED | SKIPPED | MANUAL_OVERRIDE`
  with `retryCount`, `erpRef`, `erpPayload`, `erpResponse`.
  Indexed on `(tenantId, period)`, `(tenantId, erpStatus)`,
  `(tenantId, invoiceId)`, `(tenantId, entryType)`,
  `(tenantId, provisionScheduleId)`, `(tenantId, amortizationScheduleId)`.

- `ProvisionSchedule` — recurring provision rule per (item, vendor).
  Frequency `MONTHLY | QUARTERLY`, basis `FIXED_AMOUNT | PERCENTAGE`,
  status `ACTIVE | PAUSED | CLOSED`. Tracks `lastRunDate` and `nextRunDate`
  so the month-end job knows when to fire.

- `AmortizationSchedule` — prepaid-expense recognition over a multi-month
  period. Created on invoice approval when `period_to - period_from > 1
  month`. Status `ACTIVE | COMPLETED | CANCELLED`. Basis
  `STRAIGHT_LINE | DAY_APPORTIONED`.

GL codes are stored as `code` strings on JournalEntry (not FKs) so the JV
survives a future GL code rename/delete. Resolution at trigger time falls
back: `line.glCodeId → itemEntityMapping.expenseGlCodeId → invoice.glCodeId
→ '5080' (Misc)`. Prepaid GL resolves to tenant GL named `/prepaid/i` else
`'1060'`; AP GL resolves to `accountType=LIABILITY` named `/payable/i` else
`'2030'`.

### Engine flow

**Pure helpers** (no Prisma, fully Vitest-covered):

- [server/src/services/provision-engine.service.ts](../server/src/services/provision-engine.service.ts)
  - `computeNextRunDate(lastRun, frequency)` → MONTHLY = end of next month;
    QUARTERLY = end of next quarter.
  - `isProvisionDue(schedule, forDate)` — true iff `nextRunDate <= forDate
    && status === 'ACTIVE'`; null `nextRunDate` is treated as immediate.
  - `buildProvisionJV(schedule, forDate, createdBy, { itemName? })` — DR
    expense, CR provision. Narration `"{item} — {Mon Year} provision"`.
  - `buildReversalJV(originalJV, reversalDate, createdBy)` — DR/CR swap,
    `postingDate = 1st of month after original.postingDate`,
    `reversalOfId = original.id`, `entryType = PROVISION_REVERSAL`.
  - `buildNullificationJV(originalJV, invoiceId, invoiceDate, createdBy)` —
    DR/CR swap, posted on invoice date, `nullifiedByInvoiceId = invoiceId`.
  - `shouldSkipReversal(jv)` — true when original PROVISION is NULLIFIED.

- [server/src/services/amortization-engine.service.ts](../server/src/services/amortization-engine.service.ts)
  - `computeAmortizationSchedule(total, from, to, basis)` — returns one
    row per calendar month. STRAIGHT_LINE: `total / numberOfMonths`, last
    month gets the rounding remainder. DAY_APPORTIONED: per-month amount
    weighted by `daysInMonth ∩ [from,to] / totalDays`, last month picks up
    the rounding drift to keep the sum exact.
  - `isAmortizationDue(schedule, forMonth, alreadyPosted: Set<string>)` —
    pure check; caller looks up posted months by `amortizationScheduleId`.
  - `buildAmortizationJV` — DR expense, CR prepaid.
  - `buildAccrualJV(invoice, { debitGlCode, creditGlCode }, createdBy)` —
    single ACCRUAL row, full invoice amount, caller decides DR side
    (prepaid for multi-month, expense for single/no period).

- [server/src/services/erp-push.service.ts](../server/src/services/erp-push.service.ts)
  - `pushJournalEntry(prisma, jv, _erpConfig?)` — stub ERP adapter. Logs
    payload, generates `erpRef = ERP/STUB-{jv.id.slice(0,8)}`, flips
    `erpStatus → SYNCED`. Real adapter (Tally/SAP/Zoho/Oracle Fusion) plugs
    in here later with the same `Promise<ErpPushResult>` contract.
  - `retryFailed(prisma, tenantId)` — picks up FAILED JVs with
    `retryCount < 3`, pushes each, returns counts.
  - `pushBulk(prisma, tenantId, ids[])` — manual selection from the
    journal-entries tab.

### Invoice approval trigger

[server/src/services/accounting-trigger.service.ts](../server/src/services/accounting-trigger.service.ts) fires once per
`finalStatus === 'APPROVED'` (wired both into the workflow approve route
and the legacy `approveInvoice()` in invoice.service). Idempotent on
retry — checks for an existing ACCRUAL/AMORTIZATION JV on the invoice
before doing anything.

Three branches:

1. **Multi-month period** (`period_to - period_from > 1 month`):
   - Create `AmortizationSchedule` with split GLs
   - ACCRUAL JV — DR prepaid, CR AP, full invoice amount
   - First-month AMORTIZATION JV if `periodFrom`'s month is the
     current period

2. **Single-month / no period**:
   - ACCRUAL JV — DR expense (line-level), CR AP. No schedule row.

3. **Open provision exists for this item+vendor in the invoice's period**:
   - NULLIFICATION JV (swap DR/CR)
   - Source PROVISION → `status = NULLIFIED`
   - Paired PROVISION_REVERSAL → `status = SKIP_REVERSAL`,
     `reversalSkipped = true`

The trigger is wrapped in `try/catch` at both call sites — accounting
failures log but do **not** block the approval. The user can retry from
the ERP sync log.

### Month-end job

[server/src/jobs/month-end.job.ts](../server/src/jobs/month-end.job.ts).
`runMonthEnd(prisma, ctx, period, { dryRun? })` returns
`MonthEndResult { provisionsPosted, amortizationsPosted,
reversalsExecuted, reversalsSkipped, jvs[] }`.

Step 1 — Provisions:
- For every `ProvisionSchedule` with `status=ACTIVE` and
  `nextRunDate <= periodEnd`:
  - Skip if any APPROVED invoice exists for the same item (+ vendor if
    bound) with `invoiceDate` in `[periodStart..periodEnd]`. The invoice
    trigger has already nullified the open provision; posting a new one
    would double-count.
  - Otherwise: post PROVISION JV on `periodEnd`, post paired
    PROVISION_REVERSAL with `postingDate = 1st of next month`, set
    `reversalJvId` on the source, advance `lastRunDate / nextRunDate`.

Step 2 — Amortizations:
- For every `AmortizationSchedule` with `status=ACTIVE`:
  - Query already-posted months for this schedule.
  - For each row in the canonical split that is due (`row.month <= period`)
    and not yet posted, write the AMORTIZATION JV.
  - If all months are posted after the run, close the schedule
    (`status = COMPLETED`).

Step 3 — Execute scheduled reversals:
- Find PROVISION_REVERSAL JVs with `postingDate <= periodEnd` and
  `status='POSTED'` that haven't been actioned (`period` in
  `[prev, current]`).
- If source PROVISION is NULLIFIED → mark this reversal SKIP_REVERSAL.
- Otherwise → mark source REVERSED.

Preview mode (`dryRun: true`) returns the same `jvs[]` payload with
`(preview)` ids without writing anything.

### Accounting routes

[server/src/routes/accounting.ts](../server/src/routes/accounting.ts) — mounted at `/api/accounting`. All
endpoints tenant-scoped via JWT.

- `GET  /dashboard` — KPIs for the Overview tab
- `GET  /journal-entries?period&entryType&erpStatus&invoiceId&scheduleId&take&cursor` — paginated
- `POST /journal-entries/:id/push-erp` · `POST /journal-entries/push-erp-bulk`
- `POST /journal-entries/:id/retry` · `POST /journal-entries/retry-all-failed`
- `GET  /provision-schedules` · `PATCH /provision-schedules/:id` (pause/resume/close)
- `GET  /amortization-schedules?invoiceId=...` · `GET /amortization-schedules/:id/timeline`
- `POST /month-end` (TENANT_ADMIN) · `POST /month-end/preview`

### Frontend

- [src/pages/accounting/AccountingPage.tsx](../src/pages/accounting/AccountingPage.tsx) — 6 tabs (Overview /
  Journal entries / Provision schedules / Amortization schedules /
  Month-end close / ERP sync log).
- [src/pages/accounting/AmortizationDetailPage.tsx](../src/pages/accounting/AmortizationDetailPage.tsx) — drill-down at
  `/accounting/amortization/:id`. Vertical timeline: green dot = posted,
  amber pulsing clock = due this month, gray circle = future.
- [src/pages/invoices/InvoiceDetailPage.tsx](../src/pages/invoices/InvoiceDetailPage.tsx) Section E surfaces an
  amortization mini-card with `View full schedule →` to the drill-down
  (only renders when a schedule exists for the invoice).
- Nav entry: between Payments and Vendors in
  [AppShell](../src/components/layout/AppShell.tsx).
- [src/lib/api/accounting.api.ts](../src/lib/api/accounting.api.ts) — typed http wrappers; everything
  goes through TanStack Query in the page.

### ERP adapter pattern (future)

`pushJournalEntry()` is the boundary. To wire a real ERP:

1. Add a new adapter module (e.g. `erp-tally.service.ts`) exporting an
   `async push(jv, config)` returning the same `ErpPushResult` shape.
2. Dispatch by `tenantSettings.erpSystem` inside
   `erp-push.service.ts::pushJournalEntry()`. The DB update logic stays
   the same so retry/audit semantics are preserved.
3. Persist auth credentials in `tenantSettings.erpAuthCredentials` (already
   on the schema) — read via `app.config` so secrets never appear in
   query results.

---

## §12 Payment module — batches, MSME compliance, TDS challans

End-to-end vendor-payment flow. Sits downstream of invoice approval:
approved invoices land in the payment queue, get bundled into a
PaymentBatch, approve through the workflow engine, then execute (which
captures UTR/cheque refs, posts JVs, and upserts TDS challans).

### Schema additions

- `PaymentBatch` — the parent document approvers sign off on. Lifecycle:
  `DRAFT → PENDING_APPROVAL → APPROVED → EXECUTED | PARTIALLY_EXECUTED | FAILED`.
  Stores `containsMsme + msmeVendorCount` (denormalised for listing) and
  `isUrgent + urgentReason + urgentFlaggedBy` (routes through the
  fast-track workflow). Indexed on `(tenantId, status)`,
  `(tenantId, isUrgent, status)`.
- `PaymentBatchLine` — one row per invoice/advance. Captures the chosen
  rail (NEFT/RTGS/IMPS/CHEQUE), the actual remitted amount (may differ
  from invoice.netPayable for partial payments), UTR/cheque ref at
  execution, and denormalised MSME flags so detail pages render without
  a vendor join per row.
- `TdsChallan` — `(tenant, period, section)` unique. Aggregates withheld
  TDS for the period. Status `PENDING → DEPOSITED` (with challanNumber
  + depositedAt). Past-due PENDING surfaces as effective `OVERDUE` in
  the API response (recomputed, not stored).
- `Invoice` extensions: `paidAmount`, `paymentStatus`
  (UNPAID/PARTIALLY_PAID/PAID), `msmePaymentDue`, `msmeDaysRemaining`,
  `msmeBreach`, `msmeInterest`, `isUrgent`, `urgentReason`.
- `Vendor` extension: `msmeRegistered Boolean` — auto-derived in
  `vendor.service.ts` from whether `msmeCategory` is set, so the flag
  and the category stay in lockstep. Existing `udyamNumber` carries the
  registration number; existing `msmeCategory` (MICRO/SMALL/MEDIUM) is
  reused.

### Pure helpers

[payment-engine.service.ts](../server/src/services/payment-engine.service.ts):

- `computeMsmePaymentDue(invoiceDate, vendorCreditDays)` — `min(45,
  creditDays)` days from invoice date. Caps at 45 per MSMED Act §15.
- `computeMsmeDaysRemaining(due, today)` — whole-day delta (negative = overdue).
- `getMsmePriority(days)` — `CRITICAL <7d | AT_RISK 7-14d | NORMAL ≥15d`.
- `computeInterest(amount, daysLate, rbiRate)` — MSMED §16 interest
  (3× bank rate, simple, prorated daily). Defaults to RBI bank rate
  6.5% in the routes (constant for now; can move to tenant settings).
- `buildPaymentJVs(line, glCodes, createdBy, opts)` — returns 1-2 JVs:
  cash leg (DR AP, CR Bank, amount = paymentAmount) + TDS leg
  (DR AP, CR TDS Payable, amount = tdsAmount, only when withheld).
- `generateBatchRef(seq, year)` → `PAY-YYYY-NNNN`.
- `computeBatchTotals(lines)` — sum across line shape for header.

[tds-challan.service.ts](../server/src/services/tds-challan.service.ts):

- `computeChallanDueDate(period)` — 7th of `period+1`, with Dec→Jan
  year-roll.
- `groupLinesByTdsSection(lines)` — sums tdsAmount by section, sorts by
  section code, rounds float-safely.
- `upsertChallans(prisma, tenantId, period, groups)` — additive: a
  PENDING challan for (tenant, period, section) gets the new amount
  incremented onto it; once DEPOSITED, the row is locked and further
  withholding creates a new challan.

36 Vitest specs in [payment-engine.test.ts](../server/src/services/__tests__/payment-engine.test.ts)
+ [tds-challan.test.ts](../server/src/services/__tests__/tds-challan.test.ts).

### Routes

[server/src/routes/payments.ts](../server/src/routes/payments.ts), mounted at `/api/payments`. All tenant-scoped via JWT.

| Method | Path                                          | Notes                                                |
| ------ | --------------------------------------------- | ---------------------------------------------------- |
| GET    | `/queue`                                       | Combined invoice + advance queue, MSME-enriched      |
| GET    | `/queue/summary`                               | Tab badges: total / urgent / msmeAtRisk / overdue / dueThisWeek / advances |
| GET    | `/batches`                                     | Paginated batch list, status + MSME + urgent filters |
| POST   | `/batches`                                     | Create batch from invoice/advance ids; derives MSME flags |
| GET    | `/batches/:id`                                 | Batch detail with enriched lines (vendor + invoice)  |
| POST   | `/batches/:id/submit`                          | Guard DRAFT → workflow start (WF-PAYMENT-001 or URGENT) |
| POST   | `/batches/:id/execute`                         | Capture UTRs, post JVs, upsert TDS challans, ERP push |
| POST   | `/batches/:id/flag-urgent`                     | Sets isUrgent + reason; later submits hit URGENT workflow |
| GET    | `/tds-challans`                                | List with `effectiveStatus` (recomputed OVERDUE)     |
| PATCH  | `/tds-challans/:id/mark-deposited`             | Capture challan number when deposited at bank        |
| POST   | `/msme-refresh`                                | Recompute msmeDaysRemaining + breach + interest      |

GL resolution for payment JVs mirrors the AP-priority resolver in
[accounting-trigger.service.ts](../server/src/services/accounting-trigger.service.ts) — exact name → 203x code range
→ fuzzy → fallback for AP; `name contains "Bank"` for the cash leg;
`name contains <section>` for the TDS leg (e.g. 194C → "TDS Payable —
194C"). Falls back to `'2030' / '1002' / undefined` if nothing matches.

### Workflow integration

Two workflow definitions seeded in [prisma/seed.ts](../prisma/seed.ts):

- `WF-PAYMENT-001` (priority 15) — Finance Manager, 48h SLA. Default
  for non-urgent batches.
- `WF-PAYMENT-URGENT` (priority 25) — Finance Manager, 4h SLA, with a
  workflow condition `isUrgent equals true`. Selected when the batch
  carries the urgent flag at submit time (the `record` payload passed
  into `startWorkflow` includes `isUrgent` so the engine's condition
  evaluator picks the right one).

The original `WF-PAY-001` (priority 10, TENANT_ADMIN) stays as a
catch-all fallback for tenants without Finance Manager users seeded.

`payment_batch` gets its own approve/reject branch in [workflow.ts](../server/src/routes/workflow.ts) —
not via `MASTER_ENTITY_DELEGATES` because APPROVED isn't terminal for
batches (execute is the next step). Approve flips status to APPROVED;
reject (non REQUEST_INFO) collapses back to DRAFT.

`pending-approvals` cross-module join includes batches with
`module: 'PAYMENT'` and the line count + urgent/MSME flags surfaced in
the row name.

### Execute flow

`POST /batches/:id/execute` is the load-bearing step. For each PAID
line:

1. Mark `PaymentBatchLine.status = PAID`, capture `utrNumber` /
   `chequeNumber` / `paidAt`.
2. **Invoice**: increment `Invoice.paidAmount`, recompute
   `paymentStatus` (PAID if `paidAmount >= netPayable`, else
   PARTIALLY_PAID). On full pay, also flip `Invoice.status = PAID`.
   **Advance**: zero out `pendingAmount`, set `status = PAID`.
3. Resolve GL codes (AP / Bank / TDS-section) → build JV(s) via
   `buildPaymentJVs` → write to `journal_entries` → stub ERP push.
4. After all lines: `groupLinesByTdsSection` → `upsertChallans` for
   the batch's posting-date period. Existing PENDING challans get
   the increment; deposited ones are skipped (lock invariant).
5. Batch status: `EXECUTED` if all paid, `PARTIALLY_EXECUTED` if
   some lines failed, `FAILED` if none paid.

Idempotent on retry — lines already PAID are skipped silently.
Wrapped in try/catch around ERP push so a single ERP timeout doesn't
roll back the cash + JV writes.

### Frontend

| Route                              | Page                                                                                | Role                                                  |
| ---------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `/payments`                         | [PaymentQueuePage](../src/pages/payments/PaymentQueuePage.tsx)                      | Combined queue, 6 priority tabs, multi-select → batch |
| `/payments/batches`                 | [PaymentBatchListPage](../src/pages/payments/PaymentBatchListPage.tsx)              | Batch history with status tabs                        |
| `/payments/batches/new`             | [CreatePaymentBatch](../src/pages/payments/CreatePaymentBatch.tsx)                  | Pre-populated from queue selection; per-line method   |
| `/payments/batches/:id`             | [PaymentBatchDetailPage](../src/pages/payments/PaymentBatchDetailPage.tsx)          | Sections A-D + execute modal (UTR capture)            |
| `/payments/tds-challans`            | [TdsChallanPage](../src/pages/payments/TdsChallanPage.tsx)                          | Period × section list, mark-deposited modal           |

Sub-nav strip ([PaymentNav.tsx](../src/pages/payments/PaymentNav.tsx))
across the queue / batches / TDS pages for discoverability.

Selection from queue → drops a draft into `sessionStorage` and routes
to `/batches/new`; the create page reads it on mount and pre-fills
line rows with `paymentAmount = finalPayable`, default method NEFT.

[payments.api.ts](../src/lib/api/payments.api.ts) is the typed http
wrapper module — all routes go through TanStack Query in the pages.

### Dashboard wiring

[dashboard.ts](../server/src/routes/dashboard.ts) `/kpis` now returns:

- `msmeDueIn7Days: { count, amount }` — MSME invoices whose statutory
  deadline falls in the next week.
- `paymentBatchesPending` — count of batches in PENDING_APPROVAL.

Two new KPI cards in [DashboardPage.tsx](../src/pages/dashboard/DashboardPage.tsx) (red when
count > 0; otherwise green / muted).

### Forward-only invariant

The schema additions are additive: existing invoices default to
`paymentStatus = UNPAID`, `paidAmount = 0`; existing vendors to
`msmeRegistered = false`. No retroactive data migration needed — the
MSME refresh job (`POST /msme-refresh`) populates `msmePaymentDue` /
`msmeDaysRemaining` lazily as it runs.

---

## §13 Pending work

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

## §14 Dev commands

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

## §15 Conventions

- **Commit messages** — describe the *what* + *why*. When a working tree contains multiple semantic changes, the message must cover all of them (don't under-describe). The user has explicitly asked for "accurate (everything in one)" messages over partial ones.
- **Comments** — default to none. Add only when the *why* is non-obvious (workaround, invariant, surprising decision). Never narrate *what* the code does.
- **Documentation files** — never create new top-level docs unless the user asks. Update this file when structure changes.
- **Pre-commit hooks** — Husky + lint-staged run typecheck on staged files; never skip with `--no-verify` unless the user explicitly asks.
