# Procinix S2P — Architecture

## §1 Stack

- Frontend: React 18 + Vite 6 + TypeScript, TailwindCSS, Radix, Recharts
- Backend: Node ESM, raw `http.createServer`
- DB: Azure MySQL (mysql2 pool); idempotent migrations, no runner
- OCR / Agents: Gemini + n8n + Anthropic; 8-step orchestrator with retry queue
- Auth: bcrypt + session tokens in `sessionStorage`; `Authorization: Bearer` for API
- Ports: Vite `:3000`, API `:8787`
- Tooling: ESLint 9 + Prettier 3, Husky + lint-staged, Vitest 4, GitHub Actions CI

## §2 Modules

| Module                                       | Status      | Notes                                                                                                |
| -------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| Auth                                         | Shipped     | `server/routes/auth.mjs`                                                                             |
| Masters (V2)                                 | Shipped     | 16 on `SimpleMasterScreenV2`; rate-contract/kit-bundle/employee bespoke                              |
| Item Master V2                               | Shipped     | ITM-\* canonical; manufacturer codes in `item_alias`                                                 |
| Rate Contract                                | Shipped     | `useRateContractLookup` auto-enforces on invoice forms                                               |
| Vendor Compliance                            | Shipped     | `GET /api/vendors/:id/compliance` in all 3 invoice forms                                             |
| Procurement (PR/PO/GRN/SRN)                  | Shipped     | `server/routes/procurement.mjs`; uses `purchase_orders_proc`                                         |
| Invoices + AP pipeline                       | Shipped     | touchless engine + 12-rule risk flags + retry                                                        |
| Agent Pipeline                               | Shipped     | crash-safe, structured metrics                                                                       |
| Payments — Queue/Dashboard/Forecast/Settings | Shipped     |                                                                                                      |
| Payments — Banking                           | In Progress | Mode B shipped; Mode A is stub                                                                       |
| Vendor Advances                              | Shipped     | `/ap/vendor-advances`                                                                                |
| Vendor Management                            | Shipped     | invitations, review, KYC                                                                             |
| Debit Notes                                  | In Progress | form done; backend partly blob-driven                                                                |
| Bulk Upload                                  | Shipped     | `MasterBulkUpload.tsx`                                                                               |
| Super Admin                                  | Shipped     | `/super-admin` RBAC-gated                                                                            |
| Approvals + Workflows                        | Shipped     | multi-step engine + 4-step designer wizard (§6.7); dynamic field registry feeds the condition picker |
| Dashboards                                   | In Progress | `*DeskAdvanced` live; legacy `*Desk` + `ReportDataService` are mock                                  |
| Agent Configurator UI                        | In Progress | runtime gated by `ENABLE_AGENT_BUILDER_RUNTIME`                                                      |
| Workflow Engine UI                           | Shipped     | list + 4-step wizard + AI-assistant draft + bell badge wired to `/api/notifications/unread-count`    |
| Workflow Engine Runtime                      | Shipped     | dispatcher + step advancement + bell/email notifications (§6.7–6.8)                                  |
| Budget module                                | Deferred    | blob-only, no nav                                                                                    |
| AR (`/ar/*`)                                 | Deferred    | routes registered, no nav                                                                            |
| Cash Flow (`/r2r/cash-flow/*`)               | Deferred    | routes registered, no nav                                                                            |

## §3 DB

- `item_master.item_master` — canonical for every item code; V2 cols `standard_price` + `item_type` + `tax_code_id` + `expense_category_id`; `item_alias` carries manufacturer codes
- `vendor_pan_compliance` — canonical TDS/RCM/MSME flags; projected by `projectVendorCompliance`
- `tds_section_master` — 10 real Indian sections (194C/J/H/I-LAND/I-PLANT/A/B/D/M/Q)
- `rate_contract_master` + `rate_contract_items` — UNIQUE (contract_id, item_code); INDEX (tenant_id, vendor_id, status)
- `purchase_orders_proc` — procurement PO table; legacy `purchase_orders` still used by matchAgent
- `doc_ref_sequences` — collision-safe refs under SELECT…FOR UPDATE
- `bank_payment_batches` + `_items` — Banking tab (NOT `payment_batches` which is PaymentProposal)
- `domain_documents` — JSON blobs for legacy PR/PO/GRN/Debit-Notes/Budget paths
- `p2p_schema_mt.payments` — empty until banking batches execute; KPIs may show zero
- Collation split: `tenants`/`entities` are `utf8mb4_unicode_ci`; business tables are `utf8mb4_0900_ai_ci` — no cross-boundary FKs
- Cross-DB FKs are application-layer only

