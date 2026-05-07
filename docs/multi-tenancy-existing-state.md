# Multi-Tenancy — Reconciliation Addendum

**Read this ALONGSIDE `multi-tenancy-spec.md`.** When the addendum contradicts
the original spec, the addendum wins — it reflects what actually exists in
the repo as of 21 Apr 2026.

---

## 1. What already exists — do not rebuild

The following is committed on branch `wip-apr21-preserve-current-state` and
must be preserved and extended, not replaced.

### 1.1 Schema (file: `sql/mysql/migrations/20260421_multi_tenant_entity.sql`)

Tables created in the **default application schema** (e.g. `p2p_schema_mt`),
NOT in a separate `tenant_master` schema. All IDs are `VARCHAR(36)` UUIDs.

```
tenants (id, name, code, status ENUM('ACTIVE','INACTIVE'), created_at)
entities (id, tenant_id, name, code, currency, country, is_default, created_at)
user_entity_access (id, user_id, tenant_id, entity_id, role VARCHAR, is_default, created_at)
tenant_registry (tenant_id, db_host, db_name, db_user, db_password, created_at)  -- UNUSED; reserved
```

**Columns added to existing tables:**

- `user_master.user_master`: `tenant_id`, `default_entity_id`
- `item_master.item_master`: `tenant_id`
- `vendors`: `tenant_id`
- `purchase_orders`: `tenant_id`, `entity_id`
- `invoices`: `tenant_id`, `entity_id`

**Default seed:** `tenant-default-001` / `entity-default-001` with backfill
across all existing rows.

**Indexes:** present on all `tenant_id` and `(tenant_id, entity_id)` columns.

### 1.2 Services (file: `server/services/tenant/tenantAdmin.mjs`)

Already implemented:

- `getSuperAdminEmailSet()` — reads `SUPER_ADMIN_EMAILS` env
- `assertSuperAdminRequest(req)` — gate via `X-User-Email` header
- `buildPlatformContext(body)` — login-style lookup by email+password+tenantCode
- `listTenants()`, `createTenant({name, code})`
- `listEntitiesForTenant(tenantId)`, `createEntityForTenant(tenantId, body)`

### 1.3 Frontend (all in `src/`)

- `components/SuperAdminLogin.tsx` — delegates to `Login` with `variant="super_admin"`
- `components/SuperAdminLayout.tsx` — route guard + header + sign-out
- `components/SuperAdminConsole.tsx` — tenant + entity CRUD UI
- `components/PlatformEntityGate.tsx` — post-login entity picker when user has >1
- `utils/superAdmin.ts` — client-side `isSuperAdminUser()` check
- `contexts/AuthContext.tsx` — already exposes `user.platformEntities`,
  `user.tenantId`, `user.tenantName`, `user.tenantCode`, `confirmPlatformEntity()`

### 1.4 Tooling

- `server/scripts/runMultiTenancyMigration.mjs` — runner with `MIGRATE_DRY_RUN=1`
  support, Azure MySQL SSL handling, post-migration row count report
- Run with: `node --env-file=.env.mysql.local server/scripts/runMultiTenancyMigration.mjs`

---

## 2. Decisions already made — honor them

| Decision                                                | Rationale                                                                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| UUIDs (`VARCHAR(36)`) not BIGINTs                       | Already used everywhere; cross-tenant ID collision safety                                                                                        |
| Tables in default schema (p2p_schema_mt)                | Existing pattern; avoids cross-schema JOINs                                                                                                      |
| Idempotent additive SQL via `information_schema` checks | Pattern already established in migration 20260421                                                                                                |
| Frontend auth context models `platformEntities`         | Already used by `PlatformEntityGate`                                                                                                             |
| `tenant_registry` reserved but unused                   | Single-DB-multi-tenant is the correct approach; keep registry as a stub for a possible future DB-per-tenant escape hatch, but do NOT build on it |

---

## 3. Security issues to fix — **elevated to Phase 1**

### 3.1 Plaintext passwords in `user_master.payload`

In `server/services/tenant/tenantAdmin.mjs`, `buildPlatformContext()` compares:

```js
function rowPassword(payload) {
  return payload?.password ?? payload?.loginPassword ?? payload?.tempPassword ?? '';
}
// ... later ...
if (rowPassword(payload) !== password) {
  return { ok: false, error: 'invalid_credentials' };
}
```

Passwords are stored in cleartext in the JSON payload. This is critical and must
be fixed before any further RBAC work.

**Required:** migrate to `bcrypt` or `argon2` hashes. Add a login-time "rehash if
legacy" step so existing users transparently upgrade on their next login.

### 3.2 `SUPER_ADMIN_EMAILS` + `X-User-Email` header is trivially spoofable

`X-User-Email` is a client-supplied header with no signature. The server trusts
it. This must be replaced with a signed JWT or a server-issued session cookie.

