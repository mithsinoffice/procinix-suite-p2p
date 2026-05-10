/**
 * B1: Server-side authentication service.
 * Handles bcrypt comparison, legacy plaintext fallback (lazy migration), session issuance.
 */
import bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import { query } from '../../mysql.mjs';

const BCRYPT_COST = 12;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

// Pre-computed bcrypt hash used for constant-time dummy compare when user is not found.
// Never matches any real password — exists only to prevent timing oracles.
const DUMMY_HASH = '$2b$12$Bp9LNqxFHqQ1x5RA.jX2heRoE6PwM7wD3DFUAB7gLIKrBwrKqiYqS';

// ── Sessions table ────────────────────────────────────────────────────────────

export async function ensureSessionsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS \`p2p_schema_mt\`.\`sessions\` (
      \`id\`          VARCHAR(36)  NOT NULL,
      \`user_id\`     VARCHAR(64)  NOT NULL,
      \`tenant_id\`   VARCHAR(64)  NOT NULL,
      \`token_hash\`  CHAR(64)     NOT NULL,
      \`user_email\`  VARCHAR(255) NOT NULL,
      \`created_at\`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`expires_at\`  DATETIME     NOT NULL,
      \`revoked_at\`  DATETIME     NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_sessions_token_hash\` (\`token_hash\`),
      KEY \`idx_sessions_user\`    (\`user_id\`),
      KEY \`idx_sessions_expires\` (\`expires_at\`, \`revoked_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
}

// ── Core authentication ───────────────────────────────────────────────────────

function parsePayload(row) {
  if (!row?.payload) return {};
  return typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
}

function buildSafeUser(row, payload) {
  const roleFromAssignments =
    payload.userRoles?.[0]?.roleName ?? payload.user_roles?.[0]?.roleName ?? null;
  return {
    id: String(row.id),
    email: String(payload.email ?? '').trim(),
    name: String(payload.name ?? payload.employeeName ?? '').trim(),
    role: payload.role ?? payload.roleName ?? roleFromAssignments ?? null,
    tenantId: row.tenant_id ? String(row.tenant_id) : null,
    defaultEntityId: row.default_entity_id ? String(row.default_entity_id) : null,
  };
}

/**
 * Authenticate a user by email + password.
 * - bcrypt path:     payload.passwordHash exists → bcrypt.compare
 * - legacy path:     only payload.password/loginPassword/tempPassword exists →
 *                    plaintext compare + lazy hash migration (fire-and-forget)
 * - missing user:    dummy bcrypt.compare to equalise response time
 * Returns { ok: true, user } | { ok: false, reason: 'invalid_credentials' }
 */
export async function authenticateUser({ email, password }) {
  const normalizedEmail = String(email ?? '')
    .trim()
    .toLowerCase();

  const rows = await query(
    `SELECT id, payload, tenant_id, default_entity_id, status
     FROM \`user_master\`.\`user_master\`
     WHERE LOWER(JSON_UNQUOTE(JSON_EXTRACT(payload, '$.email'))) = ?
       AND status = 'Active'
     LIMIT 1`,
    [normalizedEmail]
  );

  const row = rows[0] ?? null;

  if (!row) {
    // Constant-time dummy compare so missing-user and wrong-password take ~equal time
    await bcrypt.compare(password, DUMMY_HASH).catch(() => {});
    return { ok: false, reason: 'invalid_credentials' };
  }

  const payload = parsePayload(row);

  // ── bcrypt path (migrated user) ────────────────────────────────────────────
  if (payload.passwordHash) {
    const match = await bcrypt.compare(password, payload.passwordHash);
    if (!match) return { ok: false, reason: 'invalid_credentials' };
    return { ok: true, user: buildSafeUser(row, payload) };
  }

  // ── legacy plaintext path (un-migrated user) ──────────────────────────────
  const legacyPass = payload.password ?? payload.loginPassword ?? payload.tempPassword ?? '';

  if (!legacyPass || legacyPass !== password) {
    return { ok: false, reason: 'invalid_credentials' };
  }

  console.warn(`[auth] WARN: User ${row.id} has unhashed password — lazy migration in progress`);

  // Hash the correct password and persist asynchronously (fire-and-forget)
  bcrypt
    .hash(password, BCRYPT_COST)
    .then((newHash) => {
      const updatedPayload = { ...payload, passwordHash: newHash };
      delete updatedPayload.password;
      delete updatedPayload.loginPassword;
      delete updatedPayload.tempPassword;
      return query(
        'UPDATE `user_master`.`user_master` SET payload = CAST(? AS JSON) WHERE id = ?',
        [JSON.stringify(updatedPayload), row.id]
      );
    })
    .catch((err) => console.error(`[auth] Lazy hash persistence failed for user ${row.id}:`, err));

  return { ok: true, user: buildSafeUser(row, payload) };
}