## §4 Current state

**Last:** Workflow engine v1 — replaced every hardcoded `assigned_to='1'` insert with a real condition-driven dispatcher. New schema (`sql/mysql/migrations/20260512_workflow_engine.sql`): `user_roles` (role-name → user-id per tenant, seeded mithilesh→every role), `workflow_field_registry` (77 dynamic fields across 9 doc types), `notifications` (bell + email log), plus `approvals` columns `step_number`, `total_steps`, `workflow_config_id`, `parent_approval_id`, `token`, `token_expires_at`, `rejection_remarks`, `tenant_id`, `document_ref`, `document_name`; status enum widened with `pending_predecessor`+`cancelled`, module enum widened with `purchase_request`+`grn`. Active default workflows seeded for all 9 document types (ap_invoice 3-step, non_po_invoice 2-step, PO/PR 2-step, GRN/master_update/debit_note 1-step, payment/vendor_advance 2-step). New services: `server/services/workflow/{conditionEvaluator, roleResolver, dispatcher}.mjs` + `server/services/notifications/notificationService.mjs`. Routes consolidated under `server/routes/workflows.mjs` per CLAUDE.md (`GET /api/workflow/fields` with 5-min master-table option cache, `POST /api/workflow/configurations/:id/clone`, `GET /api/approvals/action?token=&action=` one-time-token email actions with 72h TTL, `GET /api/approvals/reject-remarks` + `POST /api/approvals/reject-with-remarks` for HTML reject form, `GET /api/notifications/unread-count`). Step advancement implemented in `triggerNextWorkflowStep` (approve → promote next `pending_predecessor` → `pending`; reject → cancel remaining). Anti-fraud guards: same-approver-as-submitter blocks dispatch with HTTP 422; legacy auto-close sync skips workflow rows (`workflow_config_id IS NULL`). All submission points wired: `ensureInvoiceApproval` (invoices.mjs), `ensureMasterApproval` (approvalService.mjs), PR `submit` action (procurement.mjs), PO `issue` action, payments batch submit, vendor advances submit, debit notes Pending-Approval create. New 8-smoke runner `server/scripts/smokeWorkflowE2E.mjs`: field registry, evaluator, resolver, dispatcher (token len 96 + ±5 min token TTL), same-approver block, step advancement, expired-token endpoint, npm test pass — **8/8 pass**. **TS 0 / lint 0 / tests 513 / 513 / 8 / 8 smokes.**

**Previously:** End-to-end approvals workflow consolidation. Single hardcoded one-level approval for every submitted invoice + master change. New helpers: `ensureMasterApproval` (`server/services/approvals/approvalService.mjs`) mirrors `ensureInvoiceApproval` for the `master_update` module — used by the canonical + item_master PUT handlers; `backfillAllPendingApprovals` is the unified startup hook that sweeps every key in `MASTER_STORAGE` plus invoices and idempotently ensures a matching queue row. Bespoke-schema masters (kit_bundle / employee / rate_contract — they have their own routes) are skipped; missing dev-DB schemas (`ER_BAD_DB_ERROR` / `ER_NO_SUCH_TABLE`) are tolerated silently. **viewOnly review UI** added to both invoice forms + SimpleMasterScreenV2; `/invoices/:id/review?approvalId=…` dispatches to DirectV2 or PO based on `po_number`; My Approvals "View" buttons wire to either the invoice review route or `/masters/<key>?fromApprovals=1&viewOnly=1` for V2 masters, where a self-contained `MasterApprovalReviewPanel` renders the diff (current via `originalData` vs proposed via payload, changed fields amber-highlighted) and Approve/Reject. 7-smoke E2E runner (`server/scripts/smokeApprovalsE2E.mjs`) confirms backfill, queue surfacing, idempotency, and the live approve flow (lifecycle_state → Processed; approvals.status → approved). See §6 for the data-flow contract.

