# WS-1a — Blueprint Audit

> Companion to [ws1a-implementation-plan.md](./ws1a-implementation-plan.md).
> Documents the **findings** that drove each WS-1a decision. Think of this as
> "what we learned about the current codebase during the verification phase,
> and how that reshaped the original WS-1 plan."
>
> Produced during verification phase 2026-04-21 through 2026-04-24.

---

## 1. Original WS-1 assumptions (Message 2 starting point)

The original WS-1 plan made several assumptions about the current schema and codepaths. The verification phase tested each. This section records where assumptions held and where they didn't.

### Assumptions that held up

- Invoices are stored in a relational `invoices` table.
- Invoice line items in `invoice_line_items`.
- A multi-tenant schema (`tenants`, `entities`, `user_entity_access`) was recently added by [sql/mysql/migrations/20260421_multi_tenant_entity.sql](../sql/mysql/migrations/20260421_multi_tenant_entity.sql) and backfilled to `tenant-default-001`.
- `invoices.status` and `invoices.processing_status` are both `VARCHAR(50)` nullable; dual-write strategy viable.
- SQL across orchestrator, workflowRoutingAgent, and approvalService uses parameterized queries (no SQL injection risk).

### Assumptions that did NOT hold up — and the scope consequences

| # | Original assumption | What we found | Scope consequence |
|---|---|---|---|
| A1 | `vendors` is a JSON-blob table (like many masters) | `vendors` is a 6-table relational cluster: parent + `vendor_spocs`, `vendor_pan_compliance`, `vendor_gst_registrations`, `vendor_bank_accounts`, `vendor_entity_mappings` | Drop Message 2's proposed `vendor_additional_gstins` table (redundant with `vendor_gst_registrations`). Drop the fetcher-abstraction scope for vendor reads (not needed — vendors is already relational). |
| A2 | Vendor cluster has version-controlled DDL | **None of the 6 vendor tables** have `CREATE TABLE` in any SQL file. They exist on Azure, ALTER'd by the multi-tenant migration, but no baseline DDL. Same for `approvals`, MSME columns on `invoices`, and many columns on `invoices`/`purchase_orders`. | **Path 1** adopted: generate baseline CREATEs from `mysqldump --no-data` against Azure. Unblocks fresh-DB provisioning. Adds ~0.5 sprint to WS-1a. |
| A3 | `vendor_pan_compliance` has no TDS config | It already has vendor-level TDS: `section_206ab, tds_sections (JSON), rcm_applicable, lower_tds_section, lower_tds_cert_number` | TDS data model reshaped: **Option (a) entity-override-with-vendor-fallback**. WS-1a adds only `default_tds_section_override` to `vendor_entity_mappings`; vendor-level TDS stays on `vendor_pan_compliance`. |
| A4 | `invoice_audit_log` exists | **Does not exist on Azure.** | WS-1a migration `CREATE TABLE invoice_audit_log` (not just `ALTER`). Adds 16-column table with composite indexes. |
| A5 | Line-level target is `invoice_lines` | Table is named `invoice_line_items` (no `invoice_lines` on Azure). | All Message 2 references to `invoice_lines` rewritten to `invoice_line_items`. |
| A6 | `invoices.vendor_id` exists | Does not exist. Only denormalized `vendor_name VARCHAR(255)` links invoice to vendor. | WS-1a must ADD `vendor_id VARCHAR(36) NULL` + `vendor_id_match_confidence DECIMAL(5,2)` and backfill via strict-match against `vendor_legal_name` / `vendor_trade_name` / `vendor_code`. Without this, Q4 tier-duplicate logic is inoperable (all tiers key on vendor_id). |
| A7 | `invoices.processing_status` is NULL / pristine | Every row on Azure has identical `updated_at=2026-04-21 08:05:17` (batch-write artifact from multi-tenant migration). | Use `COALESCE(created_at, updated_at, NOW())` for `last_action_at` backfill — `created_at` varies naturally, `updated_at` is sentinel-ish. |
| A8 | Rates/thresholds/tolerances live in config tables | Agents use **hardcoded literals**: duplicateFraudAgent hardcodes `0.01` amount tolerance, `6`-char prefix, `7`-day date window, `70` risk_score threshold. matchAgent hardcodes `0.05` 2-way tolerance, `90` days fuzzy, `6 MONTH` recurring. | Extract hardcodes into `invoice_duplicate_config` via explicit per-tenant seed. Match tolerances stay hardcoded in WS-1a (future `match_tolerance_config` table, separate from duplicate config — different risk profiles). |

