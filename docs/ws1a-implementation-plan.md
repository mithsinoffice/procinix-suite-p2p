# WS-1a — Implementation Plan

> **Scope**: invoice-centric backbone for the P2P automation platform.
> **Status**: verification phase complete (2026-04-24); commit 1 (this doc).
> **Target DB**: Azure MySQL 8.x, `p2p_schema_mt`.

---

## 1. Workstream structure

The original WS-1 was split into focused workstreams that can be reviewed, implemented, and shipped independently.

| Workstream | Scope | Status |
|---|---|---|
| **WS-1a** | Invoice-centric backbone: lifecycle + match persistence + duplicate wiring + listing columns + resubmission + voucher payload + minimal payments table + vendor ledger + TDS data model + GSTIN/GST validation + hybrid-KYC schema | This doc. Est. 2.5–3 sprints (expanded from 2–2.5 for Path 1 baseline + KYC hybrid). |
| **WS-1b** | PO/GRN lifecycle + SRN + bundles. Consumption cascade, line-type, service tolerance, bundle pricing. Also promotes goods_receipts, purchase_orders, vendor_advances, debit_notes from JSON-blob storage to relational tables. | Scheduled after WS-1a. Bundle pricing model decision deferred to WS-1b kickoff. |
| **WS-2** | Tally adapter. Consumes the expense voucher payload built in WS-1a, pushes to Tally, handles retries. | After WS-1a. |
| **WS-3** | Payment execution. Batching, allocations, bank file generation, UTR capture, reconciliation, payment voucher on payments table. | After WS-2, parallel with WS-TAX. |
| **WS-TAX** | Indian tax compliance. GSTR-2B import + reconciliation, TDS payable ledger, TDS payment scheduling, Form 26Q export. Shares TDS challan payment contract with WS-3. | After WS-2, parallel with WS-3. |
| **WS-KYC** | Real KYC provider integration. Surepass/OnGrid adapters, penny-drop bank verification, director KYC, credential management, async retry jobs. Consumes the hybrid-KYC schema that lands in WS-1a. | After WS-1a. Parallel with WS-TAX / WS-3. Provider choice (Surepass, OnGrid, or both) deferred to WS-KYC kickoff based on commercial terms and customer feedback. Sandbox credentials should be requested at WS-1a close (1–2 week lead time). |

---

## 2. WS-1a scope — decisions locked

### 2.1 Lifecycle model (Q1 / Q2 / Q3)

**7-state lifecycle DAG** on `invoices.lifecycle_state` ENUM:

```
'Ingested' → 'OCR Extracted' → 'Under Verification' → 'Processed' → 'Queued for Payment'
                                       │                     │
                                       ↓                     ↓
                                'Exception Hold'        (payments ledger ownership)
                                       │
                                       └────────→ 'Rejected' (terminal)
```

- **Resubmission is a FLAG, not a state.** Resubmitted invoices enter at `Ingested` (or `OCR Extracted`) with `resubmission_count > 0` and `source_invoice_id` pointing to the rejected parent. Do NOT add `'Re-submitted'` to the enum.
- **Rejection is terminal.** Resubmit creates a new invoice row with cloned OCR + line items + vendor + PO link + entity + attachment. Does NOT clone approval history, audit log, match result, duplicate check, voucher status, rejection reason, TDS computation.
- **Rejection reason**: mandatory dropdown (`invoice_rejection_reasons` config table, per-tenant seeded with 7 reasons: Data error, Missing documentation, Vendor error, Policy violation, Duplicate, Quality issue, Other); free-text note optional unless code='Other'.
- **Dual-write strategy** during the transition window: new code writes both legacy columns (`status`, `processing_status`) and `lifecycle_state`. New code reads `lifecycle_state`. Legacy columns are write-only; retirement PR lands when a grep audit of agent/OCR/dashboard/analytics codepaths is clean (backlog).

**Backfill CASE from legacy status** (defined in migration 2d):
```
LOWER(status)='draft' + processing_status IN ('exception','failed')  → 'Exception Hold'
LOWER(status)='draft'                                                → 'Ingested'
LOWER(status) IN ('pending','pending_approval','changes_requested')  → 'Under Verification'
LOWER(status)='approved' + EXISTS unresolved exception               → 'Exception Hold'   [Q3]
LOWER(status)='approved'                                             → 'Processed'
LOWER(status)='rejected'                                             → 'Rejected'
LOWER(status)='paid'                                                 → 'Processed'
```

### 2.2 Duplicate detection (Q4 / Q5)