**Earlier:** Vendor master ↔ operational vendors sync (`server/services/vendors/sync.mjs`). On `vendor_master` approve, the matching `p2p_schema_mt.vendors` row is upserted (+ `vendor_gst_registrations` / `vendor_pan_compliance` side tables) so newly-approved vendors appear in invoice / PO / GRN dropdowns immediately. Reject deactivates the operational row (`status='inactive'`, never deletes — preserves FK integrity). Backfill helper runs once at server boot, ensuring every Approved master row exists in the operational table (idempotent).

**Next:** Wire the WorkflowConfigurator UI (`/workflow-engine/designer`) to consume `GET /api/workflow/fields` for dynamic condition pickers (it currently uses a static field list); expose the `notifications` table to the header bell component (poll `/api/notifications/unread-count` on focus); onboard real role users via `user_roles` (currently every role → mithilesh). Dashboards still pending — `ReportDataService` + `EntityTransactionData.tsx` mocks → real queries against `invoices` / `purchase_orders_proc` / `goods_receipt_notes` / `vendor_pan_compliance`; seed `p2p_schema_mt.payments` so cash-outflow KPIs render.

**Known issues:**

- `server/index.mjs` ~5400 lines; ~59% of endpoints inline (B4)
- No migration runner — applied manually via Azure workbench (B5)
- 7 pre-existing TS errors (`InvoiceFormPO`, `NonPOInvoiceForm`, `VendorGroupMaster`); strict mode blocked (F4)
- ~1138 ESLint warnings in legacy files (deferred per-rule; new code must stay clean)
- Bare `fetch()` in `EntityMaster.tsx`, `InvoiceFormPO.tsx:222`, `pages/Approvals.tsx` (F3)
- `CFODesk`, `ManagementDesk`, `ProcurementHeadDesk`, `APDashboard`, `OperationalDashboard` are 100% mock
- Banking Mode A returns fake balances + UTRs

**Deferred:**

- Budget module (no nav)
- AR module (`/ar/*`)
- Cash Flow (`/r2r/cash-flow/*`)
- Orphan demo DBs (`product_master`, `sku_master`, `payment_method_master`, `color_master`, `size_master`) — kept on Azure
- Asset register wiring for CAPEX PRs
- Real bank API integration

## §5 Invoice forms

Three forms share the Opptra layout convention (lettered sections, icon-prefixed labels, 2-col grid, sticky workflow banner). All three use `fetchVendorCompliance` for tax flags and `useRateContractLookup` for rate-contract auto-apply.

| Form               | Route                     | Component                 | Status              |
| ------------------ | ------------------------- | ------------------------- | ------------------- |
| Non-PO Invoice     | `/invoices/create-direct` | `InvoiceFormDirectV2.tsx` | V2 refit 2026-05-12 |
| PO-matched Invoice | `/invoices/create-po`     | `InvoiceFormPO.tsx`       | F4 pending          |
| Non-PO (legacy)    | `/invoices/non-po-form`   | `NonPOInvoiceForm.tsx`    | live                |

### §5.1 `InvoiceFormDirectV2` field contract (2026-05-12)

**Vendor source — operational, not governance.** The dropdown binds to `useMasterData().liveVendors` (rows from `/api/vendors`, i.e. `p2p_schema_mt.vendors`). Active filter is `status === 'active'`. The governance `vendors` array (master_data context) is the approval queue and was the cause of the empty-dropdown bug — never use it for an invoice picker.

**Vendor auto-populate.** On `<select>` change the form stores `vendorId` + `vendorCode` + `vendorGroupName` (from `LiveVendor`). Two side-effects then run:

1. `fetchVendorCompliance(vendorId)` → projects `(vendors × vendor_pan_compliance × vendor_gst_registrations)` into `VendorCompliance`. Fills `vendorGstin`, derives `vendorState` from GSTIN digits 1-2.
2. `mysqlApiRequest('/vendors/:id')` → reads `pan_compliance.pan` (PAN isn't on the compliance projection to keep `determineTDS` engine-tight) + `payment_terms` (defensive — column may not exist; gated by a ref so user input isn't clobbered).

All five vendor-derived fields (Group, GSTIN, PAN, State, Vendor Code) render read-only with the `Auto` pill. **Payment Terms is the only vendor-related field the user can override.**

**Billing Location.** Single `<select>` from `useMasterData().locations` (active only). Stores both `billingLocationCode` and the resolved display name. OCR fuzzy-match isn't wired yet — see "Known issues" below.

**Department / Sub-Department.** Department prefills from `useAuth().user.department` once on mount via `departmentPrefilledRef`; the user can change it. Sub-Department is a plain text input (no master).

