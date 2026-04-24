# WS-1a — Verification Phase Responses

> Provenance record of the verification phase (2026-04-21 → 2026-04-24).
> Each proceed-order step, the evidence gathered, and the decision made.
>
> Use this when a future contributor asks "why was X decided?" and the code
> doesn't self-document the answer.

---

## How this phase was structured

The verification phase ran against a fixed proceed order. Each step was a
discrete research question with a yes/no or small-decision output. No commits
happened during verification — drafts live under [sql/mysql/migrations/_ws1a_drafts/](../sql/mysql/migrations/_ws1a_drafts/).

Proceed order (final):
1. Vendor-form field enumeration (expanded Item A)
2. info_schema queries — columns / indexes / FKs across 12+2 target tables
3. Baseline CREATE TABLE generation (chunk 2a) + validation
4. ALTER TABLE additions (chunk 2b)
5. New tables CREATE (chunk 2c)
6. Seeds + backfills (chunk 2d)
7. lower_tds_section distribution query (step 3)
8. Vendor-handler drift final check (step 4)
9. Q1 count query (folded into step 6 prep)
10. Q2 match-compute abstraction review
11. Item B dynamic-SQL audit
12. TDS seed draft (ships as chunk 2e, gated on consultant)

---

## Step-by-step findings

### Step A — Vendor-form enumeration (expanded Item A)

**Question**: What fields does the vendor form capture? Map each to its backing table/column. Flag any drift.

