# Procinix v2 — CLAUDE.md

## Before EVERY session
1. Read this file + ARCHITECTURE.md
2. Run `npm run typecheck` — must stay at 0 errors
3. Run `npm run lint` — 0 warnings on new code
4. Update ARCHITECTURE.md after every structural change
5. Verify no orphaned files: when replacing any page or component, delete the old file in the same commit. Before committing, run `grep -r "GeographyPage\|<OldComponent>" src` to confirm no stale references remain.

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
- Every master page and module page MUST use `<MasterPageHeader>` (from `src/components/masters/MasterFormLayout.tsx`) as its first element — it provides the ← Masters breadcrumb automatically. Never hand-roll a page header with a separate back button div.

#### HARD RULE — `React.forwardRef` on ALL form components
- Every component that renders `<input>`, `<select>`, or `<textarea>` **MUST** use `React.forwardRef`
- Every `forwardRef` component **MUST** have `.displayName` set immediately after the declaration
- This applies to ALL new components — no exceptions
- Before writing any form component, ask: does it render `<input>`, `<select>`, or `<textarea>`? If yes → `forwardRef` is **mandatory**
- The approved wrappers (`FormInput`, `FormSelect`, `FormTextarea`) live in `src/components/masters/MasterFormLayout.tsx` — always use these; never hand-roll new wrappers
- ESLint (`no-restricted-syntax`) will **error** on any new arrow-function component returning a bare native input in `src/components/**`; run `npm run lint:forms` before committing
- **Why this matters:** RHF's `register()` returns a `ref` callback. Without `forwardRef`, the ref is silently dropped by React, breaking: auto-focus on validation error, `setFocus()` API, and native browser validation — with no console warning and no TypeScript error to catch it

### Backend
- All endpoints validate tenant from JWT — never from request body
- All inputs validated with Zod before touching Prisma
- No raw SQL — Prisma only (exception: migration files)
- All mutations write to audit_log — append-only, never delete
- Rate limiting on all public endpoints
- Every Prisma model MUST have `status String @default("ACTIVE")`. Models without it will cause MasterTabs to return empty on the Active tab. Flag any model missing this field.
- Never filter by `isActive` in route handlers — always use `status`. `isActive` is a legacy boolean kept only for backwards-compat; `status` is the canonical field.

#### HARD RULE — Prisma `include`: relation field check is MANDATORY
Before writing `include: { fieldName }`, open `prisma/schema.prisma` and verify `fieldName` is a **declared relation** (its own line on the model, type referencing another model, with `@relation(...)`). FK columns alone (`vendorId String`) are NOT relations and `include`-ing them returns HTTP 500 with `Unknown field 'X' for include statement on model 'Y'`.

**FK columns — WRONG to include:**
```prisma
vendorId    String           // ← FK column, not a relation
itemId      String?          // ← FK column, not a relation
itemCategoryId String?       // ← FK column, not a relation
```

**Declared relations — safe to include:**
```prisma
vendor      Vendor   @relation(fields: [vendorId], references: [id])
item        ItemMaster @relation(fields: [itemId], references: [id])
```

**Pattern for FK-only columns** — fetch the referenced table separately in the same `Promise.all`, build a `Map` keyed by id, resolve at use site:
```ts
const [pos, vendors] = await Promise.all([
  prisma.purchaseOrder.findMany({ where: { tenantId } }),       // no include
  prisma.vendor.findMany({ where: { tenantId }, select: { id: true, legalName: true } }),
])
const vendorById = new Map(vendors.map(v => [v.id, v]))
const name = vendorById.get(po.vendorId)?.legalName ?? 'Unknown'
```

**Why this matters:** `PurchaseOrder.vendor`, `PurchaseOrderLine.item`, and `ItemMaster.itemCategory` are all FK columns without back-relations. Any `include` against them silently breaks the endpoint at runtime — typecheck passes because Prisma's generated types accept the include shape but the validator throws at query time. This bug has bitten three separate analytics endpoints; the rule above prevents recurrence.

#### Workflow engine — schema & rules (MANDATORY)

##### Schema — 8 normalized tables (DO NOT change this model)
- `WorkflowDefinition` — one row per workflow (name, module, status, priority, isDefault)
- `WorkflowDefinitionStage` — one row per approval step (role, sla, autoApproveBelow, onReject)
- `WorkflowDefinitionCondition` — one row per match condition (field, operator, value, AND/OR)
- `WorkflowInstance` — created when a document enters approval
- `WorkflowInstanceStage` — one row per step per instance (status, assignedTo, actedAt)
- `UserEntityRole` — resolves role → user at runtime (never hardcode user IDs)
- `WorkflowAuditLog` — immutable audit trail
- `WorkflowNotificationConfig` — notification preferences per definition

##### NEVER do any of the following
- Migrate to a `config_json` single-table model (breaks 80+ live instances)
- Add a `workflow_configurations` table or `config_json` column
- Hardcode approver user IDs — always resolve via `UserEntityRole` at runtime
- Use `include: { vendorId }` or `include: { itemId }` — FK strings are not Prisma relations (see rule above)

##### Condition semantics
Conditions on `WorkflowDefinition` are **MATCH** conditions — they filter
WHICH workflow definition applies to a document at dispatch time.
They are NOT per-step gates.

