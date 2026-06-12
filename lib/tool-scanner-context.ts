import type { WeightLevel } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { applyContextWeights } from '@/lib/scoring'
import type { Requirement } from '@/lib/scoring'

export type ToolScannerRequirement = {
  id: string
  title: string
  description: string
  category: string | null
  weight: WeightLevel
  isComplianceGate: boolean
}

/**
 * Loads requirements for the Tool Scanner, optionally scoped to a specific Context.
 *
 * When `contextId` is provided:
 *   - Requirements are filtered to those linked to the context via `RequirementContext`.
 *   - The `weight` on each returned requirement is replaced with the context-specific
 *     `RequirementContext.weightOverride` when one is set (otherwise the global weight is kept).
 *
 * When `contextId` is null/undefined, the full requirement set is returned with global weights.
 *
 * Returns both the full requirement records (with override weights baked in) and a
 * lightweight `scoringRequirements` array suitable for `calculateWeightedPercentage`.
 */
export async function loadToolScannerRequirements(contextId?: string | null): Promise<{
  requirements: ToolScannerRequirement[]
  scoringRequirements: Requirement[]
  weightOverrideMap: Map<string, WeightLevel>
}> {
  const ctxFilter = contextId
    ? { contexts: { some: { contextId } } }
    : undefined

  const [raw, overrideRows] = await Promise.all([
    prisma.requirement.findMany({
      where: ctxFilter,
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    }),
    contextId
      ? prisma.requirementContext.findMany({
          where: { contextId },
          select: { requirementId: true, weightOverride: true },
        })
      : Promise.resolve([] as { requirementId: string; weightOverride: WeightLevel | null }[]),
  ])

  const weightOverrideMap = new Map<string, WeightLevel>(
    overrideRows
      .filter((o): o is { requirementId: string; weightOverride: WeightLevel } => o.weightOverride !== null)
      .map((o) => [o.requirementId, o.weightOverride]),
  )

  // Apply context overrides at the source so every downstream consumer sees the
  // correct weight without needing to know about overrides.
  const requirements: ToolScannerRequirement[] = raw.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    weight: weightOverrideMap.get(r.id) ?? r.weight,
    isComplianceGate: r.isComplianceGate,
  }))

  const scoringRequirements: Requirement[] = applyContextWeights(
    requirements.map((r) => ({
      id: r.id,
      weight: r.weight,
      category: r.category,
      isComplianceGate: r.isComplianceGate,
      contextIds: [],
    })),
    weightOverrideMap,
  )

  return { requirements, scoringRequirements, weightOverrideMap }
}
