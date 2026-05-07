# Multi-Tenancy & Access Control — Implementation Spec

**Repo:** Procinix S2P
**Status:** Draft v1 for implementation
**Audience:** Cursor agent + engineering reviewers

---

## 1. Context

**Current state:**

- Two-level hierarchy working: tenant → entity
- Super-admin gated by `SUPER_ADMIN_EMAILS` env + `X-User-Email` header
- Tenant: code, name, status
- Entity: code, name, currency, country, is_default
- Stack: Node ESM, `http.createServer` (no Express), `mysql2/promise` pool against Azure MySQL
- Multi-schema pattern: `user_master`, `item_master`, `p2p_schema_mt`, etc.
- Frontend: React 18 + Vite + TS, Tailwind, shadcn in `src/components/ui/`

**Gaps:**

- No real RBAC — authorization is a single email allowlist
- No module subscription; no per-entity module enablement
- Entity missing legal/tax/fiscal fields (GSTIN, PAN, fiscal year, parent entity, etc.)
- No Segregation of Duties (SoD), no approval limits, no audit trail
- No tenant-level security controls (SSO, IP allowlist, MFA toggle, session policy)
- Super-admin UI doesn't scale past ~20 tenants (no search, no status semantics)

---

## 2. Goals

1. Proper tenant-scoped RBAC with entity-scoped role assignments
2. Subscribe-to-module at tenant level; enable-module at entity level
3. Enriched entity schema for Indian + multi-country S2P invoicing
4. SoD + approval limits enforced at **API layer**, not only UI
5. Full audit trail on sensitive actions (vendor bank edits, payments, role assignment)
6. Tenant security config (SSO placeholder, session, IP allowlist, MFA toggle)

## 3. Non-goals (out of scope for this iteration)

- Billing/metering system (stub only; real billing is future)
- Actual SAML/OIDC implementation (store config only; integration is a later phase)
- Rewrite of existing P2P transactional modules — only add scoping middleware to them

---

## 4. Architecture principles

1. **Every API call resolves to `(user → tenant → entity → permission)`.** No query skips tenant filtering.
2. **Authorization at the API layer**, not only in UI. UI can hide buttons; the API must refuse.
3. **All new tables carry `tenant_id`.** Entity-scoped tables also carry `entity_id`. Indexes lead with `tenant_id`.
4. **System-defined vs tenant-defined roles.** Ship standard S2P roles as `is_system=1` (read-only). Tenants may create custom roles on top.
5. **Soft deletes** (`deleted_at`) on tenants, entities, users, role assignments. No hard delete.
6. **Append-only audit log** — no UPDATE, no DELETE on that table, ever.

---

## 5. Data model (MySQL)

New schema: **`tenant_master`**

### 5.1 Tenants

```sql
CREATE TABLE tenant_master.tenants (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(16) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  status ENUM('TRIAL','ACTIVE','SUSPENDED','ARCHIVED') NOT NULL DEFAULT 'TRIAL',
  plan ENUM('STARTER','PRO','ENTERPRISE') NOT NULL DEFAULT 'STARTER',
  data_region VARCHAR(16) NOT NULL DEFAULT 'IN',
  locale VARCHAR(16) NOT NULL DEFAULT 'en-IN',
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
  fiscal_year_start CHAR(5) NOT NULL DEFAULT '04-01',
  branding_json JSON NULL,              -- {logo_url, primary_color, custom_domain}
  security_config_json JSON NULL,       -- {sso_provider, mfa_required, ip_allowlist[], session_minutes}
  contract_start DATE NULL,
  contract_end DATE NULL,
  primary_contact_email VARCHAR(200) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);
```

### 5.2 Entities (extended)

```sql
CREATE TABLE tenant_master.entities (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  parent_entity_id BIGINT NULL,
  code VARCHAR(16) NOT NULL,
  name VARCHAR(200) NOT NULL,
  legal_name VARCHAR(300) NULL,
  base_currency CHAR(3) NOT NULL,
  allowed_currencies_json JSON NULL,    -- ["INR","USD","EUR"]
  country CHAR(2) NOT NULL,
  fiscal_year_start CHAR(5) NULL,       -- inherits tenant if null
  tax_ids_json JSON NULL,               -- {"gstin":"...","pan":"...","tan":"...","cin":"..."}
  registered_address_json JSON NULL,
  erp_company_code VARCHAR(32) NULL,
  is_default TINYINT(1) DEFAULT 0,
  status ENUM('ACTIVE','INACTIVE','ARCHIVED') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uk_tenant_code (tenant_id, code),
  KEY idx_tenant (tenant_id),
  CONSTRAINT fk_entity_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_entity_parent FOREIGN KEY (parent_entity_id) REFERENCES entities(id)
);
```

