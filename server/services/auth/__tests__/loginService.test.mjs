import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../../mysql.mjs', () => ({
  query: vi.fn(),
}));

vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

import { query } from '../../../mysql.mjs';
import bcrypt from 'bcrypt';
import {
  authenticateUser,
  createSession,
  lookupSession,
  revokeSession,
  getUserById,
  fetchContext,
} from '../loginService.mjs';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeUserRow({
  id = 'u-001',
  email = 'alice@example.com',
  passwordHash,
  password,
  tenantId = 'tenant-001',
  status = 'Active',
} = {}) {
  const payload = {
    email,
    ...(passwordHash ? { passwordHash } : {}),
    ...(password ? { password } : {}),
  };
  return [
    { id, payload: JSON.stringify(payload), tenant_id: tenantId, default_entity_id: null, status },
  ];
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── authenticateUser ──────────────────────────────────────────────────────────

describe('authenticateUser', () => {
  it('returns ok=true for valid bcrypt-hashed user', async () => {
    vi.mocked(query).mockResolvedValueOnce(makeUserRow({ passwordHash: '$2b$12$hash' }));
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true);

    const result = await authenticateUser({ email: 'alice@example.com', password: 'correct' });

    expect(result.ok).toBe(true);
    expect(result.user.email).toBe('alice@example.com');
    expect(result.user.tenantId).toBe('tenant-001');
    // Safe: must NOT include password or passwordHash
    expect(result.user.passwordHash).toBeUndefined();
    expect(result.user.password).toBeUndefined();
  });

  it('returns ok=false for wrong password (hashed user)', async () => {
    vi.mocked(query).mockResolvedValueOnce(makeUserRow({ passwordHash: '$2b$12$hash' }));
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false);

    const result = await authenticateUser({ email: 'alice@example.com', password: 'wrong' });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('invalid_credentials');
  });

  it('returns ok=true for valid legacy plaintext user and triggers lazy hash', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce(makeUserRow({ password: 'plain123' })) // SELECT
      .mockResolvedValueOnce([{}]); // UPDATE (lazy)
    vi.mocked(bcrypt.hash).mockResolvedValueOnce('$2b$12$lazyhash');

    const result = await authenticateUser({ email: 'alice@example.com', password: 'plain123' });

    expect(result.ok).toBe(true);
    // bcrypt.compare should NOT be called for plaintext path
    expect(bcrypt.compare).not.toHaveBeenCalled();

    // Fire-and-forget: flush microtasks to let the lazy hash run
    await new Promise((r) => setTimeout(r, 0));

    expect(bcrypt.hash).toHaveBeenCalledWith('plain123', 12);
    const updateCall = vi
      .mocked(query)
      .mock.calls.find(([sql]) => typeof sql === 'string' && sql.includes('UPDATE'));
    expect(updateCall).toBeDefined();
    const updatedPayload = JSON.parse(updateCall[1][0]);
    expect(updatedPayload.passwordHash).toBe('$2b$12$lazyhash');
    expect(updatedPayload.password).toBeUndefined();
  });

  it('returns ok=false for wrong legacy plaintext password', async () => {
    vi.mocked(query).mockResolvedValueOnce(makeUserRow({ password: 'correct' }));

    const result = await authenticateUser({ email: 'alice@example.com', password: 'wrong' });
    expect(result.ok).toBe(false);
    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it('returns ok=false for missing user and runs dummy bcrypt.compare', async () => {
    vi.mocked(query).mockResolvedValueOnce([]); // no rows
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false);

    const result = await authenticateUser({ email: 'nobody@example.com', password: 'x' });

    expect(result.ok).toBe(false);
    // Dummy compare must be called for timing safety
    expect(bcrypt.compare).toHaveBeenCalledOnce();
    // The second argument must be the DUMMY_HASH (starts with $2b$12$)
    const [, dummyHash] = vi.mocked(bcrypt.compare).mock.calls[0];
    expect(dummyHash).toMatch(/^\$2b\$12\$/);
  });

  it('normalises email case for lookup', async () => {
    vi.mocked(query).mockResolvedValueOnce([]);
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false);

    await authenticateUser({ email: 'ALICE@EXAMPLE.COM', password: 'x' });

    const [sql, params] = vi.mocked(query).mock.calls[0];
    expect(params[0]).toBe('alice@example.com');
  });
});

// ── createSession / lookupSession ─────────────────────────────────────────────

