import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks (must be declared before any imports that use them) ─────────────────

vi.mock('../../mysql.mjs', () => ({
  query: vi.fn(),
  withTransaction: vi.fn(async (fn) => {
    const mockConn = { execute: vi.fn().mockResolvedValue([{}]) };
    return fn(mockConn);
  }),
  connExecute: vi.fn().mockResolvedValue([{}]),
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$mocked_hash_value'),
  },
}));

import { query, withTransaction, connExecute } from '../../mysql.mjs';
import bcrypt from 'bcrypt';
import { run } from '../migratePasswordsToBcrypt.mjs';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRow(id, payloadOverrides = {}) {
  const payload = { email: `user${id}@example.com`, ...payloadOverrides };
  return { id: `user-${id}`, payload: JSON.stringify(payload) };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default withTransaction: call fn with a mock connection
  vi.mocked(withTransaction).mockImplementation(async (fn) => {
    const mockConn = { execute: vi.fn().mockResolvedValue([{}]) };
    return fn(mockConn);
  });
  vi.mocked(connExecute).mockResolvedValue([{}]);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('migratePasswordsToBcrypt', () => {
  it('hashes plaintext password and removes plaintext field', async () => {
    vi.mocked(query).mockResolvedValueOnce([makeRow(1, { password: 'plain123' })]);

    const { migrated, skipped } = await run({ dryRun: false });

    expect(migrated).toBe(1);
    expect(skipped).toBe(0);
    expect(bcrypt.hash).toHaveBeenCalledWith('plain123', 12);

    // Verify UPDATE was called via connExecute
    expect(connExecute).toHaveBeenCalledOnce();
    const [, sql, params] = vi.mocked(connExecute).mock.calls[0];
    expect(sql).toMatch(/UPDATE.*user_master/i);
    const updatedPayload = JSON.parse(params[0]);
    expect(updatedPayload.passwordHash).toBe('$2b$12$mocked_hash_value');
    expect(updatedPayload.password).toBeUndefined();
  });

  it('hashes loginPassword alias and removes it', async () => {
    vi.mocked(query).mockResolvedValueOnce([makeRow(2, { loginPassword: 'logpass' })]);
    await run({ dryRun: false });
    expect(bcrypt.hash).toHaveBeenCalledWith('logpass', 12);
    const [, , params] = vi.mocked(connExecute).mock.calls[0];
    const updated = JSON.parse(params[0]);
    expect(updated.passwordHash).toBe('$2b$12$mocked_hash_value');
    expect(updated.loginPassword).toBeUndefined();
  });

  it('skips row that already has passwordHash', async () => {
    vi.mocked(query).mockResolvedValueOnce([
      makeRow(3, { passwordHash: '$2b$12$existing_hash' }),
    ]);

    const { migrated, skipped } = await run({ dryRun: false });

    expect(migrated).toBe(0);
    expect(skipped).toBe(1);
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(connExecute).not.toHaveBeenCalled();
  });

  it('skips row with no password field', async () => {
    vi.mocked(query).mockResolvedValueOnce([makeRow(4, {})]);
    const { migrated, skipped } = await run({ dryRun: false });
    expect(migrated).toBe(0);
    expect(skipped).toBe(1);
    expect(connExecute).not.toHaveBeenCalled();
  });

  it('dry-run: does NOT call UPDATE', async () => {
    vi.mocked(query).mockResolvedValueOnce([makeRow(5, { password: 'secret' })]);
    const { migrated } = await run({ dryRun: true });
    expect(migrated).toBe(1);
    expect(connExecute).not.toHaveBeenCalled();
    expect(withTransaction).not.toHaveBeenCalled();
  });

  it('handles multiple rows: migrates eligible, skips already-hashed', async () => {
    vi.mocked(query).mockResolvedValueOnce([
      makeRow(10, { password: 'p1' }),
      makeRow(11, { passwordHash: '$2b$12$already' }),
      makeRow(12, { password: 'p2' }),
    ]);
    const { migrated, skipped } = await run({ dryRun: false });
    expect(migrated).toBe(2);
    expect(skipped).toBe(1);
    expect(bcrypt.hash).toHaveBeenCalledTimes(2);
  });
});
