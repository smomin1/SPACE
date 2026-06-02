// Applies parsed VITAL records to the DB idempotently (upsert on natural keys).
// Shared by the xlsx import/apply route. Returns created/updated/skipped counts.
import type { PrismaClient } from "@prisma/client";
import type { ParsedTool, ParsedRecommendation, ParsedLevel } from "./parse";

export interface ApplyInput {
  tools?: ParsedTool[];
  recommendations?: ParsedRecommendation[];
  levels?: ParsedLevel[];
}

export interface ApplyResult {
  created: number;
  updated: number;
  skipped: number;
}

export async function applyVitalRecords(
  prisma: PrismaClient,
  input: ApplyInput
): Promise<ApplyResult> {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  // ── Levels ──
  for (const l of input.levels ?? []) {
    const existing = await prisma.vitalLevel.findUnique({ where: { code: l.code } });
    const data = {
      label: l.code,
      order: 0,
      scoreBand: l.scoreBand,
      cefrStatus: l.cefrStatus,
      bandGroup: l.code,
    };
    if (existing) {
      await prisma.vitalLevel.update({ where: { code: l.code }, data: { scoreBand: l.scoreBand, cefrStatus: l.cefrStatus } });
      updated++;
    } else {
      await prisma.vitalLevel.create({ data: { code: l.code, ...data } });
      created++;
    }
  }

  const skillIdByName = new Map(
    (await prisma.vitalSkill.findMany()).map((s) => [s.name, s.id])
  );
  const levelIdByCode = new Map(
    (await prisma.vitalLevel.findMany()).map((l) => [l.code, l.id])
  );

  // ── Tools (+ children) ──
  for (const t of input.tools ?? []) {
    const existing = await prisma.vitalTool.findUnique({ where: { name: t.name } });
    const scalar = {
      role: t.role,
      vitalScore10: t.vitalScore10,
      v2Score50: t.v2Score50,
      verdict: t.verdict,
      deFactoRisk: t.deFactoRisk,
      overallDependency: t.overallDependency,
      belowA0: t.belowA0,
      cefrRangeLabel: t.cefrRangeLabel,
      isAssessmentTool: t.isAssessmentTool,
      adaptiveTesting: t.adaptiveTesting,
      notes: t.notes,
    };
    const tool = existing
      ? await prisma.vitalTool.update({ where: { name: t.name }, data: scalar })
      : await prisma.vitalTool.create({ data: { name: t.name, ...scalar } });
    if (existing) updated++;
    else created++;

    await prisma.vitalToolPillarRating.deleteMany({ where: { toolId: tool.id } });
    await prisma.vitalToolSkillCoverage.deleteMany({ where: { toolId: tool.id } });
    await prisma.vitalToolLevelMapping.deleteMany({ where: { toolId: tool.id } });

    if (t.pillarRatings.length) {
      await prisma.vitalToolPillarRating.createMany({
        data: t.pillarRatings.map((p) => ({ toolId: tool.id, pillar: p.pillar, rating: p.rating })),
      });
    }
    if (t.skillCoverage.length) {
      await prisma.vitalToolSkillCoverage.createMany({
        data: t.skillCoverage
          .filter((s) => skillIdByName.has(s.skill))
          .map((s) => ({
            toolId: tool.id,
            skillId: skillIdByName.get(s.skill)!,
            coverage: s.coverage,
            dependency: s.dependency,
          })),
      });
    }
    if (t.levelMappings.length) {
      await prisma.vitalToolLevelMapping.createMany({
        data: t.levelMappings
          .filter((m) => levelIdByCode.has(m.levelCode))
          .map((m) => ({ toolId: tool.id, levelId: levelIdByCode.get(m.levelCode)!, coverage: m.coverage })),
      });
    }
  }

  const toolIdByName = new Map(
    (await prisma.vitalTool.findMany()).map((t) => [t.name, t.id])
  );

  // ── Recommendations ──
  for (const r of input.recommendations ?? []) {
    const skillId = skillIdByName.get(r.skill);
    const levelId = levelIdByCode.get(r.levelCode);
    if (!skillId || !levelId) {
      skipped++;
      continue;
    }
    const data = {
      coreToolId: r.coreTool ? toolIdByName.get(r.coreTool) ?? null : null,
      suppToolId: r.suppTool ? toolIdByName.get(r.suppTool) ?? null : null,
      coreDependency: r.coreDependency,
      suppDependency: r.suppDependency,
      coreRisk: r.coreRisk,
      suppRisk: r.suppRisk,
      pillarV: r.pillarV,
      pillarI: r.pillarI,
      pillarT: r.pillarT,
      pillarA: r.pillarA,
      pillarL: r.pillarL,
      status: r.status,
      deploymentNote: r.deploymentNote,
    };
    const existing = await prisma.vitalRecommendation.findUnique({
      where: { skillId_levelId: { skillId, levelId } },
    });
    if (existing) {
      await prisma.vitalRecommendation.update({
        where: { skillId_levelId: { skillId, levelId } },
        data,
      });
      updated++;
    } else {
      await prisma.vitalRecommendation.create({ data: { skillId, levelId, ...data } });
      created++;
    }
  }

  return { created, updated, skipped };
}