---

## 2. Schema drift audit

### 2.1 Tables missing version-controlled DDL in the repo

Queried Azure `information_schema.COLUMNS` + reviewed all 14 `.sql` files under `server/migrations/` and `sql/mysql/`:

| Table | Has DDL in repo? | State |
|---|---|---|
| `vendors` | ❌ | ALTER'd by multi-tenant migration; no CREATE |
| `vendor_spocs` | ❌ | No DDL anywhere |
| `vendor_pan_compliance` | ❌ | Indexed by 20260416 migration but no CREATE |
| `vendor_gst_registrations` | ❌ | No DDL anywhere |
| `vendor_bank_accounts` | ❌ | No DDL anywhere |
| `vendor_entity_mappings` | ❌ | No DDL anywhere |
| `approvals` | ❌ | Has GENERATED STORED column; no DDL |
| `invoices` | ⚠ Outdated | `server/migrations/invoice_ingestion.sql` has CREATE missing ~25 columns (lane, posting_readiness_score, tenant_id, entity_id, processing_status, msme_*, sla_*, escalated_*, approval_priority, etc.) |
| `invoice_line_items` | ⚠ Outdated | Same file; current schema smaller than Azure's after 2b adds |
| `invoice_exceptions` | ✅ matches | CREATE in `invoice_ingestion.sql` matches Azure |
| `purchase_orders` | ⚠ Outdated | Missing `tenant_id` (added by multi-tenant migration) |
| `domain_documents` | ✅ matches | CREATE in `init.sql` matches Azure |
| `ap_invoice_match_results, ap_invoice_agent_decisions, ap_invoice_duplicate_checks, ap_invoice_document_hashes, ap_invoice_documents` | ✅ | DDL in `server/migrations/002_agentic_agents.sql` |
| `tenants, entities, user_entity_access, tenant_registry` | ✅ | DDL in `20260421_multi_tenant_entity.sql` (with `COLLATE=utf8mb4_unicode_ci`) |

**Remediation**: WS-1a migration chunk 2a drift-fills the first 7 rows + updates the 4 "Outdated" rows. Generated from `mysqldump --no-data` against Azure — byte-identical to the live schema.

### 2.2 Silent data drifts (form captures, DB doesn't persist)

Cross-referenced [src/components/VendorMasterCreate.tsx](../src/components/VendorMasterCreate.tsx) save payload against server INSERT/UPDATE in [server/index.mjs](../server/index.mjs) (lines 2710-2748):

| # | Direction | Field / Table | Finding |
|---|---|---|---|
| 1 | form → DB lost | `vendors.client_erp_vendor_code` | Form payload sends it; server INSERT/UPDATE omits it; column doesn't exist on Azure. Silent data loss on every vendor save. |
| 2 | form → DB lost | `vendor_entity_mappings.credit_days` | Same pattern. |
| 3 | form → DB lost | `vendor_entity_mappings.credit_limit` | Same pattern. |
| 4 | DB → form gap | `vendor_pan_compliance.kyc_verified / _at / _provider / _raw_response / directors_json / date_of_incorporation` | Columns EXIST on Azure (added out-of-band). Form renders KYC result on screen. Server INSERT/UPDATE never writes them. KYC evidence discarded on every save. |
| 5 | form → DB lost on CREATE only | `vendor_entity_mappings.block_for_po / _reason / block_for_payment / _reason` | POST `/api/vendors` path INSERTs 10 columns; PUT `/api/vendors/:id` path INSERTs 14 columns (adds block_*). Operational impact: ops can't block a risky vendor at onboarding — save, re-open, re-save required. |

