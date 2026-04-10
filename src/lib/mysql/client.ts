export const mysqlApiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

export function isMysqlApiEnabled() {
  return Boolean(mysqlApiBaseUrl);
}

export async function mysqlApiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${mysqlApiBaseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
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