**Tiered per-tenant detection** configured via `invoice_duplicate_config`:

| Tier | Match condition | Action |
|---|---|---|
| Tier 1 (hard block) | `vendor_id + invoice_number + financial_year + invoice_date + amount + tenant_id + entity_id` all match | Block; exception approval required |
| Tier 2 | `vendor_id + invoice_number + FY + tenant_id + entity_id` match; date or amount differs | Block; mandatory override reason |
| Tier 2b (silent accept) | `vendor_id + invoice_number + tenant_id + entity_id` match, different FY | Legitimate per GST; log `cross_fy_invoice_number_reuse` |
| Tier 3 (soft warn) | `vendor_id + invoice_number + tenant_id` match, different entity_id | Warn; no block |
| Tier 4 (fuzzy) | composite score from prefix + amount tolerance + date window + period-overlap | Exception approval if over threshold |

**Vendor fallback** when `vendor_id` NULL: normalize `vendor_name` (strip whitespace/punctuation, case-fold, remove suffixes `Ltd / Pvt / Pvt Ltd / Inc / Limited / LLP / Corp / Corporation / Co`), then match. Any fallback-match → exception approval regardless of tier.

**Cached decision**: `invoices.duplicate_decision` ENUM(`'clear','tier_4_fuzzy','tier_3_cross_entity','tier_2_probable','tier_2b_cross_fy','tier_1_hard'`), with `duplicate_checked_at` timestamp. Override tracked via `duplicate_override_by / _at / _reason` triple.

**Resubmission exception**: duplicate check skips comparison against `source_invoice_id` parent (otherwise every resubmission would Tier-1 against its own rejected parent).

**Period-overlap signal** (new in Q4): identical-period=40 points, contained=30, partial=15. Defaults from Message 2.

**Fuzzy match config zero-behavior-change**: the current `duplicateFraudAgent.mjs` uses binary AND on `prefix(6) + vendor + amount ±1% + date ±7 days` with `risk_score=70` threshold. These values seed into `invoice_duplicate_config` literally. The Q4 weighted-tier engine (shipping in a later commit) populates the weight columns (`fuzzy_prefix_weight`, `fuzzy_amount_weight`, `fuzzy_date_weight`, `amount_tolerance_rupees`) via UPDATE at that commit; they stay NULL until then. Agent code MUST NOT fall back to hardcoded defaults if config row missing (prevents silent drift).

### 2.3 3-way match persistence (Q6)

- 3-way match persistence stays in WS-1a. **Existing match logic runs unchanged.**
- `invoices.match_result` ENUM(`'Fully Matched','Qty Mismatch','Rate Variance','Tolerance Breach','Partially Matched','Unmatched','Not Applicable'`), `match_score` DECIMAL(5,2), `match_details` JSON snapshot, `match_computed_at` DATETIME.
- `match_details` captures PO/GRN line values (qty, rate, tax) at match time. **Reproducible from stored data alone.**
- Recompute only on: invoice-side match-relevant changes, or explicit `POST /api/invoices/:id/match`. No auto-recompute from PO/GRN changes. No trigger.
- Consumption cascade + line-type awareness + SRN + bundles → WS-1b.

**`match_result` is a pure outcome enum, orthogonal to matchType**. `match_result` answers "did the match succeed, and if not, why?" (`Fully Matched` / variance-type / `Unmatched` / `Not Applicable`). Separately, `matchAgent.mjs` produces an internal `matchType` (`'2way_po', 'service_po', 'recurring', 'none'`) that answers "how was the match attempted?" When the match engine commit ships, it populates `match_result` from its internal variance analysis; `matchType` remains the method descriptor (not persisted as an ENUM in WS-1a — lives in `match_details` JSON if needed).

**Match compute refactor (WS-1a commit)**: [server/services/agents/matchAgent.mjs](../server/services/agents/matchAgent.mjs) is at "intermediate" abstraction (helpers isolate data access but no dependency injection). A small refactor adds a `fetchers` parameter with `DEFAULT_FETCHERS` containing `getPOExact / getPOFuzzy / getRecurringInvoices / getGRNsForPO / getTolerances / getSnapshotValues`. Zero behavior change at WS-1a time; WS-1b swaps `getGRNsForPO` to a relational table read. Separate commit from match persistence.

**Match tolerances != duplicate tolerances**: when match tolerances eventually move from hardcoded literals (currently 5% on 2-way, ±5% / 90 days fuzzy, ±10% / 6 months recurring) to a config table, use a **separate `match_tolerance_config` table** — do NOT unify with `invoice_duplicate_config`. Different risk profiles.

