import { redirect } from 'next/navigation'
import type { SearchParams } from 'next/dist/server/request/search-params'

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const qs = new URLSearchParams()

  // Forward any active filters so the redirect preserves them
  const forwarded = ['context', 'platform', 'category', 'evaluatorType', 'status', 'vitalVerdict', 'minVital10', 'maxRisk']
  for (const key of forwarded) {
    const val = params[key]
    if (typeof val === 'string' && val) qs.set(key, val)
  }

  const target = qs.size > 0
    ? `/results/final?${qs.toString()}`
    : '/results/final'

  redirect(target)
}
