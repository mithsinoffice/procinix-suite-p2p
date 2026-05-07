import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../services/auth/loginService.mjs', () => ({
  authenticateUser: vi.fn(),
  createSession: vi.fn(),
  lookupSession: vi.fn(),
  fetchContext: vi.fn(),
  getUserById: vi.fn(),
  revokeSession: vi.fn(),
  ensureSessionsTable: vi.fn().mockResolvedValue(undefined),
}));

import {
  authenticateUser,
  createSession,
  lookupSession,
  fetchContext,
  getUserById,
  revokeSession,
} from '../services/auth/loginService.mjs';
import { handleAuthRoute } from '../routes/auth.mjs';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReqRes(method, pathname, body, { reqUser } = {}) {
  const bodyChunks = body ? [Buffer.from(JSON.stringify(body))] : [];
  const req = {
    method,
    url: pathname,
    user: reqUser ?? undefined,
    [Symbol.asyncIterator]: async function* () {
      yield* bodyChunks;
    },
  };
  const responses = [];
  const sendJson = (_res, status, payload) => responses.push({ status, payload });
  const res = {};
  return { req, res, responses, sendJson };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchContext).mockResolvedValue(null);
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────

describe('handleAuthRoute — POST /api/auth/login', () => {
  it('returns false for non-matching route', async () => {
    const { req, res, sendJson } = makeReqRes('GET', '/api/invoices', null);
    const handled = await handleAuthRoute(req, res, '/api/invoices', sendJson);
    expect(handled).toBe(false);
  });

  it('responds 400 when email is missing', async () => {
    const { req, res, responses, sendJson } = makeReqRes('POST', '/api/auth/login', {
      password: 'x',
    });
    const handled = await handleAuthRoute(req, res, '/api/auth/login', sendJson);
    expect(handled).toBe(true);
    expect(responses[0].status).toBe(400);
  });

  it('responds 400 when password is missing', async () => {
    const { req, res, responses, sendJson } = makeReqRes('POST', '/api/auth/login', {
      email: 'a@b.com',
    });
    const handled = await handleAuthRoute(req, res, '/api/auth/login', sendJson);
    expect(handled).toBe(true);
    expect(responses[0].status).toBe(400);
  });

  it('responds 400 when body is empty', async () => {
    const { req, res, responses, sendJson } = makeReqRes('POST', '/api/auth/login', null);
    const handled = await handleAuthRoute(req, res, '/api/auth/login', sendJson);
    expect(handled).toBe(true);
    expect(responses[0].status).toBe(400);
  });

  it('responds 401 when authenticateUser returns ok=false', async () => {
    vi.mocked(authenticateUser).mockResolvedValueOnce({ ok: false, reason: 'invalid_credentials' });
    const { req, res, responses, sendJson } = makeReqRes('POST', '/api/auth/login', {
      email: 'a@b.com',
      password: 'wrong',
    });
    const handled = await handleAuthRoute(req, res, '/api/auth/login', sendJson);
    expect(handled).toBe(true);
    expect(responses[0].status).toBe(401);
    expect(responses[0].payload.error).toBe('invalid_credentials');
  });

  it('responds 200 with token and user on success', async () => {
    const user = { id: 'u-1', email: 'a@b.com', tenantId: 'tenant-001' };
    vi.mocked(authenticateUser).mockResolvedValueOnce({ ok: true, user });
    vi.mocked(createSession).mockResolvedValueOnce('deadbeef'.repeat(8));

    const { req, res, responses, sendJson } = makeReqRes('POST', '/api/auth/login', {
      email: 'a@b.com',
      password: 'correct',
    });
    const handled = await handleAuthRoute(req, res, '/api/auth/login', sendJson);
    expect(handled).toBe(true);
    expect(responses[0].status).toBe(200);
    expect(responses[0].payload.token).toBe('deadbeef'.repeat(8));
    expect(responses[0].payload.user.email).toBe('a@b.com');
  });

  it('enriches user with tenantName + entities from fetchContext', async () => {
    const user = { id: 'u-1', email: 'a@b.com', tenantId: 't-001' };
    vi.mocked(authenticateUser).mockResolvedValueOnce({ ok: true, user });
    vi.mocked(createSession).mockResolvedValueOnce('tok123');
    vi.mocked(fetchContext).mockResolvedValueOnce({
      tenantName: 'Acme Corp',
      tenantCode: 'ACME',
      entities: [{ id: 'e-1', name: 'Main', code: 'MAIN', isDefault: true }],
    });

    const { req, res, responses, sendJson } = makeReqRes('POST', '/api/auth/login', {
      email: 'a@b.com',
      password: 'correct',
    });
    await handleAuthRoute(req, res, '/api/auth/login', sendJson);
    const { user: u } = responses[0].payload;
    expect(u.tenantName).toBe('Acme Corp');
    expect(u.entities).toHaveLength(1);
  });

  it('does not leak password or passwordHash in response', async () => {
    const user = { id: 'u-1', email: 'a@b.com', tenantId: 'tenant-001' };
    vi.mocked(authenticateUser).mockResolvedValueOnce({ ok: true, user });
    vi.mocked(createSession).mockResolvedValueOnce('abc123');

    const { req, res, responses, sendJson } = makeReqRes('POST', '/api/auth/login', {
      email: 'a@b.com',
      password: 'correct',
    });
    await handleAuthRoute(req, res, '/api/auth/login', sendJson);
    const { payload } = responses[0];
    expect(payload.user.password).toBeUndefined();
    expect(payload.user.passwordHash).toBeUndefined();
  });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

describe('handleAuthRoute — GET /api/auth/me', () => {
  it('returns false for non-matching route', async () => {
    const { req, res, sendJson } = makeReqRes('GET', '/api/invoices', null);
    expect(await handleAuthRoute(req, res, '/api/invoices', sendJson)).toBe(false);
  });

  it('responds 401 when req.user is not set (no session)', async () => {
    const { req, res, responses, sendJson } = makeReqRes('GET', '/api/auth/me', null);
    const handled = await handleAuthRoute(req, res, '/api/auth/me', sendJson);
    expect(handled).toBe(true);
    expect(responses[0].status).toBe(401);
  });

  it('responds 401 when getUserById returns null (user deleted/inactive)', async () => {
    vi.mocked(getUserById).mockResolvedValueOnce(null);
    const { req, res, responses, sendJson } = makeReqRes('GET', '/api/auth/me', null, {
      reqUser: { userId: 'u-1', sessionId: 's-1', tenantId: 't-1', email: 'a@b.com' },
    });
    const handled = await handleAuthRoute(req, res, '/api/auth/me', sendJson);
    expect(handled).toBe(true);
    expect(responses[0].status).toBe(401);
    expect(responses[0].payload.error).toBe('user_not_found');
  });

  it('responds 200 with enriched user on valid session', async () => {
    const dbUser = { id: 'u-1', email: 'a@b.com', name: 'Alice', role: 'Admin', tenantId: 't-1' };
    vi.mocked(getUserById).mockResolvedValueOnce(dbUser);
    vi.mocked(fetchContext).mockResolvedValueOnce({
      tenantName: 'Acme Corp',
      tenantCode: 'ACME',
      entities: [{ id: 'e-1', name: 'Main', code: 'MAIN', isDefault: true }],
    });

    const { req, res, responses, sendJson } = makeReqRes('GET', '/api/auth/me', null, {
      reqUser: { userId: 'u-1', sessionId: 's-1', tenantId: 't-1', email: 'a@b.com' },
    });
    const handled = await handleAuthRoute(req, res, '/api/auth/me', sendJson);
    expect(handled).toBe(true);
    expect(responses[0].status).toBe(200);
    expect(responses[0].payload.user.email).toBe('a@b.com');
    expect(responses[0].payload.user.tenantName).toBe('Acme Corp');
    expect(responses[0].payload.user.entities).toHaveLength(1);
  });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────

describe('handleAuthRoute — POST /api/auth/logout', () => {
  it('revokes session and responds 200', async () => {
    vi.mocked(revokeSession).mockResolvedValueOnce(undefined);
    const { req, res, responses, sendJson } = makeReqRes('POST', '/api/auth/logout', null, {
      reqUser: { userId: 'u-1', sessionId: 'sess-abc', tenantId: 't-1', email: 'a@b.com' },
    });
    const handled = await handleAuthRoute(req, res, '/api/auth/logout', sendJson);
    expect(handled).toBe(true);
    expect(responses[0].status).toBe(200);
    expect(revokeSession).toHaveBeenCalledWith('sess-abc');
  });

  it('responds 200 even when req.user is absent (no session to revoke)', async () => {
    const { req, res, responses, sendJson } = makeReqRes('POST', '/api/auth/logout', null);
    const handled = await handleAuthRoute(req, res, '/api/auth/logout', sendJson);
    expect(handled).toBe(true);
    expect(responses[0].status).toBe(200);
    expect(revokeSession).not.toHaveBeenCalled();
  });
});

// ── lookupSession (token validates on subsequent request) ─────────────────────

describe('lookupSession — token validates on subsequent request', () => {
  it('returns session metadata for a valid stored token', async () => {
    const expectedSession = {
      sessionId: 'sess-1',
      userId: 'u-001',
      tenantId: 'tenant-001',
      email: 'a@b.com',
    };
    vi.mocked(lookupSession).mockResolvedValueOnce(expectedSession);

    const session = await lookupSession('some_token');
    expect(session).toEqual(expectedSession);
  });

  it('returns null for an invalid / expired token', async () => {
    vi.mocked(lookupSession).mockResolvedValueOnce(null);
    expect(await lookupSession('bad_token')).toBeNull();
  });
});