**Required:** issue a JWT at login; require `Authorization: Bearer <jwt>` on all
protected endpoints; keep `X-User-Email` only as a **dev-only fallback** behind
`NODE_ENV !== 'production'`.

### 3.3 `is_platform_admin` should be a DB column, not an env allowlist

Env allowlists don't survive audit. Add `is_platform_admin TINYINT(1)` to
`user_master.user_master`, backfill from the current env list on first run, then
stop reading `SUPER_ADMIN_EMAILS`.

---

## 4. Revised phase plan

Supersedes Section 9 of the main spec. Each phase is incremental on the existing
codebase.

### Phase 0 — Cleanup & audit (no code)

- Delete macOS duplicate files (e.g. `src/components/InvoiceFormDirectV2 2.tsx`).
  Scan for any other files matching ` 2.` pattern.
- Confirm branch `wip-apr21-preserve-current-state` is pushed to origin (done).
- Agent proposes the full phase plan back to the human for approval.

### Phase 1 — Security hardening (CRITICAL — do first)

- `ALTER TABLE user_master.user_master ADD COLUMN is_platform_admin TINYINT(1) DEFAULT 0`
- One-off migration script: backfill `is_platform_admin=1` for every email in
  `SUPER_ADMIN_EMAILS` env at migration time. Log which users were upgraded.
- Replace `assertSuperAdminRequest()` in `tenantAdmin.mjs` to check the DB flag,
  not the env.
- Introduce `bcrypt` dependency. Add `payload.passwordHash` alongside legacy
  password fields. On successful legacy-password match during login, hash and
  store; on subsequent logins prefer the hash.
- Add `server/middleware/auth.mjs`:
  - `requireAuth(req)` — verifies `Authorization: Bearer <jwt>`, attaches `req.user`
  - `requireTenantScope(req)` — attaches `req.tenantId`, asserts user belongs to it
  - `requirePermission(code)(req)` — (stub for now; full RBAC lands in phase 3)
  - `requireSuperAdmin(req)` — checks `req.user.is_platform_admin`
- Issue JWT on successful login; frontend stores and sends it on all fetches
- Keep `X-User-Email` fallback ONLY when `NODE_ENV !== 'production'`
- Env additions: `JWT_SECRET`, `JWT_TTL_MINUTES` (default 480)

### Phase 2 — Extend tenant & entity schema

One migration file: `sql/mysql/migrations/20260422_tenant_entity_extensions.sql`

**Tenants — ALTER to add:**

```sql
-- Expand status enum (MySQL requires MODIFY, not ALTER COLUMN)
ALTER TABLE tenants MODIFY COLUMN status
  ENUM('TRIAL','ACTIVE','SUSPENDED','ARCHIVED','INACTIVE') NOT NULL DEFAULT 'TRIAL';

-- New columns (use information_schema idempotency pattern from existing migration)
ADD COLUMN plan ENUM('STARTER','PRO','ENTERPRISE') NOT NULL DEFAULT 'STARTER'
ADD COLUMN data_region VARCHAR(16) NOT NULL DEFAULT 'IN'
ADD COLUMN locale VARCHAR(16) NOT NULL DEFAULT 'en-IN'
ADD COLUMN timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata'
ADD COLUMN fiscal_year_start CHAR(5) NOT NULL DEFAULT '04-01'
ADD COLUMN branding_json JSON NULL
ADD COLUMN security_config_json JSON NULL
ADD COLUMN contract_start DATE NULL
ADD COLUMN contract_end DATE NULL
ADD COLUMN primary_contact_email VARCHAR(200) NULL
ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ON UPDATE CURRENT_TIMESTAMP
ADD COLUMN deleted_at TIMESTAMP NULL
```

**Entities — ALTER to add:**

```sql
ADD COLUMN parent_entity_id VARCHAR(36) NULL
ADD COLUMN legal_name VARCHAR(300) NULL
ADD COLUMN allowed_currencies_json JSON NULL
ADD COLUMN fiscal_year_start CHAR(5) NULL
ADD COLUMN tax_ids_json JSON NULL
ADD COLUMN registered_address_json JSON NULL
ADD COLUMN erp_company_code VARCHAR(32) NULL
ADD COLUMN status ENUM('ACTIVE','INACTIVE','ARCHIVED') DEFAULT 'ACTIVE'
ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ON UPDATE CURRENT_TIMESTAMP
ADD COLUMN deleted_at TIMESTAMP NULL
```

Add `UNIQUE KEY uk_tenant_code (tenant_id, code)` on entities.

**Frontend:**

- Extend `SuperAdminConsole.tsx` entity form to collect new fields
- Zod schemas in `src/schemas/tenant.ts` and `src/schemas/entity.ts`
- India-aware validation: if `country='IN'`, GSTIN + PAN required

### Phase 3 — RBAC tables & middleware enforcement