### 5.3 Module catalog, subscriptions, entity enablement

```sql
CREATE TABLE tenant_master.modules_catalog (
  code VARCHAR(32) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions_json JSON NOT NULL,       -- list of permission codes this module exposes
  depends_on_json JSON NULL,            -- e.g. INVOICE depends on P2P
  is_active TINYINT(1) DEFAULT 1
);
-- Seed rows (codes): SUPPLIER, SOURCING, CONTRACTS, CATALOG, P2P, INVOICE, PAYMENT, ANALYTICS, RISK

CREATE TABLE tenant_master.tenant_subscriptions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  module_code VARCHAR(32) NOT NULL,
  seat_count INT NOT NULL DEFAULT 0,
  starts_at DATE NOT NULL,
  ends_at DATE NULL,
  status ENUM('ACTIVE','EXPIRED','CANCELLED') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tenant_module (tenant_id, module_code),
  CONSTRAINT fk_sub_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_sub_module FOREIGN KEY (module_code) REFERENCES modules_catalog(code)
);

CREATE TABLE tenant_master.entity_modules (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  entity_id BIGINT NOT NULL,
  module_code VARCHAR(32) NOT NULL,
  enabled TINYINT(1) DEFAULT 0,
  config_json JSON NULL,                -- e.g. {invoice_tolerance_pct: 2}
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_entity_module (entity_id, module_code),
  CONSTRAINT fk_em_entity FOREIGN KEY (entity_id) REFERENCES entities(id)
);
```

### 5.4 Permissions, roles, assignments, SoD, audit

```sql
CREATE TABLE tenant_master.permissions_catalog (
  code VARCHAR(64) PRIMARY KEY,
  module_code VARCHAR(32) NOT NULL,
  description VARCHAR(200),
  CONSTRAINT fk_perm_module FOREIGN KEY (module_code) REFERENCES modules_catalog(code)
);
-- Seed codes (examples):
-- pr.create, pr.approve, po.create, po.approve, grn.create,
-- invoice.create, invoice.match, invoice.approve, payment.release,
-- vendor.create, vendor.edit_bank, contract.create,
-- rfx.create, rfx.award, audit.read,
-- user.invite, user.assign_role, entity.read, entity.write,
-- tenant.admin, module.enable

CREATE TABLE tenant_master.roles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id BIGINT NULL,                -- NULL for system-defined roles
  code VARCHAR(64) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system TINYINT(1) DEFAULT 0,
  permissions_json JSON NOT NULL,       -- array of permission codes
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tenant_role (tenant_id, code)
);

CREATE TABLE tenant_master.user_entity_roles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,              -- FK to user_master.users (confirm in phase 0)
  tenant_id BIGINT NOT NULL,            -- denormalized for fast filtering
  entity_id BIGINT NOT NULL,
  role_id BIGINT NOT NULL,
  approval_limit DECIMAL(18,2) NULL,
  approval_currency CHAR(3) NULL,
  assigned_by BIGINT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP NULL,
  UNIQUE KEY uk_user_entity_role (user_id, entity_id, role_id),
  KEY idx_user_tenant (user_id, tenant_id),
  KEY idx_entity (entity_id)
);

CREATE TABLE tenant_master.sod_rules (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id BIGINT NULL,                -- NULL = system default
  rule_name VARCHAR(100) NOT NULL,
  conflicting_permissions_json JSON NOT NULL,  -- e.g. ["vendor.edit_bank","payment.release"]
  enforcement ENUM('BLOCK','WARN') DEFAULT 'BLOCK',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_tenant (tenant_id)
);

CREATE TABLE tenant_master.audit_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  entity_id BIGINT NULL,
  actor_user_id BIGINT NOT NULL,
  actor_email VARCHAR(200),
  action VARCHAR(64) NOT NULL,          -- e.g. vendor.bank_update, role.assign
  target_type VARCHAR(64) NOT NULL,     -- e.g. vendor, user_entity_role
  target_id VARCHAR(64) NOT NULL,
  before_json JSON NULL,
  after_json JSON NULL,
  ip_address VARCHAR(45),
  user_agent VARCHAR(300),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_tenant_time (tenant_id, created_at),
  KEY idx_target (target_type, target_id)
);
```