describe('createSession + lookupSession', () => {
  it('createSession inserts a row and returns a 64-char hex token', async () => {
    vi.mocked(query).mockResolvedValueOnce([{}]);

    const token = await createSession({
      id: 'u-001',
      email: 'alice@example.com',
      tenantId: 'tenant-001',
    });

    expect(typeof token).toBe('string');
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]+$/);

    const [sql] = vi.mocked(query).mock.calls[0];
    expect(sql).toMatch(/INSERT.*sessions/i);
  });

  it('lookupSession returns session metadata for a valid token', async () => {
    vi.mocked(query).mockResolvedValueOnce([
      {
        id: 'sess-1',
        user_id: 'u-001',
        tenant_id: 'tenant-001',
        user_email: 'alice@example.com',
      },
    ]);

    const session = await lookupSession('a'.repeat(64));

    expect(session).not.toBeNull();
    expect(session.userId).toBe('u-001');
    expect(session.tenantId).toBe('tenant-001');
    expect(session.email).toBe('alice@example.com');

    // Verify the token_hash (SHA-256) was passed, not the raw token
    const [sql, params] = vi.mocked(query).mock.calls[0];
    expect(sql).toMatch(/sessions/i);
    expect(params[0]).not.toBe('a'.repeat(64)); // hash, not raw token
    expect(params[0]).toHaveLength(64); // SHA-256 hex
  });

  it('lookupSession returns null when no rows found', async () => {
    vi.mocked(query).mockResolvedValueOnce([]);
    const session = await lookupSession('tok');
    expect(session).toBeNull();
  });

  it('lookupSession returns null for empty/null token', async () => {
    expect(await lookupSession('')).toBeNull();
    expect(await lookupSession(null)).toBeNull();
  });
});

// ── revokeSession ─────────────────────────────────────────────────────────────

describe('revokeSession', () => {
  it('issues UPDATE with the provided sessionId', async () => {
    vi.mocked(query).mockResolvedValueOnce([{}]);
    await revokeSession('sess-abc');
    const [sql, params] = vi.mocked(query).mock.calls[0];
    expect(sql).toMatch(/UPDATE.*sessions.*revoked_at/i);
    expect(params[0]).toBe('sess-abc');
  });

  it('does nothing when sessionId is falsy', async () => {
    await revokeSession(null);
    await revokeSession('');
    expect(query).not.toHaveBeenCalled();
  });
});

// ── getUserById ───────────────────────────────────────────────────────────────

describe('getUserById', () => {
  it('returns safe user object when found', async () => {
    const row = {
      id: 'u-42',
      status: 'Active',
      tenant_id: 'tenant-001',
      default_entity_id: null,
      payload: JSON.stringify({ email: 'bob@example.com', name: 'Bob', passwordHash: '$2b$12$x' }),
    };
    vi.mocked(query).mockResolvedValueOnce([row]);

    const result = await getUserById('u-42');
    expect(result).not.toBeNull();
    expect(result.id).toBe('u-42');
    expect(result.email).toBe('bob@example.com');
    expect(result.passwordHash).toBeUndefined();
    expect(result.password).toBeUndefined();
  });

  it('returns null when user not found', async () => {
    vi.mocked(query).mockResolvedValueOnce([]);
    expect(await getUserById('missing')).toBeNull();
  });

  it('returns null for falsy userId', async () => {
    expect(await getUserById(null)).toBeNull();
    expect(await getUserById('')).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });
});

// ── fetchContext ──────────────────────────────────────────────────────────────

describe('fetchContext', () => {
  it('returns null when tenantId is falsy', async () => {
    expect(await fetchContext('u-1', null)).toBeNull();
    expect(await fetchContext('u-1', '')).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });

  it('returns null when tenant row not found', async () => {
    vi.mocked(query).mockResolvedValueOnce([]); // no tenant row
    expect(await fetchContext('u-1', 'missing-tenant')).toBeNull();
  });

  it('returns tenantName, tenantCode and mapped entities', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([{ id: 't-1', name: 'Acme Corp', code: 'ACME' }]) // tenant
      .mockResolvedValueOnce([
        // entities
        { id: 'e-1', name: 'Main Office', code: 'MAIN', isDefault: 1 },
        { id: 'e-2', name: 'Warehouse', code: 'WH', isDefault: 0 },
      ]);

    const ctx = await fetchContext('u-1', 't-1');
    expect(ctx).not.toBeNull();
    expect(ctx.tenantName).toBe('Acme Corp');
    expect(ctx.tenantCode).toBe('ACME');
    expect(ctx.entities).toHaveLength(2);
    expect(ctx.entities[0]).toMatchObject({ id: 'e-1', name: 'Main Office', isDefault: true });
    expect(ctx.entities[1]).toMatchObject({ id: 'e-2', name: 'Warehouse', isDefault: false });
  });

  it('returns empty entities array when user has no entity access', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([{ id: 't-1', name: 'Acme', code: 'ACME' }])
      .mockResolvedValueOnce([]); // no entities

    const ctx = await fetchContext('u-1', 't-1');
    expect(ctx.entities).toEqual([]);
  });
});