### 2.4 last_action denormalization (Q7)

- `invoices.last_action` VARCHAR(32), `last_action_at` DATETIME + DESC index.
- **Application-layer sync** (not DB trigger): every audit log write updates parent invoice in same transaction.
- Daily invariant job verifies `invoices.last_action_at = MAX(invoice_audit_log.created_at)` AND `invoices.last_action` = the `action` string of that latest audit row, per invoice. Alert on drift of either field.
- Backfill populates from audit log where available; fallback `COALESCE(created_at, updated_at, NOW())` for legacy rows. **Rationale**: on Azure dev all `updated_at` values are identical (batch-write artifact from the multi-tenant migration adding `tenant_id` / `entity_id`), so `created_at` is the honest proxy.

### 2.5 Module ownership for Tally vouchers

- **`expense_voucher_*` fields on invoices**. Owned by Invoice module. Fired on `Processed` transition. **WS-1a scope.**
- **`payment_voucher_*` fields on `payments` table**, NOT on invoices. Owned by Payment module. **WS-3 scope** — NOT created on invoices in WS-1a.
- Invoice listing surfaces payment voucher status via `LEFT JOIN payments`.

**Expense voucher payload** (WS-2 consumes; WS-1a builds):
```json
{
  "voucher_type": "Purchase",
  "date": "2026-04-24",
  "reference": "INV-2026-0145",
  "narration": "...",
  "debit_lines":  [{ "ledger": "Professional Fees",       "amount": 100000, "cost_center": "HO" }],
  "credit_lines": [{ "ledger": "ABC Consulting - Payable", "amount": 90000 },
                   { "ledger": "TDS Payable - 194J",       "amount": 10000 }]
}
```

### 2.6 Payments as ledger

Minimal `payments` table in WS-1a (one invoice → many payments). Expanded in WS-3 for overpayments, vendor advances reconciliation, TDS/retention modeling, payment reversals, FX, batched allocations.

```
payments: id, tenant_id, entity_id, invoice_id, payment_date, utr, amount, payment_mode,
          status ENUM('queued','initiated','confirmed','failed','reconciled'),
          notes, created_at, updated_at
```

`entity_id` is NULL-able in WS-1a (synthesis-from-paid populates it from source invoice; WS-3 insert paths must set it explicitly). WS-3 scope: consider tightening to NOT NULL once all insert paths are verified. Indexed as `idx_payments_entity` for entity-scoped ledger queries.

**Paid-invoice payment synthesis** (migration 2d): historical `status='paid'` invoices get a synthesized payment row per invoice (`payment_mode='unknown'`, `status='confirmed'`, `notes='Synthesized from historical status=paid …'`), skipping rows where `total_amount IS NULL`. Azure dev has zero Paid invoices; synthesis is no-op-safe for other environments.

### 2.7 Vendor ledger

Composable aggregator pattern. Each source exposes:
```
getLedgerEntries(vendorId, entityId, fromDate, toDate)
  → [{ doc_date, doc_type, doc_ref, doc_id, debit, credit, narration, status, source_table }]
```

**WS-1a sources**: Processed invoices → credit rows, Confirmed payments → debit rows. Opening balances in `vendor_opening_balances` (per vendor × entity × FY). Entity-scoped only in WS-1a. Group-wide ledger deferred.

Vendor detail page: Identity + Entity relationships (per-entity GL code, payment terms, credit days, credit limit) + per-entity Ledger tabs.

### 2.8 TDS data model (WS-1a scope)

**Line-level TDS** on `invoice_line_items`: `tds_applicable`, `tds_section`, `tds_rate`, `tds_base_amount`, `tds_amount`, `tds_threshold_exempted`, `tds_certificate_ref`.

**Effective-dated per-tenant config** in `tds_section_config` (rates, thresholds, behavior, with `verification_status` ENUM(`'verified','assumed_from_training','pending_consultant_review'`) for consultant sign-off tracking). Separate seed file (`2e_tds_section_config_seeds.sql`) gated on consultant review before commit 4.

**YTD aggregates** in `tds_ytd_aggregates` keyed by (tenant, vendor, entity, FY, section) — updated on `Processed` transition.

**Per-entity override** via `vendor_entity_mappings.default_tds_section_override`. Engine resolution order: entity override → `vendor_pan_compliance.tds_sections` (vendor default) → `tds_section_config` fallback.

