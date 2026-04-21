export const mysqlApiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

export function isMysqlApiEnabled() {
  return Boolean(mysqlApiBaseUrl);
}

/** Bearer + JSON content-type (optional acting user added per-request for /api/admin/*). */
export function buildMysqlApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token =
    (typeof localStorage !== 'undefined' && localStorage.getItem('token')) ||
    import.meta.env.VITE_API_SECRET_KEY ||
    '';
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function actingUserEmailForAdminPath(path: string): string | undefined {
  if (!path.startsWith('/admin/') || typeof localStorage === 'undefined') {
    return undefined;
  }
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return undefined;
    const u = JSON.parse(raw) as { email?: string };
    return u.email?.trim() || undefined;
  } catch {
    return undefined;
  }
}

export async function mysqlApiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const extra =
    init?.headers && typeof init.headers === 'object' && !Array.isArray(init.headers)
      ? (init.headers as Record<string, string>)
      : {};
  const acting = actingUserEmailForAdminPath(path);
  const response = await fetch(`${mysqlApiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...buildMysqlApiHeaders(),
      ...(acting ? { 'X-User-Email': acting } : {}),
      ...extra,
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string'
        ? payload.error
        : `MySQL API request failed with status ${response.status}`
    );
  }

  return payload as T;
}
