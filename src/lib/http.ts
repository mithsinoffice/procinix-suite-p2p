// Thin wrapper around fetch — used only inside src/lib/api/ modules.
// Never call this directly from components — use TanStack Query hooks.

export interface ApiError {
  code:     string
  message:  string
  details?: Record<string, unknown>
  status:   number
}

export class HttpError extends Error {
  constructor(public readonly error: ApiError) {
    super(error.message)
    this.name = 'HttpError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include', // always send httpOnly cookies
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!res.ok) {
    let error: ApiError
    try {
      const body = await res.json()
      error = { ...body, status: res.status }
    } catch {
      error = { code: 'UNKNOWN', message: res.statusText, status: res.status }
    }
    throw new HttpError(error)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const http = {
  get:    <T>(path: string)                  => request<T>(path),
  post:   <T>(path: string, body: unknown)   => request<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown)   => request<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown)   => request<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: <T>(path: string)                  => request<T>(path, { method: 'DELETE' }),
}
