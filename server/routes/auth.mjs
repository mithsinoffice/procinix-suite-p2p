/**
 * Auth routes — POST /api/auth/login
 * Convention: this module is imported by server/index.mjs and called after the auth gate.
 * The route is in PUBLIC_PATHS so it bypasses the auth middleware.
 */
import { authenticateUser, createSession } from '../services/auth/loginService.mjs';

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
  if (req.method !== 'POST' || pathname !== '/api/auth/login') return false;

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
  sendJson(res, 200, { token, user: result.user });
  return true;
}