**Line items.** All editable inline: qty, rate, GST%, TDS Section, TDS%. The `recomputeLine` helper recalculates `amount = qty × rate`, splits GST via `isIntraState` (CGST+SGST intra-state, IGST inter-state), derives `tdsAmount`, `grossAmount`, `netPayable`. Item pick auto-fills description / HSN / UOM / rate / GST % / GL via `applyItemMasterDefaults`. **Rate priority:** active rate contract → `item_master.standard_price` → user-entered rate. The Rate input is `disabled` (with tooltip) when `rateContract.isActive(lineId)` returns true. Per-line chips: amber **RCM** when `isRcmApplicable({itemRcm, compliance})` is true; teal **Rate contract** when active.

**TDS section.** Per-line `<select>` populated from `getActiveTDSSections()`. On pick the rate auto-fills from `getTDSSectionByCode(code).rateCompany | rateIndividual`, branched by `vendorCompliance.entityType` (`individual` / `sole_prop` → individual rate, otherwise company rate).

**Retentions.** GST Retention % and TDS Retention % both start blank with placeholder `Enter %`. Withheld amount = (totalGst | totalTds) × pct / 100, displayed inline.

**Accounting Entry Preview (Section E).** Collapsible. Builds rows live from form state:

1. Expense / Asset (Dr) — `totalBase` at GL code matching `name.includes('expense')` or `code.startsWith('5')`, fallback `5001`
2. GST input (Dr) — IGST single line when interstate, CGST + SGST half-and-half when intra-state
3. TDS Payable (Cr) — `totalTds` at GL matching `name.includes('tds')`, fallback `TDS001`
4. Vendor Payable (Cr) — `totalBase + totalGst − totalTds` at GL matching `name.includes('payable')`, fallback `2001`

Dr / Cr totals shown at the bottom with a green `Dr = Cr balanced` chip or red `Dr / Cr mismatch` banner.

**OCR provenance.** A single `OcrFlagMap` (keyed on `OcrFieldKey`) is populated by the AI-hydration `useEffect` for each field it writes. The `wasOcrField(key)` selector returns true only when `captureMode === 'ocr' && ocrFlags[key]`. Every `<OcrBadge />` render site is gated by it. Switching to Manual mode clears the map (`setOcrFlags({})`) — the chips disappear app-wide. **Never render `<OcrBadge />` unconditionally on a value-presence check.**

**System-generated fields.** Invoice Number is read-only with placeholder `Auto-generated on save`. Server generates on POST `/invoices`.

### §5.2 Known issues — invoice forms

- OCR address → `location_master` fuzzy-match isn't wired. Today an OCR-extracted billing-location string falls back to a free-text option appended to the dropdown.
- `paymentTerms` isn't a column on `p2p_schema_mt.vendors`. The detail-fetch reads it defensively, but most vendors return undefined — terms stay user-entered.
- `vendorCompliance.tdsRate` isn't currently piped into the per-line `tdsPercent` on vendor select; the auto-rate fires only on per-line TDS section pick. Vendor's preferred section (`vendor_pan_compliance.tds_sections[0]`) could pre-select section #1 across new lines — deferred.
- `accountingEntries` GL-code resolution uses string-match against `name` / `code` because the schema doesn't carry an `accountSubType: 'GST Input'` taxonomy. Move to explicit GL-code-per-account-type mapping on `account_code_master` when the master gains that column.

## §6 Approvals workflow

Multi-step condition-driven approvals via the workflow engine (2026-05-12). The `approvals` table is the shared queue; `module` is the document-type enum (`ap_invoice` / `non_po_invoice` / `purchase_order` / `purchase_request` / `grn` / `payment` / `vendor_advance` / `debit_note` / `master_update`). `reference_id` is the document key (raw `invoices.id` for invoices, `${masterKey}:${recordId}` for masters, native row id for everything else).

`assigned_to` is now the **resolved approver user id** (e.g. `user-mith-001`) for engine rows. Legacy non-workflow rows still use the `'1'` unclaimed marker, and the queue filter accepts both: `(a.assigned_to = approverId OR a.assigned_to = '1')`.

### §6.1 Submission helpers (route through workflow engine)

