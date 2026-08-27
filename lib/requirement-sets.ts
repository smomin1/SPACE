import { prisma } from '@/lib/prisma'

// The seeded domain every pre-existing Tool Scanner scan/question belongs to.
// Pipeline auto-sync (linking a scan into Platform.pipelineStages) is ESL-specific
// and must only fire for this domain — never key that check off "first" or
// "order === 0", since admins can reorder sets.
export const ESL_REQUIREMENT_SET_KEY = 'esl'

export async function listActiveRequirementSets() {
  return prisma.requirementSet.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
  })
}

/**
 * Resolve the RequirementSet a page/request should use: the one matching `key`
 * if given and active, otherwise the first active set. Returns null if there
 * are no active sets at all.
 */
export async function resolveRequirementSet(key?: string | null) {
  const sets = await listActiveRequirementSets()
  const found = key ? sets.find((s) => s.key === key) : undefined
  return found ?? sets[0] ?? null
}

/**
 * Shared server-side lookup for Tool Scanner pages: the full active-set list (for
 * the domain switcher) plus the resolved current set for the `?set=` query param.
 */
export async function getToolScannerContext(setParam?: string | null) {
  const sets = await listActiveRequirementSets()
  const found = setParam ? sets.find((s) => s.key === setParam) : undefined
  const current = found ?? sets[0] ?? null
  return { sets, current }
}
