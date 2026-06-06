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

// Ensure a recommendation cell exists for every teaching skill × CEFR level
// (assessment-only levels are excluded, matching the grid/level-stack views).
// Missing cells are created with fully derived values so the recommendation
// matrix is built straight from the evaluated tool catalogue - no seed or
// manual authoring required. Returns how many cells were created.
export async function createMissingRecommendationCells(
  tools?: ToolForDerive[],
): Promise<{ created: number }> {
  const [loadedTools, skills, levels, existing] = await Promise.all([
    tools ? Promise.resolve(tools) : loadToolsForDerive(),
    prisma.vitalSkill.findMany({ select: { id: true } }),
    prisma.vitalLevel.findMany({
      where: { assessmentOnly: false },
      select: { id: true },
    }),
    prisma.vitalRecommendation.findMany({ select: { skillId: true, levelId: true } }),
  ]);

  const have = new Set(existing.map((r) => `${r.skillId}:${r.levelId}`));

  const toCreate = [];
  for (const s of skills) {
    for (const l of levels) {
      if (have.has(`${s.id}:${l.id}`)) continue;
      // New cells have no locks and no authored note - purely derived.
      const derived = deriveRecommendation({
        tools: loadedTools,
        skillId: s.id,
        levelId: l.id,
      });
      toCreate.push({ skillId: s.id, levelId: l.id, ...derived });
    }
  }

  if (toCreate.length) {
    await prisma.vitalRecommendation.createMany({ data: toCreate });
  }
  return { created: toCreate.length };
}

// Recompute the whole recommendation matrix from the current catalogue. First
// fills in any missing skill × level cells, then refreshes every existing cell
// (keeping locked tool slots pinned and the authored deployment note intact,
// auto-picking the rest). Used after the catalogue changes - the admin
// "Recompute" button and, crucially, every VITAL evaluator submit - so a new
// evaluation flows straight into the recommendations. Returns how many rows
// were created and how many existing rows changed.
export async function recomputeRecommendations(): Promise<{
  changed: number;
  created: number;
}> {
  const { created } = await createMissingRecommendationCells();

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
  return { changed, created };
}