**TDS deduction engine — 8 steps** (at invoice save). *Note: consolidated from Message 2's 9 steps — YTD aggregate update folded into step 8 as a transactional side-effect of storing tds_amount, not a distinct computation.*
1. Look up active `tds_section_config` for section as of `invoice_date`
2. Section resolution: entity override → vendor default → config
3. Check `vendor_pan_compliance.section_206ab` — if `'specified_person'` or `'non_filer'`, apply 206AB rate (higher of 2× configured rate OR 5%). Stacks with 206AA when PAN missing — apply whichever is higher.
4. Check PAN on `vendor_pan_compliance.pan` — if missing, use 206AA (`pan_not_available_rate`, default 20%)
5. Compute `tds_base_amount` per `applies_to_base`
6. Check `vendor_pan_compliance.lower_tds_section + lower_tds_cert_number + lower_tds_cert_valid_from / _valid_to / _rate` — if section matches AND `invoice_date` within validity range AND rate populated, use cert rate. If section matches but cert fields incomplete → route to exception `incomplete_lower_tds_certificate`. Special case: `lower_tds_section='section_206aa'` is semantically mismatched (206AA is no-PAN penalty, not a cert) → engine logs a warning and passes through to `not_applicable` handling. Enum cleanup logged to WS-1b.
7. Apply rate + threshold logic per `threshold_crossing_behavior` (default `catch_up`). Catch-up: when aggregate crosses threshold, TDS payable is for full catch-up amount in the current month. Earlier invoices stay booked; only current invoice's expense voucher carries TDS split.
8. Store `tds_amount` on line; update `tds_ytd_aggregates` on `Processed`.

**Engine failure mode** when `tds_section_config` row missing (pre-consultant-sign-off window): if invoice has no TDS applicable, skip cleanly + log info. If invoice has TDS applicable but no matching config, route to exception `tds_section_config_missing`, **block Processed transition**. Must NOT fall back to hardcoded rates (enforces Q5 no-hardcoded-fallback rule).

**194Q buyer turnover gate**: section 194Q only applies when buyer's prior-FY turnover > ₹10 cr. Requires a column on tenants or entities (`prior_fy_turnover DECIMAL(18,2)`). Logged to engine-work backlog; engine implementation commit adds it.

**TDS seed rows (ships as commit 4, gated on consultant)**:
10 sections × 2 FYs (FY 2025-26 + FY 2026-27): `194C_IND, 194C_OTH, 194J_PRO, 194J_TECH, 194I_A, 194I_B, 194H, 194Q, 194A, 194R`. All FY 2026-27 rows flagged `pending_consultant_review` due to Finance Act 2026 uncertainty. FY 2025-26 rows use `assumed_from_training` where confidence is high (194C, 194J, 194A) and `pending_consultant_review` elsewhere. Specifically flagged for consultant: **194Q, 194R, 194H** (rate ambiguity), **194I_A/B thresholds**, **all FY 2026-27 rows**.

### 2.9 GSTIN validation & GST computation

**Three levels of GSTIN validation**:
- Level 1 — format + checksum. Offline, always on. Reject invalid at form field.
- Level 2 — GSTN portal verification via the hybrid KYC flow (§2.10). Called when `kyc_check_config.gstin.enabled=TRUE`. Result stored on `vendor_gst_registrations.verification_source / _at / _reference / _raw_response`. Manual-mode tenants skip Level 2; Level 1 and Level 3 still apply.
- Level 3 — match validation at invoice save:
  - Supplier GSTIN must match one of vendor's `vendor_gst_registrations` rows → hard block on mismatch.
  - State code in GSTIN vs vendor's state → warning on mismatch.
  - PAN embedded in GSTIN (chars 3-12) vs vendor PAN → hard block (fraud signal).
  - Same rules for recipient GSTIN against entity's registered GSTINs.

**Note**: `vendor_gst_registrations` does not have an `is_primary` column. WS-1a Level 3 match treats any active row as a valid supplier match. Primary concept exists at UI level only (row 0 convention). If primary-specific behavior is later required, logged to WS-1b.

**GST auto-computation** (per line): given `taxable_amount + gst_rate`, compute CGST/SGST/UTGST/IGST/Cess based on place-of-supply vs receiving-entity-state. Same state → CGST+SGST; different → IGST. RCM diverts GST to self-liability.

**OCR GST variance handling** (per `gst_validation_config`):
- ≤ `rounding_tolerance_rupees` (default ₹1) → exact, no flag.
- ≤ `minor_variance_rupees` (default ₹10) OR ≤ `minor_variance_pct` (default 0.5%) → auto-correct, log to `invoice_line_items.gst_ocr_discrepancy`.
- > minor variance → material flag, route to exception with reason `gst_variance`.

