// Server glue between Prisma and the pure deriveRecommendation function.

import { prisma } from "@/lib/prisma";
import { deriveRecommendation, type ToolForDerive } from "./derive";

// Tool fields the derivation needs. Teaching tools only; assessment tools are
// never recommended as core/supplementary.
export async function loadToolsForDerive(): Promise<ToolForDerive[]> {
  const tools = await prisma.vitalTool.findMany({
    where: { isAssessmentTool: false },
    select: {
      id: true,
      name: true,
      role: true,
      vitalScore10: true,
      deFactoRisk: true,
      overallDependency: true,
      pillarRatings: { select: { pillar: true, rating: true } },
      skillCoverage: { select: { skillId: true, coverage: true } },
      levelMappings: { select: { levelId: true, coverage: true } },
    },
  });
  return tools;
}

// Compute the derived fields for one recommendation, honouring locked slots.
export function deriveFields(
  tools: ToolForDerive[],
  input: {
    skillId: string;
    levelId: string;
    coreToolLocked: boolean;
    suppToolLocked: boolean;
    coreToolId: string | null;
    suppToolId: string | null;
  }
) {
  return deriveRecommendation({ tools, ...input });
}

// Recompute every recommendation from the current catalogue, keeping locked
// tool slots pinned and auto-picking the rest. Used after the tool catalogue
// changes (admin "Recompute" button and the VITAL evaluator submit). Returns
// the number of rows whose stored values actually changed.
export async function recomputeRecommendations(): Promise<{ changed: number }> {
  const [tools, recs] = await Promise.all([
    loadToolsForDerive(),
    prisma.vitalRecommendation.findMany(),
  ]);

  let changed = 0;
  await prisma.$transaction(async (tx) => {
    for (const r of recs) {
      const derived = deriveRecommendation({
        tools,
        skillId: r.skillId,
        levelId: r.levelId,
        coreToolLocked: r.coreToolLocked,
        suppToolLocked: r.suppToolLocked,
        coreToolId: r.coreToolId,
        suppToolId: r.suppToolId,
      });
      const dirty =
        derived.coreToolId !== r.coreToolId ||
        derived.suppToolId !== r.suppToolId ||
        derived.coreDependency !== r.coreDependency ||
        derived.suppDependency !== r.suppDependency ||
        derived.coreRisk !== r.coreRisk ||
        derived.suppRisk !== r.suppRisk ||
        derived.pillarV !== r.pillarV ||
        derived.pillarI !== r.pillarI ||
        derived.pillarT !== r.pillarT ||
        derived.pillarA !== r.pillarA ||
        derived.pillarL !== r.pillarL ||
        derived.status !== r.status;
      if (!dirty) continue;
      changed++;
      await tx.vitalRecommendation.update({ where: { id: r.id }, data: derived });
    }
  });
  return { changed };
}
