import { clearSalesCache } from './salesCache'

const TOKEN_KEY = 'tf.accessToken'
const USER_KEY = 'tf.username'

export const API_BASE =
  import.meta.env.VITE_API_BASE?.replace(/\/$/, '') || 'http://localhost:8080'

function readPersisted(key: string): string | null {
  const fromLocal = localStorage.getItem(key)
  if (fromLocal) return fromLocal
  const fromSession = sessionStorage.getItem(key)
  if (fromSession) {
    localStorage.setItem(key, fromSession)
    sessionStorage.removeItem(key)
  }
  return fromSession
}

export function getToken(): string | null {
  return readPersisted(TOKEN_KEY)
}

export function getStoredUsername(): string | null {
  return readPersisted(USER_KEY)
}

export function saveSession(token: string, username: string) {
  clearSalesCache()
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, username)
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}

export function clearSession() {
  clearSalesCache()
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  })

  const data = await response.json().catch(() => null)
  if (response.status === 401) {
    clearSession()
  }
  return { response, data }
}