**Remediation**:
- Drifts 1-3: ALTER adds the missing columns in 2b (`client_erp_vendor_code`, `credit_days`, `credit_limit`). Handler-fix commit persists them.
- Drift 4: KYC hybrid model replaces the existing columns with per-check source tracking (§2.10 of the implementation plan). Legacy columns frozen.
- Drift 5: handler-fix commit aligns CREATE path's INSERT to match UPDATE path. No migration change.

### 2.3 Cross-environment drift flagged

`updated_at` on `invoices` is identical (`2026-04-21 08:05:17`) across all 10 rows on Azure dev — a batch-write artifact from the multi-tenant migration adding `tenant_id`/`entity_id`. Not meaningful as a last-action indicator. Backfill for `last_action_at` uses `COALESCE(created_at, updated_at, NOW())`, with `created_at` as the primary source (varies naturally from 2026-04-11 onwards).

### 2.4 Collation mismatch pre-existing

- `tenants`, `entities`: `COLLATE=utf8mb4_unicode_ci` (created by 20260421 multi-tenant migration).
- All business tables: `COLLATE=utf8mb4_0900_ai_ci` (MySQL 8 default).
- Consequence: an FK from any business-collation table to `tenants(id)` would fail to create, OR force a collation change that would break JOINs on `invoices.tenant_id = <other>.tenant_id` with "Illegal mix of collations".
- **This pre-dates WS-1a** — not drift WS-1a introduced. Logged as WS-1b gap item 11 (harmonize + retroactively add FKs).

---

## 3. Code drift findings

### 3.1 Match compute abstraction level

[server/services/agents/matchAgent.mjs](../server/services/agents/matchAgent.mjs) is at "intermediate" abstraction:
- ✅ Data-access helpers isolate `query()` calls (`matchByPOExact`, `matchByFuzzyPO`, `checkRecurringPattern`).
- ❌ No dependency injection — helpers are module-private.
- ❌ No GRN fetcher (line 137: `"3-way GRN verification not yet implemented — GRN records not checked"`).
- ❌ Tolerances hardcoded: `0.05` (2-way amount), `0.95`/`1.05` (fuzzy amount), `0.90`/`1.10` (recurring), `90` days fuzzy window, `6 MONTH` recurring window.
- ❌ No snapshot semantics for `match_details` JSON (no GRN values, PO read once but not persisted as self-contained).

**Refactor scope**: ~30-70 lines added, one commit. Introduces `DEFAULT_FETCHERS` + `fetchers` parameter. Zero behavior change in WS-1a; WS-1b swaps `getGRNsForPO` to a relational read.

### 3.2 SQL injection audit — clean

Verified: [server/services/agents/orchestrator.mjs](../server/services/agents/orchestrator.mjs), [server/services/agents/workflowRoutingAgent.mjs](../server/services/agents/workflowRoutingAgent.mjs), [server/services/approvals/approvalService.mjs](../server/services/approvals/approvalService.mjs). All SQL uses parameterized `?` placeholders with separate params arrays. The only interpolated strings are `${tableName}` substitutions from a curated list (`getGenericMasterKeys()`), never user input. **Zero SQL injection concerns.**

### 3.3 Dynamic status-filter sites (Item B) — 7 filter-by-value sites

Classified each code site that filters on `invoices.status` or `invoices.processing_status` by a specific value. Dual-read patch commit gated before the migration commit.