Per-step gating is handled via:
- `WorkflowDefinitionStage.autoApproveBelow` (numeric threshold)
- `WorkflowDefinitionStage.onReject` (`STOP | SKIP | ESCALATE`)

##### User override pattern
To assign a specific user to a step (not just a role):
```
approverType  = 'USER'
approverUserId = <uuid>
```
Default (role only): `approverType = 'ROLE'`, `approverUserId = null`.

##### API endpoints (existing — do not rename or duplicate)
```
GET    /api/workflow/definitions           — list all
GET    /api/workflow/definitions/:id       — single load
POST   /api/workflow/definitions           — create
PUT    /api/workflow/definitions/:id       — full update
PATCH  /api/workflow/definitions/:id       — partial update (status/name/desc/priority/isDefault only)
DELETE /api/workflow/definitions/:id       — guarded by IN_USE 409
POST   /api/workflow/definitions/:id/clone — copies definition, name + " (Copy)", status DRAFT
GET    /api/workflow/fields?module=X       — field catalog for condition builder
POST   /api/workflow/assistant             — plain-English → stage draft
```

##### Dispatch rule
When a document is submitted:
1. Query `WorkflowDefinition` WHERE `module = docType` AND `status = ACTIVE`
2. Evaluate match conditions against document fields → pick highest-priority match
3. If no match and `isDefault = true` → use default definition
4. If no definition found → HOLD document as Pending, never auto-approve
5. Insert `WorkflowInstance` + all `WorkflowInstanceStage` rows upfront — step 1 → `PENDING`, step 2+ → `PENDING_PREDECESSOR`
6. Resolve approver via `UserEntityRole` for the assigned role + tenant

##### UI components
- `src/pages/masters/workflow/WorkflowDefinitionsPage.tsx` — list page
- `src/pages/masters/workflow/WorkflowDefinitionFormPage.tsx` — 2-panel designer

Do not create `WorkflowManagement.tsx` or `WorkflowConfigurator.tsx` — those are the old replaced components.

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

## Integrations

### n8n (email ingestion)
- **n8n is the only path** for email-driven invoice ingestion. It monitors the mailbox, runs OCR, and POSTs structured data to Procinix.
- **Canonical endpoint:** `POST /api/webhooks/n8n/invoice?tenantId=<id>` — flat payload shape, Bearer auth.
- **Auth:** `Authorization: Bearer <N8N_WEBHOOK_SECRET>` (preferred) or `x-n8n-secret: <secret>` (legacy back-compat). Both compared via `Buffer.timingSafeEqual`. `verifyN8nSecret()` is the single resolver.
- **Code:** [server/src/routes/webhooks.ts](server/src/routes/webhooks.ts) — `handleN8nFlatInvoice()` is the pure handler (no Fastify dependency, unit-tested). It delegates to `ingestInvoice()` for vendor match + dedup + audit.
- **Two older n8n endpoints exist** (`/webhooks/n8n/invoice-email`, `/webhooks/n8n/invoice-ingest`) for back-compat with previously-configured workflows. New workflows should target `/api/webhooks/n8n/invoice`.
- **Idempotency:** built-in via `InvoiceIngestionJob.extractedData.messageId` lookup. n8n retries collide cleanly.
- **No in-process poller.** The Gmail API poller (`email-poller.service.ts`) and `googleapis` dep were removed 2026-05-21. **Do not re-add.** Manual upload OCR (Gemini) is a separate code path inside `/api/invoices/ocr-extract` and stays.

### LLM invoice scoring (OpenAI)
- After n8n webhook saves an invoice, **async LLM scoring runs** — webhook always returns 201 fast.
- **Service:** [server/src/services/invoice-scorer.service.ts](server/src/services/invoice-scorer.service.ts) — `scoreInvoiceWithLLM(ocrData)` + `scoreAndPersistInvoice(prisma, invoiceId, ocrData)`.
- **Model:** `gpt-4o-mini` via the `openai` SDK.
- Scores per-field confidence, validates GSTIN/PAN/amounts, suggests vendor match, flags review items.
- **Result stored on `Invoice`:** `ocrConfidenceMap`, `validationIssues`, `reviewFlags`, `vendorMatchSuggestion`, `recommendedAction`, `llmScoredAt` (camelCase Prisma fields matching the rest of the schema).
- **`recommendedAction`** values: `'auto_process' | 'needs_review' | 'hold'`. When `'hold'`, the invoice's existing `status` is also set to `'ON_HOLD'` (existing uppercase enum). Lowercase status values (`on_hold`, `needs_review`) are NOT introduced — they would break every status filter in the app.
- **Safe fallback:** if `OPENAI_API_KEY` is missing, the SDK errors, or JSON parsing fails, returns a result with `overallScore=0`, `recommendedAction='needs_review'`, and a `validationIssues[0]` carrying the failure reason. Never throws — invoice stays in normal review flow.
- **Async dispatch:** `setImmediate(...)` inside `handleN8nFlatInvoice` after the ingest succeeds. The handler also accepts a `scoreAndPersist?` dep override for unit tests.
- **Do NOT switch this to Anthropic/Claude or any other provider** — OpenAI is intentional. The `@google/generative-ai` SDK in this repo is for manual-upload OCR only, not scoring.

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