---

## 6. Seed data

**System roles** (`is_system=1`, `tenant_id=NULL`):

| Code           | Key permissions                                                 |
| -------------- | --------------------------------------------------------------- |
| TENANT_ADMIN   | `tenant.admin`, `user.*`, `module.enable`, `entity.write`       |
| ENTITY_ADMIN   | `entity.read`, `entity.write`, `user.invite` (scoped to entity) |
| REQUISITIONER  | `pr.create`, `pr.read_own`                                      |
| APPROVER       | `pr.approve`, `po.approve` (requires limit)                     |
| BUYER          | `po.create`, `rfx.create`, `contract.create`, `vendor.create`   |
| AP_CLERK       | `invoice.create`, `invoice.match`                               |
| AP_MANAGER     | `invoice.approve`, `payment.release` (requires limit)           |
| SUPPLIER_ADMIN | `vendor.create`, `vendor.edit_bank`                             |
| AUDITOR        | all `*.read` + `audit.read`                                     |

**System SoD rules** (`tenant_id=NULL`, `enforcement=BLOCK`):

1. `vendor.edit_bank` + `payment.release` on same user in same entity
2. `po.create` + `invoice.approve` on same user in same entity
3. `po.create` + `grn.create` on same PO (runtime check)
4. `pr.create` + `pr.approve` on same PR (runtime check)

---

## 7. API design

### 7.1 Auth

Replace `X-User-Email` with a signed session token (JWT — use `jose` or `jsonwebtoken`). Token payload:

```json
{
  "sub": "<user_id>",
  "email": "user@example.com",
  "tenant_id": 12,
  "entity_id": 34,
  "is_platform_admin": false,
  "iat": 1730000000,
  "exp": 1730003600
}
```

Users with access to multiple tenants pick an active one at login → switch via `POST /api/auth/switch-tenant`. Entity switch works the same way within a tenant.

Keep `X-User-Email` as a **dev-only fallback** behind `NODE_ENV !== 'production'` during migration. Remove in a later phase.

### 7.2 Middleware (hand-rolled, matching existing `http.createServer` style)

Create `server/middleware/`:

- `requireAuth(req)` — parses JWT from `Authorization: Bearer …`, attaches `req.user`
- `requireTenantScope(req)` — asserts `req.user.tenant_id`, attaches `req.tenantId`
- `requirePermission(code)(req)` — checks effective permissions for the current entity
- `requireSuperAdmin(req)` — checks `req.user.is_platform_admin`

**Hard rule:** every data-access function accepts `tenantId` explicitly. No DB read without it.

### 7.3 Key endpoints

```
# Platform admin
GET    /api/platform/tenants
POST   /api/platform/tenants
PATCH  /api/platform/tenants/:id
POST   /api/platform/tenants/:id/suspend
POST   /api/platform/tenants/:id/impersonate   -> short-lived impersonation token

# Tenant admin
GET    /api/tenant/me
PATCH  /api/tenant/me                          -> branding, locale, security config
GET    /api/tenant/entities
POST   /api/tenant/entities
PATCH  /api/tenant/entities/:id
POST   /api/tenant/entities/:id/set-default

# Modules
GET    /api/tenant/subscriptions
PATCH  /api/tenant/subscriptions/:moduleCode
GET    /api/tenant/entities/:id/modules
PATCH  /api/tenant/entities/:id/modules/:moduleCode

# IAM
GET    /api/iam/roles                          -> system + tenant custom roles
POST   /api/iam/roles
GET    /api/iam/users
POST   /api/iam/users/:uid/assignments         -> assign role to entity + limit
DELETE /api/iam/users/:uid/assignments/:aid
GET    /api/iam/sod-rules
POST   /api/iam/sod-rules

# Audit
GET    /api/audit/log?target_type=&actor=&from=&to=

# Auth
POST   /api/auth/switch-tenant
POST   /api/auth/switch-entity
```

---

## 8. Frontend changes

**New routes:**