### 2.10 KYC hybrid model

**WS-1a owns**: schema (configs + per-check source columns) + manual-entry mode. **WS-KYC owns**: provider adapters, real-time API flows, penny-drop bank verification, director KYC, credential management, async retry jobs.

**Per-tenant config**:
- `kyc_provider_config` — `kyc_enabled`, `primary_provider ENUM('surepass','ongrid','manual')`, `fallback_provider`, `api_credentials_ref` (secrets vault reference, NOT raw keys), `api_unavailable_behavior ENUM('block','pending_retry')`.
- `kyc_check_config` — per-tenant × per-check-type (`pan, gstin, msme, cin, section_206ab, bank_account, director_kyc`) with `enabled`, `is_mandatory`, `provider_override`.

New tenants start in **manual-only mode** (kyc_enabled=FALSE, all checks disabled). API enablement is a deliberate config change per tenant × per check.

**Per-check source tracking** on `vendor_pan_compliance` (PAN, MSME, CIN, section_206ab — 4 checks × 3 cols = 12 new columns): `<check>_verification_source ENUM('api_surepass','api_ongrid','manual','pending_verification','not_verified')`, `<check>_verified_at DATETIME`, `<check>_verification_reference VARCHAR(128)`.

**Per-row source tracking** on `vendor_gst_registrations` and `vendor_bank_accounts`: 4 cols each — `verification_source`, `verified_at`, `verification_reference`, `verification_raw_response JSON`.

**Lower TDS certificate** additions on `vendor_pan_compliance` (schema gap filler): `lower_tds_cert_valid_from DATE`, `lower_tds_cert_valid_to DATE`, `lower_tds_cert_rate DECIMAL(5,2)`. Form captures all three; engine uses them at TDS step 6.

**Section 206AB tri-state**: enum values `not_applicable, specified_person, non_filer`. Engine treats `!= 'not_applicable'` as "apply 206AB higher rate"; preserves specific value for audit. Stacks with 206AA when PAN also missing (apply higher of the two).

**Existing KYC columns on `vendor_pan_compliance` stay frozen** (field preservation rule): `kyc_verified, kyc_verified_at, kyc_provider, kyc_raw_response, directors_json, date_of_incorporation`. Not read/written by new code. Legacy data preserved.

### 2.11 Vendor form UI additions (WS-1a client-commits)

- Source-chip next to each verifiable KYC field: "Manual" (grey), "Verified (Surepass)" (green), "Not verified" (amber), "Pending" (blue). Full timestamp on hover. Hide chip when underlying field empty.
- Multi-select for vendor default `tds_sections` (currently schema-only, no UI — form sends `[]` today).
- Lower-TDS certificate: add `valid_from`, `valid_to`, `rate` input fields.
- Form persistence handler fixes (single "vendor-handler persistence cleanup" commit): persist `client_erp_vendor_code`, `credit_days`, `credit_limit`. Align `vendor_entity_mappings` CREATE path's INSERT to include `block_for_po / _reason / block_for_payment / _reason` (currently only on UPDATE path — see [ws1a-blueprint-audit.md](./ws1a-blueprint-audit.md) §2.2 drift table, drift 5).
- KYC source-tracking writes: when ops verifies a field via provider call (or enters manually), record source + timestamp + reference.

---

## 3. Rollout order (commits)

Each commit is reversible and additive. Review-gated.

| # | Commit | Contents | Dependencies |
|---|---|---|---|
| 1 | `docs: ws1a blueprint audit + implementation plan + verification responses` | This doc + companion docs under `/docs/` | none |
| 2 | `feat(server): dual-read patches on legacy status filters (Item B)` | `server/services/invoices/lifecycleMapping.mjs` helper + 5 SQL site patches + 2 JS site patches + tests. Uses option (b) `OR lifecycle_state=…` pattern. Site 4 inverse-filter handled with NULL-defensive `IS NULL OR != 'Under Verification'`. Cross-check test: JS helper maps identically to 2d SQL CASE. | commit 1 |
| 3 | `feat(db): ws1a migration baseline + alters + new tables + seeds/backfills (excluding TDS seeds)` | Migration chunks 2a-2d from [sql/mysql/migrations/_ws1a_drafts/](../sql/mysql/migrations/_ws1a_drafts/). **Does NOT include 2e** (TDS section_config seeds) — 2e ships as commit 4, gated on consultant review. Validation: dump-roundtrip diff on 2a byte-matches Azure. | commits 1–2 |
| 4 | `feat(db): ws1a TDS section_config seed (consultant-verified)` | `2e_tds_section_config_seeds.sql`. **Gated on consultant sign-off.** Row verification_status flipped from `pending_consultant_review` → `verified` by consultant UPDATE. | commits 1–3 + consultant review |
| 5+ | Server engines + dual-write patches + client commits (see client-commits / engine-work backlog below) | — | commits 1–3 |

