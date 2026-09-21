import { apiFetch, saveSession, clearSession, getToken, API_BASE } from './client'
import { xLog } from './xLog'

export interface LoginResult {
  token: string
  tokenType: string
  expiresInSeconds: number
  username: string
}

export async function register(username: string, password: string) {
  const { response, data } = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  if (!response.ok || data?.code !== 0) {
    throw new Error(data?.message || '注册失败')
  }
  const result = data.data as LoginResult
  saveSession(result.token, result.username)
  return result
}

export async function login(username: string, password: string) {
  const path = '/api/auth/login'
  xLog('login.start', { method: 'POST', url: `${API_BASE}${path}`, username })
  const started = Date.now()
  let gotResponse = false
  try {
    const { response, data } = await apiFetch(path, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    gotResponse = true
    xLog('login.api', {
      method: 'POST',
      url: `${API_BASE}${path}`,
      status: response.status,
      code: data?.code ?? null,
      message: data?.message ?? null,
      ms: Date.now() - started,
      ok: response.ok && data?.code === 0,
    })
    if (!response.ok || data?.code !== 0) {
      throw new Error(data?.message || '登录失败')
    }
    const result = data.data as LoginResult
    saveSession(result.token, result.username)
    return result
  } catch (err) {
    if (!gotResponse) {
      xLog('login.error', {
        url: `${API_BASE}${path}`,
        ms: Date.now() - started,
        message: err instanceof Error ? err.message : '登录失败',
      })
    }
    throw err
  }
}

export async function fetchMe() {
  const { response, data } = await apiFetch('/api/auth/me')
  if (!response.ok || data?.code !== 0) {
    clearSession()
    return null
  }
  return data.data as { username: string }
}

export async function logout() {
  try {
    if (getToken()) {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    }
  } finally {
    clearSession()
  }
}
