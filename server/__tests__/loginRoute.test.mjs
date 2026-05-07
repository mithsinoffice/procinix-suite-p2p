import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../services/auth/loginService.mjs', () => ({
  authenticateUser: vi.fn(),
  createSession:    vi.fn(),
  lookupSession:    vi.fn(),
  ensureSessionsTable: vi.fn().mockResolvedValue(undefined),
}));

import { authenticateUser, createSession, lookupSession } from '../services/auth/loginService.mjs';
import { handleAuthRoute } from '../routes/auth.mjs';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReqRes(method, pathname, body) {
  // Minimal mock of IncomingMessage — simulate async iteration for body reading
  const bodyChunks = body ? [Buffer.from(JSON.stringify(body))] : [];
  const req = {
    method,
    url: pathname,
    [Symbol.asyncIterator]: async function* () { yield* bodyChunks; },
  };
  const responses = [];
  const sendJson = (res, status, payload) => responses.push({ status, payload });
  const res = {};
  return { req, res, responses, sendJson };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── handleAuthRoute tests ─────────────────────────────────────────────────────

describe('handleAuthRoute — POST /api/auth/login', () => {
  it('returns false for non-matching route', async () => {
    const { req, res, sendJson } = makeReqRes('GET', '/api/invoices', null);
    const handled = await handleAuthRoute(req, res, '/api/invoices', sendJson);
    expect(handled).toBe(false);
  });

  it('responds 400 when email is missing', async () => {
    const { req, res, responses, sendJson } = makeReqRes('POST', '/api/auth/login', { password: 'x' });
    const handled = await handleAuthRoute(req, res, '/api/auth/login', sendJson);
    expect(handled).toBe(true);
    expect(responses[0].status).toBe(400);
  });

  it('responds 400 when password is missing', async () => {
    const { req, res, responses, sendJson } = makeReqRes('POST', '/api/auth/login', { email: 'a@b.com' });
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
      email: 'a@b.com', password: 'wrong',
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
      email: 'a@b.com', password: 'correct',
    });
    const handled = await handleAuthRoute(req, res, '/api/auth/login', sendJson);
    expect(handled).toBe(true);
    expect(responses[0].status).toBe(200);
    expect(responses[0].payload.token).toBe('deadbeef'.repeat(8));
    expect(responses[0].payload.user).toEqual(user);
  });

  it('does not leak password or passwordHash in response', async () => {
    const user = { id: 'u-1', email: 'a@b.com', tenantId: 'tenant-001' };
    vi.mocked(authenticateUser).mockResolvedValueOnce({ ok: true, user });
    vi.mocked(createSession).mockResolvedValueOnce('abc123');

    const { req, res, responses, sendJson } = makeReqRes('POST', '/api/auth/login', {
      email: 'a@b.com', password: 'correct',
    });
    await handleAuthRoute(req, res, '/api/auth/login', sendJson);
    const { payload } = responses[0];
    expect(payload.user.password).toBeUndefined();
    expect(payload.user.passwordHash).toBeUndefined();
  });
});

// ── lookupSession (token validates on subsequent request) ─────────────────────

describe('lookupSession — token validates on subsequent request', () => {
  it('returns session metadata for a valid stored token', async () => {
    const expectedSession = {
      sessionId: 'sess-1',
      userId:    'u-001',
      tenantId:  'tenant-001',
      email:     'a@b.com',
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