| Helper / call site                                                                   | Document type                                                    | Effect                                                                                                                                                      |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ensureInvoiceApproval(invoiceId, submittedBy)` (`server/routes/invoices.mjs`)       | `ap_invoice` / `non_po_invoice` (auto-detected from `po_number`) | Pre-flight idempotency check; on miss hydrates invoice payload and calls `enqueueApprovalFromWorkflow`. Returns `{ blocked, reason }` for HTTP 422 surface. |
| `ensureMasterApproval(db, {...})` (`server/services/approvals/approvalService.mjs`)  | `master_update`                                                  | Same pattern: dispatch via the engine; `reference_id='${masterKey}:${recordId}'`.                                                                           |
| PR `submit` action (`server/routes/procurement.mjs`)                                 | `purchase_request`                                               | Engine gate runs before status flip; on block, PR stays draft.                                                                                              |
| PO `issue` action (`server/routes/procurement.mjs`)                                  | `purchase_order`                                                 | Engine gate runs before status flip; on block, PO stays draft.                                                                                              |
| Bank payment batch `submit` (`server/routes/payments.mjs`)                           | `payment`                                                        | Same pattern.                                                                                                                                               |
| Vendor advance `submit` (`server/routes/advances.mjs`)                               | `vendor_advance`                                                 | Same pattern.                                                                                                                                               |
| Debit note create with `status='Pending Approval'` (`server/routes/debit-notes.mjs`) | `debit_note`                                                     | Engine gate runs post-create; block surfaces 422 with `{ id, dnNumber }`.                                                                                   |

All call `enqueueApprovalFromWorkflow` in `server/services/workflow/dispatcher.mjs`:

1. `selectWorkflowForDocument(documentType, payload, tenantId, db)` — picks the highest-priority `Active` workflow_configuration (conditional rules before unconditional defaults). Returns `null` only when no configs exist for that type → fallback single-row insert with `assigned_to='1'` and `workflow_config_id IS NULL`.
2. Filter steps whose `conditionJson` evaluates false (`evaluateConditions`).
3. For each remaining step, `resolveStepApprover` → `[userId]`. Filters submittedBy (anti-fraud "no self-approve"); duplicate-across-steps logs a warning but keeps the step.
4. Inserts step 1 as `status='pending'` with a 96-char hex token (72h `token_expires_at`), steps 2..N as `status='pending_predecessor'` linked by `parent_approval_id`.
5. `invalidatePendingApprovalsSync` + best-effort bell + email notification to step 1's approver.

### §6.1a Step advancement (`triggerNextWorkflowStep` in `approvalService.mjs`)

- **Approve step N**: if `step_number < total_steps`, find the matching `pending_predecessor` row at step N+1 and promote to `pending`. Reset its `token_expires_at` to +72h. Post-commit notify next approver. If final step, notify submitter via `sendApprovalCompleteNotification`.
- **Reject any step**: cancel every `pending_predecessor` row for the same `parent_approval_id` (status → `cancelled` + `completed_at = NOW()`). Post-commit notify submitter via `sendRejectionNotification`.
- The legacy `syncPendingApprovals` "auto-close stale" path is now gated on `workflow_config_id IS NULL` so it never clobbers workflow-engine rows.

### §6.2 Background sync — `syncPendingApprovals`

Runs on a 60-second loop and on every `/api/approvals/queue|kpis|module-counts` call. The queue endpoint calls `awaitApprovalSync(db, approverId, { force: true })` so a fresh user fetch bypasses the debounce and reflects submissions made seconds ago. The sync inserts approval rows for any pending invoice or master row that's missing one. Per-master schema gaps (`ER_BAD_DB_ERROR` / `ER_NO_SUCH_TABLE`) are tolerated silently — common on dev DBs that haven't seeded every master.

### §6.3 Approve / Reject

| Endpoint                          | Frontend caller                                                    | Effect                                                                                                                                                                                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/approvals/:id/approve` | My Approvals approve button + invoice/master review forms' Approve | `approveItem` flips approvals row to `approved`; `syncMasterSourceApprovalStatus` then flips the source — invoices → `lifecycle_state='Processed' status='approved'`; masters → `approval_status='Approved'` + `originalData` cleared (`applyApprovalActionToRecord`). |
| `POST /api/approvals/:id/reject`  | Same as above                                                      | Flips approvals row to `rejected`; invoices → `lifecycle_state='Rejected' status='rejected'`; masters → restore `originalData` onto the live record + `approval_status='Rejected'`.                                                                                    |

