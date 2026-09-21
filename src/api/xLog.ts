const SENSITIVE_KEY = /password|token|secret|authorization|cookie/i

function isXLogEnabled() {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('x_log') === '1'
}

function sanitize(info: Record<string, unknown>) {
  const safe: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(info)) {
    safe[key] = SENSITIVE_KEY.test(key) ? '[redacted]' : value
  }
  return safe
}

/** 仅当页面 URL 带 x_log=1 时输出，默认静默。 */
export function xLog(event: string, info?: Record<string, unknown>) {
  if (!isXLogEnabled()) return
  if (info) {
    console.log(`[x_log] ${event}`, sanitize(info))
    return
  }
  console.log(`[x_log] ${event}`)
}
