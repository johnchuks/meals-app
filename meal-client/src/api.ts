import type { UserRole } from './types'

const ACCESS_KEY = 'meals.access'
const REFRESH_KEY = 'meals.refresh'

function decodeRole(token: string): UserRole | null {
  try {
    const payload = token.split('.')[1]
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(padded + '==='.slice((padded.length + 3) % 4))
    const claims = JSON.parse(json) as { role?: string }
    if (claims.role === 'DIETARY_STAFF' || claims.role === 'KITCHEN_STAFF') {
      return claims.role
    }
    return null
  } catch {
    return null
  }
}

export const auth = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  getRole: (): UserRole | null => {
    const token = localStorage.getItem(ACCESS_KEY)
    return token ? decodeRole(token) : null
  },
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

export class ApiError extends Error {
  status: number
  body: unknown
  constructor(status: number, body: unknown, message: string) {
    super(message)
    this.status = status
    this.body = body
  }
}

function pickMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>
    if (typeof b.detail === 'string') return b.detail
    const first = Object.values(b)[0]
    if (typeof first === 'string') return first
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0]
  }
  return fallback
}

export const AUTH_EXPIRED_EVENT = 'meals.auth.expired'

let refreshInFlight: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight
  const refresh = auth.getRefresh()
  if (!refresh) return null

  refreshInFlight = (async () => {
    try {
      const res = await fetch('/api/auth/token/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      })
      if (!res.ok) return null
      const data = (await res.json()) as { access?: string; refresh?: string }
      if (!data.access) return null
      auth.set(data.access, data.refresh ?? refresh)
      return data.access
    } catch {
      return null
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

async function send(path: string, init: RequestInit, token: string | null): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(`/api${path}`, { ...init, headers })
}

export async function api<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let res = await send(path, init, auth.getAccess())

  if (res.status === 401 && auth.getRefresh() && path !== '/auth/token/refresh') {
    const newToken = await refreshAccessToken()
    if (newToken) {
      res = await send(path, init, newToken)
    } else {
      auth.clear()
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
    }
  }

  if (res.status === 204) return undefined as T

  let body: unknown = null
  const text = await res.text()
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, body, pickMessage(body, res.statusText))
  }
  return body as T
}

export async function login(
  username: string,
  password: string,
): Promise<UserRole> {
  const data = await api<{ access: string; refresh: string }>('/auth/token', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  auth.set(data.access, data.refresh)
  const role = decodeRole(data.access)
  if (!role) {
    auth.clear()
    throw new Error('Token is missing a valid role claim')
  }
  return role
}
