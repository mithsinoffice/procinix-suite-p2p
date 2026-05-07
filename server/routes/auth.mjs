/**
 * Auth routes — POST /api/auth/login | GET /api/auth/me | POST /api/auth/logout
 * Convention: this module is imported by server/index.mjs and called after the auth gate.
 * /api/auth/login is in PUBLIC_PATHS (bypasses auth middleware).
 * /api/auth/me and /api/auth/logout go through the auth gate (req.user set by isAuthenticated).
 */
import {
  authenticateUser,
  createSession,
  fetchContext,
  getUserById,
  revokeSession,
} from '../services/auth/loginService.mjs';

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

/**
 * Handle auth-related routes. Returns true if the request was handled, false otherwise.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse}  res
 * @param {string}                               pathname
 * @param {(res, status, body) => void}          sendJson  - from server/index.mjs
 */
export async function handleAuthRoute(req, res, pathname, sendJson) {
  // ── POST /api/auth/login ────────────────────────────────────────────────────
  if (req.method === 'POST' && pathname === '/api/auth/login') {
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      sendJson(res, 400, { error: 'invalid_json' });
      return true;
    }

    const { email, password } = body ?? {};
    if (!email || !password) {
      sendJson(res, 400, { error: 'email and password are required' });
      return true;
    }

    const result = await authenticateUser({ email: String(email), password: String(password) });

    if (!result.ok) {
      sendJson(res, 401, { error: 'invalid_credentials' });
      return true;
    }

    const token = await createSession(result.user);

    const ctx = await fetchContext(result.user.id, result.user.tenantId).catch(() => null);
    const enrichedUser = ctx
      ? { ...result.user, tenantName: ctx.tenantName, tenantCode: ctx.tenantCode, entities: ctx.entities }
      : result.user;

    sendJson(res, 200, { token, user: enrichedUser });
    return true;
  }

  // ── GET /api/auth/me ────────────────────────────────────────────────────────
  if (req.method === 'GET' && pathname === '/api/auth/me') {
    const userId = req.user?.userId;
    if (!userId) {
      sendJson(res, 401, { error: 'unauthenticated' });
      return true;
    }

    const userRow = await getUserById(userId);
    if (!userRow) {
      sendJson(res, 401, { error: 'user_not_found' });
      return true;
    }

    const ctx = await fetchContext(userId, req.user.tenantId).catch(() => null);
    const enrichedUser = ctx
      ? { ...userRow, tenantName: ctx.tenantName, tenantCode: ctx.tenantCode, entities: ctx.entities }
      : userRow;

    sendJson(res, 200, { user: enrichedUser });
    return true;
  }

  // ── POST /api/auth/logout ───────────────────────────────────────────────────
  if (req.method === 'POST' && pathname === '/api/auth/logout') {
    const sessionId = req.user?.sessionId;
    if (sessionId) {
      await revokeSession(sessionId).catch(() => {});
    }
    sendJson(res, 200, { ok: true });
    return true;
  }

  return false;
}