| # | Site | Pattern | Classification |
|---|---|---|---|
| 1 | [index.mjs:2204](../server/index.mjs#L2204) | `conditions.push('status = ?'); params.push(status)` (from URL param) | filter-by-value (SQL, parameterized) |
| 2 | [index.mjs:2353](../server/index.mjs#L2353) | `WHERE status = 'pending_approval'` (hardcoded) | filter-by-value (SQL, hardcoded) |
| 3 | [approvalService.mjs:78](../server/services/approvals/approvalService.mjs#L78) | `WHERE LOWER(COALESCE(i.status,'')) IN (5 legacy values)` | filter-by-value (SQL, IN clause) |
| 4 | [approvalService.mjs:217](../server/services/approvals/approvalService.mjs#L217) | `LOWER(COALESCE(i.status,'')) NOT IN (5 legacy values)` (auto-close-stale) | filter-by-value (SQL, inverse IN — needs NULL-defensive patch) |
| 5 | [index.mjs:2790](../server/index.mjs#L2790) | `AND processing_status = ?` (from URL param) | filter-by-value (SQL, parameterized) |
| 6 | [index.mjs:2142](../server/index.mjs#L2142) | `invoicePatch.status === 'pending_approval' ? 'submitted' : 'edited'` | filter-by-value (JS conditional) |
| 7 | [workflowTrigger.mjs:31](../server/services/invoiceIngestion/workflowTrigger.mjs#L31) | `if (invoice.status === 'pending_approval') { … }` | filter-by-value (JS conditional) |

**Patching strategy (option b — safer-during-transition)**: each site augments its status check with `OR lifecycle_state = <translated_value>`. A new `server/services/invoices/lifecycleMapping.mjs` helper is the single source of truth for the mapping (must produce identical output to the 2d SQL backfill CASE — cross-check test asserts this).

**Site 4 (inverse filter)** needs defensive treatment:
```sql
-- Original (negated status check):
AND (i.id IS NULL OR LOWER(COALESCE(i.status,'')) NOT IN (…))

-- Patched:
AND (
  i.id IS NULL
  OR (
    LOWER(COALESCE(i.status,'')) NOT IN (…)
    AND (i.lifecycle_state IS NULL OR i.lifecycle_state != 'Under Verification')
  )
)
```
Treats NULL `lifecycle_state` as "not under verification" — matches pre-migration behavior during the migration transaction window.

**Write sites needing dual-write** (separate from Item B; tracked in engine-work backlog): 7 write sites across index.mjs, orchestrator.mjs, workflowRoutingAgent.mjs write to `invoices.status` or `processing_status`. Every such write must also write `lifecycle_state` during the transition. Shipped with the lifecycle transition guard commit (commit 5+).

### 3.4 Section 206AA in `lower_tds_section` enum — semantic mismatch

`vendor_pan_compliance.lower_tds_section` is a VARCHAR with form-defined values `'not_applicable' / 'section_197' / 'section_206aa'`. Section 206AA is the **no-PAN penalty rate** (statutory 20% or rate applicable, whichever higher) — typically **higher** TDS, not lower. Putting it in `lower_tds_section` is semantically wrong.

Azure dev query: `lower_tds_section` distribution is `{not_applicable: 2, section_197: 0, section_206aa: 0}`. **Zero data uses `section_206aa`** — no migration needed. Flagged for WS-1b cleanup (remove the value or split the concept).

**WS-1a engine handling**: when `lower_tds_section='section_206aa'` is encountered, log a warning and pass through to `not_applicable` handling (real 206AA logic lives in TDS engine step 4, the PAN-missing check). Warning count surfaces in operational visibility for WS-1b planning.

---

## 4. Rationale for decisions (quick-reference)

| Decision | Driven by finding |
|---|---|
| Path 1 (full baseline) | Schema drift pervasive (§2.1); fresh-DB provisioning is a one-time cost that unlocks CI, testing, dev-laptop setup |
| Drop `vendor_additional_gstins` | `vendor_gst_registrations` is a richer superset (§A1) |
| Add `invoices.vendor_id` + backfill | Required for Q4 tier-duplicate detection — all tiers key on vendor_id (§A6) |
| `last_action_at = COALESCE(created_at, …)` | `updated_at` sentinel-ish on Azure dev (§2.3) |
| Option (a) TDS resolution order | `vendor_pan_compliance` already has TDS config; avoid duplication (§A3) |
| No FKs in 2c | Collation mismatch would either fail or break JOINs (§2.4) |
| KYC hybrid model | Drift 4 revealed KYC result persistence is broken AND real integration is WS-KYC scope; hybrid schema supports both paths |
| Dual-read Item B patch as separate commit | 7 filter-by-value sites > 5-site threshold (§3.3) |
| Match fetcher refactor in WS-1a | Pre-condition for clean Q6 match persistence (§3.1) |
| TDS seed as separate `2e` file + commit 4 | Consultant review gate on rates/thresholds; keeps tractable review surface |
| `match_tolerance_config` separate from `invoice_duplicate_config` | Different tolerances (5% match vs 1% duplicate) reflect different risk profiles (§A8) |
| Section 206AB tri-state with engine OR logic | Form captures three states, engine can collapse `specified_person + non_filer` for rate calc while preserving audit trail (§3.4 related) |

---

## 5. What to read when planning WS-1b

When WS-1b kickoff happens, start here:
1. **§6 of [ws1a-implementation-plan.md](./ws1a-implementation-plan.md)** — consolidated gap list with 15 items.
2. **§3.4 of this doc** — `lower_tds_section` enum cleanup detail.
3. **§2.4 of this doc** — collation harmonization detail.
4. [sql/mysql/migrations/_ws1a_drafts/](../sql/mysql/migrations/_ws1a_drafts/) — if the draft files haven't been renamed/committed yet, they're the authoritative schema reference.

Key WS-1b unlocks that flow from WS-1a:
- **PO / GRN relational promotion** unblocks `getGRNsForPO` fetcher in matchAgent.
- **Collation harmonization** unblocks retroactive FK addition across existing and new tables.
- **Service PO tolerance config** unblocks line-type-aware match logic.

---

## 6. What changed vs Message 2 (concise diff)

For anyone holding Message 2 from the pre-verification planning discussion:

| Message 2 said | Reality required |
|---|---|
| Create `vendor_additional_gstins` | Use existing `vendor_gst_registrations` |
| TDS additions on `vendor_entity_mappings` (7 columns) | 1 column (`default_tds_section_override`); vendor-level TDS stays on `vendor_pan_compliance` |
| Drop match_stale, no trigger | Confirmed; also added `match_score` + `vendor_id_match_confidence` + `duplicate_override_at` per verification-phase spot-check |
| 7-state lifecycle (no enum stated) | Authoritative: `'Ingested','OCR Extracted','Under Verification','Exception Hold','Processed','Queued for Payment','Rejected'` |
| `hsn_sac_code VARCHAR(16)` on invoice_lines | Reuse existing `hsn_sac VARCHAR(20)` on `invoice_line_items` (different table name) |
| 194H rate = 5% | Rate ambiguous (Finance Act 2024 reduced to 2% effective ~Oct 2024) — consultant verify |
| `section_206aa` in `lower_tds_section` | Semantically mismatched; pass-through-with-warning in engine; enum cleanup → WS-1b |
| FK policy option (b) — FKs on new tables | Zero FKs in 2c due to collation mismatch; WS-1b gap item |
| Backfill `Paid` → `Queued for Payment` | Backfill `Paid` → `Processed` (historical Paid invoices should not re-enter payment queue) |
| Seed rows target `tenant-default-001` only | INSERT … SELECT FROM tenants WHERE status='ACTIVE' (multi-tenant safe — 2 active tenants on Azure dev) |
| `last_action_at = updated_at` backfill | `last_action_at = COALESCE(created_at, updated_at, NOW())` (updated_at is batch-write artifact) |