### §6.4 Combined startup backfill — `backfillAllPendingApprovals(db, { ensureInvoice })`

Replaces the older single-purpose backfill helpers. Sweeps every key in `MASTER_STORAGE` (including `item_master`'s flat schema; bespoke-schema masters `kit_bundle_master` / `employee_master` / `rate_contract_master` are skipped — they have their own approval flows in their bespoke route files). Then sweeps `invoices` parked in `Under Verification`/pending. For each missing queue entry, calls `ensureMasterApproval` or the dependency-injected `ensureInvoice` (avoids circular import). Per-master errors are scoped + summarised in `{ masters: { perKey, … }, invoices: { … } }`. Non-fatal: ER_BAD_DB_ERROR / ER_NO_SUCH_TABLE on dev DBs is logged + treated as a skip. Wired into `server.listen`'s startup callback (replacing the prior two-call setup).

### §6.5 Review UI

**Invoices** — `/invoices/:id/review?approvalId=…` mounts `InvoiceReviewLoader`, which fetches the invoice, branches on `po_number` to pick `InvoiceFormPO` or `InvoiceFormDirectV2`, and renders it with `viewOnly={true}` + `approvalId`. The forms each:

- Accept `viewOnly` / `approvalId` / `reviewInvoiceId` props.
- Render a teal "Viewing submitted invoice — awaiting your approval" banner.
- Wrap the body in a native `<fieldset disabled>` so every input/select/textarea/button is automatically disabled (no per-input prop drilling).
- Swap the header's Save Draft / Submit pair for Approve (teal) + Reject (red, prompts for reason).
- Approve/Reject call `/api/approvals/:approvalId/approve|reject` then `navigate('/approvals')`.

**Masters** — My Approvals routes `master_update` View buttons to `/masters/<route>?fromApprovals=1&viewOnly=1&approvalId=…&recordId=…`. Every V2 master is mounted via `SimpleMasterScreenV2`, which detects these query params and short-circuits to `MasterApprovalReviewPanel` (`src/components/masters/MasterApprovalReviewPanel.tsx`). The panel renders:

- Header with mode label + "N fields changed" badge + Approve/Reject buttons.
- Teal "Viewing pending changes — awaiting your approval" banner.
- Three-column diff table — Field / Current values (from `originalData`) / Proposed changes (from live payload). Changed rows highlighted amber with a CHANGED chip; unchanged rows shown muted for context. `originalData` / approvalStatus / timestamps / id are filtered out of the diff.

EntityMaster (which doesn't use SimpleMasterScreenV2) retained its existing inline isApproverReview flow — unchanged.

### §6.6 Smoke runner

`server/scripts/smokeApprovalsE2E.mjs` exercises 7 checks against the live DB:

1. `backfillAllPendingApprovals` completes without crash; per-master errors=0 after dev-DB tolerances.
2. `GET /api/approvals/queue?module=ap_invoice` returns non-empty.
3. `GET /api/approvals/queue?module=master_update` count; 0 OK when no masters pending.
4. `ensureMasterApproval` called twice → exactly 1 pending row.
5. `ensureInvoiceApproval` called twice → exactly 1 pending row.
6. Live `approveItem` flow → `approvals.status='approved'` + `invoice.lifecycle_state='Processed'` + `invoice.status='approved'`.
7. `npm test` → 0 failures, all 496 tests pass.

Run via `node --env-file=.env.mysql.local server/scripts/smokeApprovalsE2E.mjs`. Exits non-zero on any FAIL.

### §6.7 Workflow engine tables + routes (2026-05-12)

**Tables** — see `sql/mysql/migrations/20260512_workflow_engine.sql`:

| Table                     | Role                                                                                                                                               |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workflow_configurations` | Already existed; now consumed by the dispatcher. 9 default Active workflows seeded covering every `module` enum value.                             |
| `user_roles`              | `(tenant_id, role_name, user_id)` mapping with `UNIQUE` on the triple. Mithilesh (`user-mith-001`) seeded for every role in `tenant-default-001`.  |
| `workflow_field_registry` | 77 dynamic field definitions per document type. `source_table` + `source_column` let `GET /api/workflow/fields` hydrate enum options from masters. |
| `notifications`           | Bell-notification log per (`user_id`, `tenant_id`); `is_read` flag drives the unread-count endpoint.                                               |

**Routes** (all in `server/routes/workflows.mjs` per CLAUDE.md):

| Method | Path                                                  | Purpose                                                                                                                                                                                                                             |
| ------ | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/workflow/fields?documentType=`                  | Returns `{ fields: [{ key, label, dataType, options[] }] }` with 5-min in-memory cache per (tenant, documentType).                                                                                                                  |
| POST   | `/api/workflow/configurations/:id/clone`              | Clone an existing config; body `targetDocumentType` optional. Status → `Draft`, name → `<original> (Copy)`.                                                                                                                         |
| GET    | `/api/approvals/action?token=&action=approve\|reject` | One-time-token email actions. 72h expiry. `approve` runs `approveItem` and renders a static confirmation; `reject` redirects to the remarks form. Expired or used tokens render "Link expired or already used" (HTTP 200, not 500). |
| GET    | `/api/approvals/reject-remarks?token=`                | Plain HTML form requesting rejection reason.                                                                                                                                                                                        |
| POST   | `/api/approvals/reject-with-remarks`                  | Accepts `{ token, remarks }` (JSON or form-urlencoded); validates token + calls `rejectItem`.                                                                                                                                       |
| GET    | `/api/notifications/unread-count?userId=`             | `{ count: number }`. Tenant-scoped via header.                                                                                                                                                                                      |
| GET    | `/api/notifications?userId=`                          | List 50 most recent for a user.                                                                                                                                                                                                     |
| POST   | `/api/notifications/:id/read`                         | Mark one notification as read.                                                                                                                                                                                                      |

**Notification helpers** (`server/services/notifications/notificationService.mjs`) — `sendApprovalRequestNotification`, `sendApprovalCompleteNotification`, `sendRejectionNotification`, `sendStepSkippedNotification`. Each writes a `notifications` row AND attempts SMTP via existing `SMTP_*` / `AP_EMAIL_*` env vars (`nodemailer`). SMTP failures log but don't break the dispatch.

### §6.8 Workflow smoke runner

`server/scripts/smokeWorkflowE2E.mjs` exercises 8 checks (PASS/FAIL per check, non-zero exit on any FAIL):

1. Field registry returns `invoice_amount`, `gl_code`, `cost_centre` for `ap_invoice`.
2. `evaluateConditions` gt/lt sanity check.
3. `resolveApproversForRole('Finance Manager', 'tenant-default-001')` → contains `user-mith-001`.
4. Dispatcher → step 1 pending, total_steps=3, 96-char token, expiry ~72h.
5. Same-approver-as-submitter block — submitter `user-mith-001` + role mapped to `user-mith-001` → `{ blocked: true }`.
6. Step advancement — approve step 1 → step 2 `pending_predecessor` → `pending`.
7. Expired-token endpoint returns HTTP 200 with "expired" text (not 500).
8. `npm test` exits 0.

Run via `node --env-file=.env.mysql.local server/scripts/smokeWorkflowE2E.mjs`.

## §7 Vendor master ↔ operational vendors sync

Two tables, one logical vendor:

| Table                         | Role                                                                                                                                                           | Read by                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `vendor_master.vendor_master` | Governance / approval queue. Canonical `record_code` / `record_name` / `payload` shape with `approval_status`.                                                 | Vendor Master UI, My Approvals dashboard                                                 |
| `p2p_schema_mt.vendors`       | Operational reference data. Snake-case columns + side tables (`vendor_gst_registrations` / `vendor_pan_compliance` / `vendor_spocs` / `vendor_bank_accounts`). | Invoice / PO / GRN forms (vendor dropdown), agent pipeline, payments, GET `/api/vendors` |

The two were historically disconnected — approving a vendor in the governance table had no effect on the operational table, so newly-approved vendors stayed invisible to transactions until manually re-seeded.

### §6.1 Sync trigger points

`server/services/vendors/sync.mjs` exports two entry points:

- **`syncVendorMasterRecord(record, action)`** — called from `updateGenericMasterApproval` (`server/index.mjs`) immediately after a `vendor_master` row's approval state changes:
  - `action === 'approve'` → upsert: insert (if no match) or update (if vendor_code or legal_name matches) the operational vendors row, plus upsert `vendor_gst_registrations` (primary, `sort_order=0`) and `vendor_pan_compliance` (UNIQUE on `vendor_id`). Sets `status='active'` + `is_active=1`.
  - `action === 'reject'` → flip the matching operational row to `status='inactive'` + `is_active=0`. **Never deletes** — historical invoices / POs that reference the vendor must keep their FK.
  - Any other action → no-op (currently `request_info` / `changes_requested` etc.).
  - Errors are caught + logged; the master approval already committed, so the operational sync is best-effort. Ops can re-run the backfill to recover.

- **`backfillApprovedVendorMasters()`** — fires once at server boot inside the `server.listen` callback. Reads every `vendor_master` row with `approval_status='Approved'`, projects the payload, and runs the upsert path. Idempotent — matched rows hit the UPDATE branch with the same values. Returns `{ scanned, inserted, updated, errors }` for the startup log.

### §6.2 Field mapping (`projectMasterToOperationalRow`)

Reads tolerate both camelCase and snake_case keys (the canonical PUT handler merges previous DB row + incoming payload, so the same logical field can land under either spelling).

| Master payload key (any of)                                        | → Operational column                                           | Notes                                                                                                                              |
| ------------------------------------------------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `vendorCode` / `vendor_code` / `code` / `recordCode`               | `vendor_code`                                                  | Primary match key on upsert.                                                                                                       |
| `legalName` / `vendor_legal_name` / `name` / `recordName`          | `vendor_legal_name`                                            | Secondary match key (case-insensitive).                                                                                            |
| `tradeName` / `vendor_trade_name`                                  | `vendor_trade_name`                                            | Nullable.                                                                                                                          |
| `vendorType` / `vendor_type`                                       | `vendor_type`                                                  | Normalised to enum: `'Supplier'` / `'Distributor'` → `goods_supplier`; `'Service Provider'` / `'Contractor'` → `service_provider`. |
| `vendorGroupName` / `vendor_group_name`                            | `vendor_group_name`                                            |                                                                                                                                    |
| `vendorGroupCode` / `vendor_group_code`                            | `vendor_group_code`                                            |                                                                                                                                    |
| `address` / `address_line`                                         | `address_line`                                                 |                                                                                                                                    |
| `city` / `state` / `country`                                       | as-is                                                          | `country` defaults to `'India'`.                                                                                                   |
| `pincode` / `pin_code`                                             | `pin_code`                                                     |                                                                                                                                    |
| `tenant_id` / `tenantId`                                           | `tenant_id`                                                    | Defaults to `'tenant-default-001'`.                                                                                                |
| `gstin`                                                            | `vendor_gst_registrations.gstin` (primary row, `sort_order=0`) | `gst_state_code` derived from first 2 digits via `stateCodeFromGstin`.                                                             |
| `pan`, `msmeCategory` / `msme_category` / `msmeFlag`, `tdsSection` | `vendor_pan_compliance` (single row, UNIQUE on `vendor_id`)    | INSERT…ON DUPLICATE KEY UPDATE. `tdsSection` lands in `tds_sections` JSON array.                                                   |

### §6.3 Match precedence + safety

1. Match on `vendor_code` exact. If found → UPDATE.
2. Else match on `LOWER(vendor_legal_name)` exact. If found → UPDATE (legacy seeds may carry a different code from the new governance row).
3. Else INSERT with a fresh `randomUUID()`.

The match precedence guards against duplicate operational rows when an admin approves a vendor that was already seeded manually under a slightly different code.

### §6.4 What the user sees end-to-end

1. User opens Vendor Master, fills the form, clicks Save → row enters `vendor_master.vendor_master` with `approval_status='Pending Approval'`. The Master Updates tab in My Approvals shows it within one refresh cycle (see the approval-sync debounce-bypass in `server/services/approvals/approvalService.mjs`).
2. Approver clicks Approve → `updateGenericMasterApproval` flips `approval_status='Approved'` → `syncVendorMasterRecord(record, 'approve')` fires → operational vendors row is inserted/updated with `status='active'`.
3. User opens any invoice / PO / GRN form → the vendor dropdown (sourced from `liveVendors` via `GET /api/vendors` filtered to `status='active'`) shows the newly-approved vendor.

### §6.5 Tests

`server/services/vendors/__tests__/sync.test.mjs` — 17 vitest cases covering: state-code extraction, the projector's tolerance of both casings, the upsert dispatch (INSERT vs UPDATE branch), GST/PAN side-table writes only when fields are present, GSTIN state-code derivation, the reject deactivate path (and its no-op when nothing matches), unknown-action skip, and the backfill summary including the missing-schema fallback.
