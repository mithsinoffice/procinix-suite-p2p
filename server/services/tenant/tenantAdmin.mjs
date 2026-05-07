import { randomUUID } from 'node:crypto';
import { query } from '../../mysql.mjs';

function parseRowPayload(row) {
  if (!row?.payload) return {};
  return typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
}

function rowPassword(payload) {
  return payload?.password ?? payload?.loginPassword ?? payload?.tempPassword ?? '';
}

export function getSuperAdminEmailSet() {
  const raw = process.env.SUPER_ADMIN_EMAILS || '';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function assertSuperAdminRequest(req) {
  const email = String(req.headers['x-user-email'] ?? '')
    .trim()
    .toLowerCase();
  if (!email) {
    const err = new Error('Missing X-User-Email header');
    err.statusCode = 400;
    throw err;
  }
  const allowed = getSuperAdminEmailSet();
  if (allowed.size === 0) {
    const err = new Error('SUPER_ADMIN_EMAILS is not configured on the server');
    err.statusCode = 503;
    throw err;
  }
  if (!allowed.has(email)) {
    const err = new Error('Forbidden: super admin only');
    err.statusCode = 403;
    throw err;
  }
}

/** Match user_master row by email + password; optional tenant code must match row tenant. */
export async function buildPlatformContext(body) {
  const email = String(body?.email ?? '')
    .trim()
    .toLowerCase();
  const password = body?.password ?? '';
  const tenantCode = String(body?.tenantCode ?? '')
    .trim()
    .toUpperCase();

  if (!email || !password) {
    return { ok: false, error: 'email_and_password_required' };
  }

  const rows = await query(
    'SELECT id, payload, tenant_id, default_entity_id FROM `user_master`.`user_master`'
  );

  let matched = null;
  for (const row of rows) {
    const payload = parseRowPayload(row);
    const rowEmail = String(payload?.email ?? '')
      .trim()
      .toLowerCase();
    if (rowEmail !== email) continue;
    if (rowPassword(payload) !== password) {
      return { ok: false, error: 'invalid_credentials' };
    }
    matched = {
      id: String(row.id),
      tenant_id: row.tenant_id ? String(row.tenant_id) : null,
      default_entity_id: row.default_entity_id ? String(row.default_entity_id) : null,
    };
    break;
  }

  if (!matched) {
    return { ok: false, error: 'invalid_credentials' };
  }

  if (!matched.tenant_id) {
    return { ok: false, error: 'user_missing_tenant', tenantId: null, entities: [] };
  }

  if (tenantCode) {
    const [t] = await query(
      "SELECT id FROM tenants WHERE UPPER(TRIM(code)) = ? AND status = 'ACTIVE' LIMIT 1",
      [tenantCode]
    );
    if (!t || String(t.id) !== matched.tenant_id) {
      return { ok: false, error: 'tenant_code_mismatch' };
    }
  }

  const [tenant] = await query('SELECT id, name, code, status FROM tenants WHERE id = ? LIMIT 1', [
    matched.tenant_id,
  ]);
  if (!tenant) {
    return { ok: false, error: 'tenant_not_found' };
  }

  const entRows = await query(
    `
    SELECT e.id, e.name, e.code, e.is_default AS isDefault, e.currency, e.country
    FROM user_entity_access uea
    INNER JOIN entities e ON e.id = uea.entity_id
    WHERE BINARY uea.user_id = ? AND BINARY uea.tenant_id = ?
    ORDER BY e.is_default DESC, e.name ASC
    `,
    [matched.id, matched.tenant_id]
  );

  const entities = (entRows || []).map((r) => ({
    id: String(r.id),
    name: r.name,
    code: r.code,
    isDefault: Boolean(r.isDefault),
    currency: r.currency ?? null,
    country: r.country ?? null,
  }));

  return {
    ok: true,
    tenantId: String(tenant.id),
    tenantName: tenant.name,
    tenantCode: tenant.code,
    userId: matched.id,
    defaultPlatformEntityId: matched.default_entity_id,
    entities,
  };
}

export async function listTenants() {
  return query('SELECT id, name, code, status, created_at FROM tenants ORDER BY created_at DESC');
}

export async function createTenant({ name, code }) {
  const id = randomUUID();
  const cleanCode = String(code ?? '')
    .trim()
    .toUpperCase();
  const cleanName = String(name ?? '').trim();
  if (!cleanName || !cleanCode) {
    const err = new Error('name_and_code_required');
    err.statusCode = 400;
    throw err;
  }
  await query(
    `
    INSERT INTO tenants (id, name, code, status)
    VALUES (?, ?, ?, 'ACTIVE')
    `,
    [id, cleanName, cleanCode]
  );
  return { id, name: cleanName, code: cleanCode, status: 'ACTIVE' };
}

export async function listEntitiesForTenant(tenantId) {
  return query(
    `
    SELECT id, tenant_id, name, code, currency, country, is_default AS isDefault, created_at
    FROM entities
    WHERE tenant_id = ?
    ORDER BY is_default DESC, name ASC
    `,
    [tenantId]
  );
}

export async function createEntityForTenant(tenantId, body) {
  const id = randomUUID();
  const name = String(body?.name ?? '').trim();
  const code = String(body?.code ?? '')
    .trim()
    .toUpperCase();
  const currency = body?.currency ? String(body.currency).trim() : null;
  const country = body?.country ? String(body.country).trim() : null;
  const isDefault = Boolean(body?.isDefault);

  if (!name) {
    const err = new Error('entity_name_required');
    err.statusCode = 400;
    throw err;
  }

  const [tenant] = await query('SELECT id FROM tenants WHERE id = ? LIMIT 1', [tenantId]);
  if (!tenant) {
    const err = new Error('tenant_not_found');
    err.statusCode = 404;
    throw err;
  }

  if (isDefault) {
    await query('UPDATE entities SET is_default = FALSE WHERE tenant_id = ?', [tenantId]);
  }

  await query(
    `
    INSERT INTO entities (id, tenant_id, name, code, currency, country, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [id, tenantId, name, code || null, currency, country, isDefault]
  );

  return { id, tenantId, name, code: code || null, currency, country, isDefault };
}