**Method**: Read [src/components/VendorMasterCreate.tsx](../src/components/VendorMasterCreate.tsx) (1,219 lines); cross-reference save payload keys against server INSERT/UPDATE in [server/index.mjs:2710-2748](../server/index.mjs#L2710-L2748).

**Findings**:
- Vendor cluster is 6 relational tables (not JSON blob as originally assumed).
- 4 silent drifts identified (see [blueprint audit §2.2](./ws1a-blueprint-audit.md)).
- 3 TDS engine gaps: lower-TDS cert has no validity dates or rate; `tds_sections` JSON has no form field (always empty `[]`); `section_206ab` is tri-state not boolean.

**Decisions**:
- Drop `vendor_additional_gstins` from Message 2 plan (redundant).
- TDS engine gap: ALTER `vendor_pan_compliance` to ADD `lower_tds_cert_valid_from / _to / _rate`; add form fields in WS-1a client-commits.
- `tds_sections` UI gap: Option (a) — add multi-select form field; engine routes to exception if missing.
- 206AB tri-state: engine treats `!= 'not_applicable'` as higher-rate trigger; preserves specific value for audit.

### Step B — info_schema queries on Azure dev

**Question**: What does the Azure schema actually look like vs what the repo SQL says?

**Method**: Read-only `SELECT … FROM information_schema.{COLUMNS, STATISTICS, KEY_COLUMN_USAGE}` via tmp script [server/scripts/_runInfoSchemaQuery.mjs](../server/scripts/_runInfoSchemaQuery.mjs). 12 target tables + metadata queries.

**Findings**:
- All 12 targets present on Azure; `invoice_audit_log` and `invoice_lines` do NOT exist.
- Zero foreign keys anywhere in the schema.
- 4 silent drifts confirmed at DB-level (columns form sends don't exist on Azure).
- 10 invoices, 2 vendors, 1 bank row, 0 PO rows, 104 approvals on Azure dev (test data).
- Row counts tiny — migration/backfill risk is negligible from volume perspective.
- `invoices` has 20+ columns not in Message 2's picture: `lane, posting_readiness_score, auto_post_flag, human_touched_flag, extraction_model_version, document_id, batch_id, processing_status, msme_*, sla_*, escalated_*, approval_priority, priority_reason, tenant_id`.

**Decisions**:
- Expand baseline CREATE to all 12 tables (drift-fill).
- Use `information_schema.COLUMNS` existence check pattern on every ADD COLUMN (idempotent on Azure; fresh-DB compatible).
- Include `invoice_audit_log` as a new CREATE in chunk 2c, not ALTER.
- Retarget `invoice_lines` → `invoice_line_items` throughout the plan.

### Step C — Baseline CREATE generation (chunk 2a)

**Question**: Can we reproduce Azure's schema faithfully for fresh-DB provisioning?

**Method**: `mysqldump --no-data` via MySQL Workbench's bundled binary at `/Applications/MySQLWorkbench.app/Contents/MacOS/mysqldump`. Applied two transformations: `CREATE TABLE` → `CREATE TABLE IF NOT EXISTS`, and stripped `/*!40101 SET character_set_client …*/` version-hint wrappers.

**Validation**: re-dumped Azure with same flags; diffed against the transformed baseline. **Zero diff** — the baseline is byte-identical to Azure dump modulo the two documented transformations.

No local MySQL server was installed (no brew, no docker). Belt-and-suspenders execution test was declined; dump-roundtrip diff accepted as sufficient validation since the DDL source is Azure's own mysqldump output.

### Step D — ALTER additions (chunk 2b)

**Question**: Which columns need adding to existing tables for WS-1a?

**Output**: 75 ADD COLUMN + 10 CREATE INDEX, all idempotent-guarded with `information_schema.COLUMNS` existence check. Summary in [implementation plan §4](./ws1a-implementation-plan.md).

**Spot-check revealed 3 missing columns** from my initial draft (user-initiated review):
- `invoices.vendor_id_match_confidence DECIMAL(5,2)` — separate from `vendor_id`
- `invoices.match_score DECIMAL(5,2)` — separate from `match_result` + `match_details`
- `invoices.duplicate_override_at DATETIME` — completes the three-field override trio

**Lifecycle ENUM correction**: initial draft used placeholder values. Authoritative set locked at:
```
'Ingested', 'OCR Extracted', 'Under Verification', 'Exception Hold',
'Processed', 'Queued for Payment', 'Rejected'
```

### Step E — New tables CREATE (chunk 2c)

**Question**: What new tables does WS-1a need?

**Output**: 10 CREATE TABLE statements (106 total columns, 17 indexes, 0 FKs).

**FK policy finding**: `tenants` and `entities` use `COLLATE=utf8mb4_unicode_ci`; baseline business tables use `utf8mb4_0900_ai_ci`. An FK to `tenants(id)` would either fail to create or force collation downgrade that breaks cross-table JOINs on `tenant_id`.

**Decision**: Zero FKs in chunk 2c. Matches existing schema pattern (invoices.tenant_id has no FK). Logged to WS-1b gap list: "Harmonize schema-wide collation + retroactively add tenant_id FKs."

**Amendments during TDS seed prep**:
- Added `invoice_duplicate_config.fuzzy_prefix_length INT NULL` (current agent uses 6, needed schema slot).
- Added `payments.notes TEXT NULL` (needed for historical-paid synthesis marker and WS-3 reconciliation).
- Expanded header comment block explaining why `fuzzy_prefix_weight / _amount_weight / _date_weight / amount_tolerance_rupees` are intentionally NULL (Q4 weighted engine hasn't landed yet).

### Step F — Seeds + backfills (chunk 2d)

**Question**: What seed rows and data backfills does WS-1a need?

**Verification riders** (user-requested before committing 2d):

**Rider 1 — default tenant ID**:
```sql
SELECT id, name FROM tenants ORDER BY created_at LIMIT 5;
-- Result:
--   tenant-default-001 | Default Tenant          | DEFAULT | ACTIVE
--   4755d4d4-…76fb-…   | Procinix S2P Product    | PTPL    | ACTIVE
```
**2 active tenants** on Azure dev, not 1 as initially assumed. **Decision**: seeds use `INSERT … SELECT FROM tenants WHERE status='ACTIVE'` — hits all tenants, idempotent via ON DUPLICATE KEY UPDATE, scales to future tenant additions.

**Rider 2 — `updated_at` integrity**:
```sql
-- Result:
--   null_updated: 0   total: 10
--   earliest updated_at: 2026-04-21 08:05:17
--   latest  updated_at: 2026-04-21 08:05:17  ← IDENTICAL across all rows
--   earliest created_at: 2026-04-11 14:17:52  ← varies naturally
```
`updated_at` is a batch-write artifact (20260421 multi-tenant migration mass-touched the table). **Decision**: `last_action_at = COALESCE(created_at, updated_at, NOW())` — `created_at` is the honest proxy.

**Status distribution (Q1 count + CASE mapping prep)**:
```sql
SELECT status, COUNT(*) FROM invoices GROUP BY status;
-- draft: 8, pending_approval: 1, Rejected: 1

SELECT status, processing_status, COUNT(*) FROM invoices GROUP BY status, processing_status;
-- draft + exception:    7
-- draft + failed:       1
-- pending_approval + NULL:  1
-- Rejected + rejected: 1

SELECT COUNT(*) FROM invoices i JOIN invoice_exceptions ie ON ie.invoice_id = i.id
  WHERE i.status = 'Approved' AND ie.resolved = 0;
-- 0 — Q3 migration target is empty on dev
```

**CASE refinement**: initial draft mapped `draft → Ingested`. User refined: `draft + processing_status IN ('exception','failed') → Exception Hold`; `draft + (NULL or other) → Ingested`. **Rationale**: `processing_status='failed'` is a genuine exception state; mapping to Ingested would hide it from the exception queue.

### Step G — lower_tds_section distribution (step 3)

**Question**: Is the `section_206aa` value in `vendor_pan_compliance.lower_tds_section` actually used in the current data?

**Query result**:
```
lower_tds_section    count
not_applicable       2
(all other values)   0
```

All 2 rows have `not_applicable`. Zero data uses `section_206aa` or `section_197`.

**Decision**:
- No migration change needed — zero affected data.
- Engine handling: on `lower_tds_section='section_206aa'`, log a warning and pass through to `not_applicable`. Real 206AA logic lives in TDS engine step 4 (PAN-missing).
- WS-1b gap item: remove the semantically-mismatched value or split into `pan_missing_206aa_applies BOOLEAN`.

### Step H — Vendor-handler drift final check (step 4)

**Question**: Are there more form-payload-sent-but-not-persisted drifts beyond the 4 found in Step A?

**Method**: Systematic CREATE/UPDATE SQL column-list comparison for all 6 vendor tables.

**Finding — new drift**: `vendor_entity_mappings.block_for_po / _reason / block_for_payment / _reason` are persisted only on UPDATE path (PUT /api/vendors/:id), not on CREATE path (POST /api/vendors).

```
CREATE path (line 2733): 10 cols — no block_* fields
UPDATE path (line 2748): 14 cols — includes block_* fields
```

**Operational impact**: ops trying to block a risky vendor at onboarding thinks the block took effect; it silently doesn't. To enable the block: save, re-open in edit mode, set the block, re-save.

**Decision**:
- Not a migration change — purely a server-code fix.
- Added to the "vendor-handler persistence cleanup" commit (WS-1a client-commits backlog): align CREATE path INSERT to match UPDATE path. Same commit fixes drifts 1-3 (`client_erp_vendor_code`, `credit_days`, `credit_limit`).
- Logged to a new "handler consistency audit" backlog (separate track, not WS-1b) to run the same CREATE-vs-UPDATE symmetry check across invoices, purchase_orders, goods_receipts-as-JSON, vendor_advances-as-JSON.

### Step I — Q2 match-compute abstraction

**Question**: Is the existing match-compute code abstracted enough to cleanly add match persistence + 3-way GRN in WS-1a?

**Finding**: [server/services/agents/matchAgent.mjs](../server/services/agents/matchAgent.mjs) is at "intermediate" abstraction — data helpers exist but no dependency injection. See [blueprint audit §3.1](./ws1a-blueprint-audit.md).

**Refactor scope**: one commit, zero behavior change. Introduces `DEFAULT_FETCHERS` + `fetchers` parameter. `getGRNsForPO` is a stub returning `[]` in WS-1a; WS-1b swaps to a relational read.

**Ancillary finding**: 5 `ap_*` tables the match agent uses (`ap_invoice_match_results`, `ap_invoice_agent_decisions`, `ap_invoice_duplicate_checks`, `ap_invoice_document_hashes`, `ap_invoice_documents`) exist on Azure and have DDL in [server/migrations/002_agentic_agents.sql](../server/migrations/002_agentic_agents.sql). Already covered for fresh-DB setup as long as migration runner ordering places `002_agentic_agents.sql` before WS-1a chunks.

### Step J — Item B dynamic-SQL audit

**Question**: How many code sites filter on specific `invoices.status` or `processing_status` values? Each needs patching for dual-read-safe behavior during the transition window.

**Method**: Systematic grep across server code; classified each hit.

**Results**:
- **7 filter-by-value sites** (5 SQL + 2 JS) needing dual-read patch.
- **7 write sites** needing dual-write (separate concern; tracked in engine-work backlog).
- **~15 safe-read sites** (SELECT projects status but doesn't filter) — no patch needed.
- **0 SQL injection concerns** across orchestrator.mjs, workflowRoutingAgent.mjs, approvalService.mjs (all parameterized).

Full classification table in [blueprint audit §3.3](./ws1a-blueprint-audit.md).

**Patching strategy**: new `server/services/invoices/lifecycleMapping.mjs` helper as single source of truth for legacy → lifecycle_state mapping. Cross-check test asserts the JS helper produces identical output to the 2d SQL backfill CASE.

**Site 4 (inverse IN)** needs NULL-defensive patch:
```sql
AND (i.lifecycle_state IS NULL OR i.lifecycle_state != 'Under Verification')
```
Matches pre-migration behavior during the transaction window where lifecycle_state may be momentarily NULL.

**Per Message 3 rule**: 7 > 5 → dedicated patch commit (commit 2 in the rollout, between docs and migration).

### Step K — TDS seed draft (chunk 2e)

**Question**: What rates and thresholds seed `tds_section_config` for FY 2025-26 + FY 2026-27?

**Method**: drafted from training-era knowledge (per user's no-web-search instruction). Each row explicitly flagged with `verification_status`; none start as `'verified'` (reserved for consultant sign-off).

**Output**: 10 sections × 2 FYs = 20 rows (× 2 tenants on Azure dev = 40 rows total).

**Consultant-priority flags**:
- Top priority (blocks commit 4): **194H** (rate ambiguity — Finance Act 2024 reduced 5% → 2% but effective-date uncertain), **194I_A/B thresholds** (may have been raised by Finance Act 2025), **194Q** (user-flagged), **194R** (user-flagged), **all FY 2026-27 rows** (Finance Act 2026 uncertainty).
- Lower priority: 194C thresholds, 194J thresholds, 194A variants.

**Decision**: Seed lands as separate file `2e_tds_section_config_seeds.sql` (not folded into 2d) — keeps consultant review surface tractable. Commit 4 is gated on consultant sign-off. Commits 1-3 can proceed without waiting.

---

## Open items at end of verification phase

None for commit 1. The following gate later commits:

| Commit | Gate |
|---|---|
| Commit 4 (`2e` TDS seed) | Consultant sign-off on rates / thresholds / effective dates |
| Commit 5+ (engine work) | 194Q buyer turnover gate — decide whether to add `tenants.prior_fy_turnover` or `entities.prior_fy_turnover` column at engine-implementation time |
| Pre-commit-3 | Verify migration runner lexicographic ordering: `002_agentic_agents.sql → 20260421_multi_tenant_entity.sql → 20260424_ws1a_*`. Trigger runner in dry-run / list-order mode. |

---

## What was NOT verified and why

Deliberately out of scope for WS-1a verification:
- **Performance**: no load testing on the new indexes, expense voucher payload size, TDS YTD aggregate update patterns. Defer to WS-1a server-commits phase if any query timing becomes a concern.
- **Concurrency**: no race-condition analysis on dual-write during the transition window. Assumed acceptable given single-writer application layer (no direct DB writes from other services). Revisit if operational evidence shows drift between `status` and `lifecycle_state`.
- **Azure MySQL version specifics**: assumed MySQL 8.0+ (collation and GENERATED STORED evidence). Not verified against 5.7 or MariaDB.
- **TDS section completeness for non-AP contexts**: 194IA (land purchase), 194S (crypto/VDA), 194T (partnership-firm), 194O (e-commerce) left out of default seed per user guidance. Customer-specific sections ship as consultant amendments.

---

## Document provenance

Produced over ~30 rounds of review-and-approve during 2026-04-21 to 2026-04-24. Draft SQL files under [sql/mysql/migrations/_ws1a_drafts/](../sql/mysql/migrations/_ws1a_drafts/) are the authoritative migration reference. This file and companion docs (`ws1a-implementation-plan.md`, `ws1a-blueprint-audit.md`) are the human-readable explanation.