New tables (in default schema, UUIDs, same style as existing migration):

```
permissions_catalog (code PK, module_code, description)
roles (id, tenant_id NULL for system, code, name, description,
       is_system, permissions_json, created_at)
```

Migrate `user_entity_access.role VARCHAR` → `role_id VARCHAR(36)` FK to `roles.id`:

1. Add `role_id` column nullable
2. Backfill from existing `role` string into matching system role
3. Keep `role` column for one phase (deprecated) — drop in Phase 8

Seed system roles (all `is_system=1`, `tenant_id=NULL`): `TENANT_ADMIN`,
`ENTITY_ADMIN`, `REQUISITIONER`, `APPROVER`, `BUYER`, `AP_CLERK`, `AP_MANAGER`,
`SUPPLIER_ADMIN`, `AUDITOR` — with the permission bundles from spec Section 6.

Seed `permissions_catalog` from spec Section 5.4 comment block.

Wire `requirePermission(code)` middleware into every existing endpoint that
writes to `vendors`, `purchase_orders`, `invoices`, `user_master`, `entities`,
`tenants`. Audit these endpoints BEFORE touching them — produce a table of
"endpoint → required permission" for human review.

**Frontend:** `PermissionGuard.tsx`, `usePermission(code)` hook.

### Phase 4 — Module catalog + subscriptions + entity enablement

New tables:

```
modules_catalog (code PK, name, description, permissions_json, depends_on_json, is_active)
tenant_subscriptions (id, tenant_id, module_code, seat_count, starts_at, ends_at, status)
entity_modules (id, entity_id, module_code, enabled, config_json, updated_at)
```

Seed catalog: SUPPLIER, SOURCING, CONTRACTS, CATALOG, P2P, INVOICE, PAYMENT,
ANALYTICS, RISK.

Frontend: `ModuleMatrix.tsx` — rows = entities under tenant, cols = subscribed
modules, checkbox cells, disables children when parent off.

### Phase 5 — SoD + approval limits

- Extend `user_entity_access` with `approval_limit DECIMAL(18,2) NULL` + `approval_currency CHAR(3) NULL`
- New `sod_rules` table; seed system rules from spec Section 6
- Pre-assignment check in `POST /api/iam/users/:uid/assignments` → 409 with `rule_name`
- Runtime check in PR/PO/invoice approval endpoints (same-user conflicts)

### Phase 6 — Audit log

- Create `audit_log` table (append-only, no FKs, indexed on `(tenant_id, created_at)`)
- Add `server/lib/audit.mjs` with single `writeAudit({action, target_type, target_id, before, after, req})` function
- Call from every write endpoint touching: vendors, payments, `user_entity_access`, entities, tenants, roles, entity_modules
- Frontend: `/admin/audit` route with `AuditLogTable.tsx` (filter by actor, target, date range)

### Phase 7 — Tenant security config UI

Populate `security_config_json` from UI:

- SSO provider placeholder fields (provider, metadata URL, entityID) — store only
- IP allowlist CIDR array
- MFA required toggle
- Session timeout (minutes)

No actual SAML/OIDC integration in this phase — config storage + validation only.

### Phase 8 — UI polish + cleanup

- Search/filter on tenant list
- Status badges with color coding
- Pagination
- Setup checklist after tenant creation
- Impersonation banner (if impersonation endpoint is built in Phase 7)
- Drop deprecated `user_entity_access.role` VARCHAR column
- Drop `SUPER_ADMIN_EMAILS` env from docs (leave code paths as dev fallback)

---

## 5. Things to explicitly NOT do

1. **Do not create a `tenant_master` schema.** Everything stays in the default
   schema.
2. **Do not change IDs to BIGINT.** UUIDs stay.
3. **Do not use `tenant_registry`.** Single-DB multi-tenant via `tenant_id` is
   the chosen architecture.
4. **Do not remove `SUPER_ADMIN_EMAILS` env reading in Phase 1.** Keep it as a
   dev-only fallback until Phase 8.
5. **Do not rewrite `SuperAdminConsole.tsx`.** Extend it in place.
6. **Do not revert any Supabase → MySQL migration work** currently on
   `wip-apr21-preserve-current-state`.
7. **Do not touch the IMAP email poller or Gemini OCR** code paths in
   `server/services/invoiceIngestion/` — they are live and working.

---

## 6. Known mess to clean up

During Phase 0, the agent should flag and propose deletion of:

- `src/components/InvoiceFormDirectV2 2.tsx` (macOS Finder duplicate, note the space-and-2)
- Any other files matching regex ` 2\.` in their name (likely other iCloud artifacts)
- Check `server/` and `src/` for files ending in ` copy.*` or ` 3.*`

Run: `find . -path ./node_modules -prune -o -type f -print | grep -E ' [0-9]+\.' | grep -v node_modules`