// ── Session management ────────────────────────────────────────────────────────

/**
 * Issue a 24-hour session token; store its SHA-256 hash in the sessions table.
 * Returns the raw token (returned to client — never stored).
 */
export async function createSession(user) {
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await query(
    `INSERT INTO \`p2p_schema_mt\`.\`sessions\`
       (id, user_id, tenant_id, token_hash, user_email, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [randomUUID(), user.id, user.tenantId ?? '', tokenHash, user.email, expiresAt]
  );

  return token;
}

/**
 * Look up a session by raw token. Returns session metadata or null if not found/expired.
 */
export async function lookupSession(rawToken) {
  if (!rawToken) return null;
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');

  const rows = await query(
    `SELECT id, user_id, tenant_id, user_email
     FROM \`p2p_schema_mt\`.\`sessions\`
     WHERE token_hash = ?
       AND expires_at > NOW()
       AND revoked_at IS NULL
     LIMIT 1`,
    [tokenHash]
  );

  const row = rows[0] ?? null;
  if (!row) return null;

  return {
    sessionId: String(row.id),
    userId: String(row.user_id),
    tenantId: String(row.tenant_id),
    email: String(row.user_email),
  };
}

/**
 * Revoke a session by its row id (sessionId from lookupSession).
 */
export async function revokeSession(sessionId) {
  if (!sessionId) return;
  await query('UPDATE `p2p_schema_mt`.`sessions` SET revoked_at = NOW() WHERE id = ?', [sessionId]);
}

/**
 * Fetch tenant + entity context for a user. Returns null if tenantId is absent.
 */
export async function fetchContext(userId, tenantId) {
  if (!tenantId) return null;

  const [tenantRow] = await query('SELECT id, name, code FROM tenants WHERE id = ? LIMIT 1', [
    tenantId,
  ]);
  if (!tenantRow) return null;

  const entRows = await query(
    `SELECT e.id, e.name, e.code, e.is_default AS isDefault
     FROM user_entity_access uea
     INNER JOIN entities e ON e.id = uea.entity_id
     WHERE BINARY uea.user_id = ? AND BINARY uea.tenant_id = ?
     ORDER BY e.is_default DESC, e.name ASC`,
    [userId, tenantId]
  );

  return {
    tenantName: tenantRow.name ?? null,
    tenantCode: tenantRow.code ?? null,
    entities: (entRows || []).map((r) => ({
      id: String(r.id),
      name: r.name,
      code: r.code ?? null,
      isDefault: Boolean(r.isDefault),
    })),
  };
}

/**
 * Look up a user by id. Returns buildSafeUser result or null if not found / inactive.
 */
export async function getUserById(userId) {
  if (!userId) return null;

  const rows = await query(
    `SELECT id, payload, tenant_id, default_entity_id, status
     FROM \`user_master\`.\`user_master\`
     WHERE id = ? AND status = 'Active'
     LIMIT 1`,
    [userId]
  );

  const row = rows[0] ?? null;
  if (!row) return null;

  const payload = parsePayload(row);
  return buildSafeUser(row, payload);
}
