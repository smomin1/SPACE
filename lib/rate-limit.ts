type Entry = { count: number; resetAt: number }

// Anchored to globalThis so the store survives hot-module re-evaluation in dev
declare global {
  // eslint-disable-next-line no-var
  var __rateLimitStore: Map<string, Entry> | undefined
}
if (!globalThis.__rateLimitStore) {
  globalThis.__rateLimitStore = new Map<string, Entry>()
}
const store = globalThis.__rateLimitStore

// Purge stale entries every 5 minutes to avoid unbounded memory growth
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}, 5 * 60 * 1000)

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  if (entry.count >= limit) {
    return { allowed: false }
  }

  entry.count++
  return { allowed: true }
}