**Migration file naming**: WS-1a chunks should use a date-prefix like `20260424_ws1a_*` so they sort after existing `002_agentic_agents.sql` and `20260421_multi_tenant_entity.sql` in the migration runner's lexicographic order.

**Migration runner order verification** (quick pre-commit-3 check): trigger migration runner in dry-run / list-order mode. Confirm order is:
```
… → 002_agentic_agents.sql → 20260421_multi_tenant_entity.sql → 20260424_ws1a_2a.sql → 2b → 2c → 2d → …
```
If order is wrong (runner sorts arbitrarily), fix naming before first fresh-DB attempt.

---

## 4. Schema changes at a glance

Full SQL in [sql/mysql/migrations/_ws1a_drafts/](../sql/mysql/migrations/_ws1a_drafts/). Summary:

**2a — Baseline (drift-fill)**: 12 `CREATE TABLE IF NOT EXISTS` statements — `vendors, vendor_spocs, vendor_pan_compliance, vendor_gst_registrations, vendor_bank_accounts, vendor_entity_mappings, invoices, invoice_line_items, invoice_exceptions, purchase_orders, approvals, domain_documents`. Byte-identical to Azure mysqldump (verified). Enables fresh-DB provisioning from migrations.

**2b — ALTER additions** (75 `ADD COLUMN` + 10 `CREATE INDEX`, all idempotent via `information_schema.COLUMNS` existence check):

| Table | Columns added | Purpose |
|---|---|---|
| `vendors` | 1 | Drift fix: `client_erp_vendor_code` |
| `vendor_pan_compliance` | 15 | 3 lower-TDS-cert validity/rate + 12 KYC source-tracking (PAN/MSME/CIN/206AB × 3) |
| `vendor_gst_registrations` | 4 | KYC per-row source-tracking |
| `vendor_bank_accounts` | 4 | KYC per-row source-tracking (penny-drop target for WS-KYC) |
| `vendor_entity_mappings` | 3 | Drift fixes (`credit_days`, `credit_limit`) + `default_tds_section_override` |
| `invoices` | 33 | Lifecycle (1), FY + service period (3), resubmission (2), rejection (2), vendor link (2), last-action denorm (2), expense voucher (6), 3-way match (4), duplicate detection (5), GST (6) |
| `invoice_line_items` | 15 | TDS line-level (7) + GST breakdown (8). Reuses existing `hsn_sac` + `gst_rate` — no duplicates. |

**2c — New tables** (10 `CREATE TABLE IF NOT EXISTS`):

| Section | Tables |
|---|---|
| Transactional | `invoice_audit_log` (16 cols incl. tenant_id, actor_role, actor_source, invoice_state_hash, composite indexes), `payments` |
| Per-tenant config | `invoice_rejection_reasons`, `invoice_duplicate_config` (Q5 — period-overlap defaults explicit; Q4 fuzzy-weight columns NULL), `tds_section_config` (with verification_status metadata), `gst_validation_config`, `kyc_provider_config`, `kyc_check_config` |
| Aggregate | `tds_ytd_aggregates`, `vendor_opening_balances` |

**FK policy**: No foreign keys in 2c — `tenants` and `entities` use `COLLATE=utf8mb4_unicode_ci` from the multi-tenant migration, while baseline business tables use `utf8mb4_0900_ai_ci`. An FK to `tenants(id)` would force collation downgrade on new tables and break JOINs with "Illegal mix of collations". Existing schema carries `tenant_id` without FK enforcement — new tables follow suit. Collation harmonization → WS-1b gap list.

**2d — Seeds + backfills**:
- **Seeds** (per-tenant via `INSERT … SELECT FROM tenants WHERE status='ACTIVE'`): 14 rejection reasons, 2 duplicate configs, 2 GST configs, 2 KYC provider configs, 14 KYC check configs (on 2-tenant Azure dev).
- **Invoice backfills**: `lifecycle_state` (CASE per §2.1), `financial_year` (India Apr-Mar, `YYYY-YY`), `vendor_id + vendor_id_match_confidence` (strict match via ROW_NUMBER priority: legal name 100, code 100, trade name 90; unresolved logged for ops UI review), `last_action / last_action_at` (`COALESCE(created_at, updated_at, NOW())`).
- **Paid-invoice payment synthesis**: no-op-safe INSERT pattern (§2.6).
- **Audit log backfill**: one `lifecycle_state_backfilled` entry per invoice; one `migrated_to_exception_hold` entry per Q3-migrated invoice (0 rows on dev).