| Route             | Purpose                                                | Guard               |
| ----------------- | ------------------------------------------------------ | ------------------- |
| `/super-admin/*`  | Platform admin (already exists; harden)                | `requireSuperAdmin` |
| `/admin/tenant`   | Tenant settings (branding, locale, security, contract) | `tenant.admin`      |
| `/admin/entities` | Entity list + CRUD with new fields                     | `entity.write`      |
| `/admin/modules`  | Subscriptions + per-entity enablement matrix           | `module.enable`     |
| `/admin/users`    | User list + role assignment with SoD pre-check         | `user.assign_role`  |
| `/admin/audit`    | Searchable audit log                                   | `audit.read`        |

**New components (shadcn-style in `src/components/ui/`):**

- `TenantSwitcher.tsx` — dropdown in top nav
- `EntitySwitcher.tsx` — dropdown below tenant switcher
- `RoleAssignmentForm.tsx` — React Hook Form + Zod, with client-side SoD hint
- `ModuleMatrix.tsx` — rows = entities, cols = modules, checkbox per cell
- `PermissionGuard.tsx` — hides children unless user has permission
- `AuditLogTable.tsx` — filterable, paginated

**Context:**

- `AuthContext` — current user, tenant, entity, permissions array
- `usePermission(code)` hook — for conditional render
- Zod schemas in `src/schemas/` — `tenant.ts`, `entity.ts`, `role.ts`, `assignment.ts`

---

## 9. Suggested phased delivery

The agent should propose its own phase plan after reading this. Suggested order:

| Phase | Scope                                                                             |
| ----- | --------------------------------------------------------------------------------- |
| 0     | Schema + migrations + `tenant_master` created + seed data                         |
| 1     | JWT auth middleware; tenant/entity scoping on every existing query                |
| 2     | Roles + permissions + middleware enforcement; remove `SUPER_ADMIN_EMAILS`         |
| 3     | Module catalog + subscriptions + entity enablement + frontend matrix              |
| 4     | Enhanced entity fields (tax IDs, hierarchy, fiscal year) + UI                     |
| 5     | SoD rules + approval limits + pre-assignment check in API                         |
| 6     | Audit log writer + viewer UI                                                      |
| 7     | Tenant security config (SSO placeholder, IP allowlist, MFA, session)              |
| 8     | UI polish (search, filters, status badges, setup checklist, impersonation banner) |

Each phase ends with: migration applied, seed data, API + integration tests, UI, CHANGELOG entry.

---

## 10. Acceptance criteria

- No endpoint returns data across tenants — proven by integration test: seed tenants A and B, assert user from A cannot read any row of B
- Super-admin capability no longer depends on `SUPER_ADMIN_EMAILS`; uses `is_platform_admin` flag
- SoD violation attempts return **HTTP 409** with `{ rule_name, conflicting_permissions }` in body
- Every write to `vendors`, `payments`, `user_entity_roles`, `entities`, `tenants` creates an `audit_log` row
- Entity form collects GSTIN, PAN when `country=IN`, validated via Zod
- Module matrix reflects DB state immediately on toggle; disables dependent modules when parent is off

---

## 11. Coding conventions (must follow)

- ES modules only, `.mjs` on server, `.ts/.tsx` on frontend
- `mysql2/promise` pool; **parameterized queries only**; never string-concat
- No Express. Hand-rolled HTTP handlers matching `server/index.mjs` style
- Frontend: React Hook Form + Zod; shadcn components before custom ones; no inline styles
- All new tables prefixed with schema: `tenant_master.<table>`
- Env additions: `JWT_SECRET`, `JWT_TTL_MINUTES` (existing `MYSQL_*` untouched)
- Migrations: plain `.sql` under `server/migrations/` numbered `YYYY_MM_DD__name.sql`, **idempotent**
- Seeds: `server/seeds/*.sql` using `INSERT … ON DUPLICATE KEY UPDATE`

---

## 12. Questions to answer before writing code

1. Where do existing users live? Confirm schema/table and column for `is_platform_admin`.
2. Which existing endpoints already filter by `tenant_id` vs which don't? (Grep + list.)
3. What is the current frontend auth flow — is there a session/token in place today, or only `X-User-Email`?
4. Which transactional tables in `p2p_schema_mt` need a `tenant_id` backfill? List them.
5. Are migrations run manually, or is there a runner? If manual, confirm the apply procedure.
