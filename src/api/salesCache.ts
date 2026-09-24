const buckets = new Map<string, unknown>()
const pending = new Map<string, Promise<unknown>>()
const generations = new Map<string, number>()
let epoch = 0
let cacheDay = ''

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function todayKey() {
  const date = new Date()
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function rollDay() {
  const today = todayKey()
  if (cacheDay === today) return
  buckets.clear()
  pending.clear()
  generations.clear()
  epoch += 1
  cacheDay = today
}

function stamp(key: string) {
  return `${epoch}:${generations.get(key) ?? 0}`
}

function bump(key: string) {
  generations.set(key, (generations.get(key) ?? 0) + 1)
  buckets.delete(key)
}

export function clearSalesCache() {
  buckets.clear()
  pending.clear()
  generations.clear()
  epoch += 1
  cacheDay = todayKey()
}

export function invalidateAfterCheckout() {
  const today = todayKey()
  bump(`details:${today}|${today}`)
  bump('compare:week')
  bump('compare:month')
  bump('compare:year')
  bump('ranks')
}

export function invalidateRanks() {
  bump('ranks')
}

export function readSalesCache<T>(key: string): T | undefined {
  rollDay()
  return buckets.get(key) as T | undefined
}

export function loadSalesCache<T>(key: string, load: () => Promise<T>): Promise<T> {
  rollDay()
  const hit = buckets.get(key) as T | undefined
  if (hit) return Promise.resolve(hit)
  const existing = pending.get(key) as Promise<T> | undefined
  if (existing) return existing
  const seen = stamp(key)
  const job = load()
    .then((value) => {
      if (stamp(key) === seen) buckets.set(key, value)
      return value
    })
    .finally(() => {
      if (pending.get(key) === job) pending.delete(key)
    })
  pending.set(key, job)
  return job
}