**2e — TDS section_config seeds**: 10 sections × 2 FYs × 2 tenants = 40 rows. All annotated with `verification_status` and `verification_note`. Gated on consultant sign-off.

---

## 5. Verification_status workflow (tds_section_config)

Values: `'verified'`, `'assumed_from_training'`, `'pending_consultant_review'`.

Lifecycle:
1. Seed (commit 4) — rows land as `assumed_from_training` or `pending_consultant_review`. None start as `'verified'`.
2. Consultant reviews the seed file (tracked as external review packet — Google Doc / PDF annotated).
3. Consultant signs off per-row. Ops flips via trivial UPDATE: `UPDATE tds_section_config SET verification_status='verified', verified_by=<name>, verified_at=NOW(), verification_note='…' WHERE tenant_id=? AND tds_section=? AND effective_from=?`.
4. Consultant priority:
   - **Top priority (block commit 4)**: 194H (rate + effective date), 194I_A/B (thresholds), 194Q, 194R, all FY 2026-27 rows.
   - **Lower priority (post-commit-4 OK)**: 194C thresholds, 194J thresholds, 194A variants.
5. Engine does NOT read `verification_status` — it's metadata only for audit.

If consultant later finds a Finance Act amendment mid-FY, add a new row with appropriate `effective_from` and close the old row's `effective_to`. No migration file needed — maintenance-console UPDATE/INSERT.

---

## 6. WS-1b gap list (consolidated)

Deferred items that recurred or surfaced during WS-1a verification:

### PO / GRN / service infrastructure
1. **SRN is not a thin clone of GRN.** Milestone/period/value-based UI required. Allocation step (Part B of GoodsReceipt.tsx) doesn't apply to services.
2. **Promote `goods_receipts, vendor_advances, debit_notes, purchase_orders` from JSON blob to relational tables.** `purchase_orders` is partially relational (CREATEd here but many agents still read JSON-blob GRN).
3. **Match compute fetcher abstraction to swap from JSON reads to table reads** (once the tables above exist). WS-1a ships the fetcher pattern with `getGRNsForPO` returning `[]`; WS-1b fills it in.
4. **Consumption cascade rule** (PO/GRN line locking, close-out action).
5. **PO line_type** (goods/service) distinction.
6. **Service tolerance config** (`service_po_tolerance_config` + PO-level override).
7. **Line-type-aware match logic** (amount match for services, qty+rate match for goods).
8. **Bundle PO structure** (sub-items, pricing models — decision on Path 1/2/3 at start of WS-1b).

