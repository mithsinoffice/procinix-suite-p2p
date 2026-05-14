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

let isRefreshing = false

async function request<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })

  // Auto-refresh on 401 and retry once
  if (res.status === 401 && retry && !isRefreshing) {
    isRefreshing = true
    try {
      await fetch('/auth/refresh', { method: 'POST', credentials: 'include' })
      isRefreshing = false
      return request<T>(path, init, false) // retry once
    } catch {
      isRefreshing = false
      window.location.href = '/login'
      throw new HttpError({ code: 'TOKEN_EXPIRED', message: 'Session expired', status: 401 })
    }
  }

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