### Data-model cleanup
9. **Per-tenant FY configuration for non-India tenants.** WS-1a bakes India Apr-Mar FY into the backfill. When a non-India tenant is in scope, add FY-start config to tenants or entities and parameterize 2d-equivalent backfill logic.
10. **`invoice_exceptions.invoice_id` is NULLABLE** — data integrity gap; should be NOT NULL with FK.
11. **Schema-wide collation harmonization** (tenants + entities = `utf8mb4_unicode_ci`; business tables = `utf8mb4_0900_ai_ci`). Decide single schema-wide collation, migrate, then retroactively add tenant_id FKs. Pre-existing issue not introduced by WS-1a.
12. **`vendor_pan_compliance.lower_tds_section` enum cleanup.** `'section_206aa'` value is semantically mismatched with the column name (206AA is no-PAN penalty, not a lower-deduction certificate). Either remove the value (no data uses it on Azure dev) or split into a dedicated `pan_missing_206aa_applies BOOLEAN` column.
13. **`vendor_gst_registrations.is_primary` flag** — if primary-specific Level 3 GSTIN match behavior is required, add column + form edit.
14. **`vendor_entity_mappings` additional columns** — entity-specific bank account, default location (form doesn't capture these yet).

### Tech-debt / quality
15. **Handler consistency audit** (separate track, not WS-1b): systematic CREATE-vs-UPDATE symmetry check across entity handlers (`invoices`, `purchase_orders`, `goods_receipts-as-JSON-blob`, `vendor_advances-as-JSON-blob`). Drift 5 (vendor_entity_mappings block_* fields) suggests the pattern may exist elsewhere. Code-quality issue, not data-model issue. Trackable separately.

---

## 7. Client-commits backlog (WS-1a)

Tracked for the WS-1a sprint beyond commit 3:

1. Vendor form: add default `tds_sections` multi-select, lower-TDS-cert validity + rate fields, source-chip display per KYC field.
2. Vendor-handler persistence cleanup: persist `client_erp_vendor_code` + `credit_days` + `credit_limit` (both CREATE and UPDATE paths); align `vendor_entity_mappings` CREATE to include `block_for_po / _reason / block_for_payment / _reason`. Same commit handles KYC source-tracking writes per hybrid model.
3. Seed-on-tenant-creation hook: when a new tenant is provisioned, automatically seed `invoice_rejection_reasons` × 7, `invoice_duplicate_config` × 1, `gst_validation_config` × 1, `kyc_provider_config` × 1, `kyc_check_config` × 7. Trigger: the vendor-handler code path that creates tenants, OR a tenant-provisioning service.
4. Invoice listing: Payment Progress column (`₹X / ₹Y paid · M of N settled`), new chips (lifecycle, duplicate, match, TDS, GSTIN), activity drawer.
5. Invoice detail: Payments section (ledger + rollup), GST section, TDS section.
6. Resubmission UX: banner + diff panel against rejected parent + "Nth submission" chip + vendor rejection-rate chip.
7. Forms: duplicate-override dialog, rejection-reason dialog, GSTIN fields + place-of-supply + gst_invoice_type + ITC eligibility.
8. Vendor detail: identity + entity relationships + ledger tabs (per accessible entity).

---

## 8. Engine-work backlog (WS-1a server commits)

Tracked for WS-1a sprint beyond commit 2/3/4:

1. Match-compute fetcher-injection refactor + tests (one commit, zero behavior change).
2. Match persistence commit: write `invoices.match_result / match_score / match_details / match_computed_at` on top of existing `ap_invoice_match_results` write. **Clarifying note**: `match_result` is a pure outcome enum (`'Fully Matched','Qty Mismatch','Rate Variance','Tolerance Breach','Partially Matched','Unmatched','Not Applicable'`). It is orthogonal to the agent's internal `matchType` (`'2way_po','service_po','recurring','none'`), which describes HOW the match was attempted. The engine commit populates `match_result` from its variance analysis; the matchType value (if preserved) lives inside `match_details` JSON, not as a separate ENUM column.
3. Lifecycle transition guard + audit log promotion + last_action application-layer sync.
4. Dual-write on 7 write sites (see Item B audit): every write to `invoices.status` or `processing_status` must also write `lifecycle_state`.
5. New lifecycle endpoints: `verify / exception / resume / reject / resubmit` (with clone logic) `/ match`.
6. Duplicate tiered-detection engine (Q4) — writes to `duplicate_decision` cache; consumes `invoice_duplicate_config`.
7. GSTIN validation utilities + Level 3 match logic.
8. GST auto-computation engine + OCR validation comparison.
9. TDS deduction engine (8-step) + YTD update + `expense_voucher_payload` builder. **Includes the `section_206aa` pass-through-with-warning log** per §2.8.
10. **194Q buyer turnover gate**: add `tenants.prior_fy_turnover DECIMAL(18,2)` (or `entities.prior_fy_turnover` — decision at engine-commit time). Engine reads this before applying 194Q; if unset, 194Q doesn't apply regardless of other conditions.
11. Vendor ledger aggregator + invoice source + payment source.
12. Listing endpoint with new columns including Payment Progress, last_action.

---

## 9. Cross-workstream communication notes

- **WS-2** reads `invoices.expense_voucher_payload` (JSON) and posts to Tally. Contract: WS-1a builds payload; WS-2 consumes. Columns `expense_voucher_status / _id / _posted_at / _error / _retry_count` owned by WS-2.
- **WS-3** owns `payments` rows and `payment_voucher_*` fields on payments. Shares payment execution contract with WS-TAX for TDS challan.
- **WS-TAX** shares `tds_section_config` + `tds_ytd_aggregates` with WS-1a. WS-TAX adds GSTR-2B import + Form 26Q export + TDS payable ledger.
- **WS-KYC** reads `kyc_provider_config` + `kyc_check_config`, flips `primary_provider` from `'manual'` to `'surepass'` / `'ongrid'`, writes `verification_source='api_surepass'` etc. + `verification_raw_response` payload. Zero schema changes needed when WS-KYC lands — schema is complete after WS-1a.
