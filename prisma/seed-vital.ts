// Seeds the VITAL module from the committed JSON fixtures (prisma/vital-data/*).
// Idempotent via upsert on natural keys. Asserts exact counts and fails loudly.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PrismaClient } from "@prisma/client";
import type { ParsedTool, ParsedRecommendation, ParsedLevel } from "../lib/vital/parse";
import { SKILLS, ALL_LEVELS } from "../lib/vital/constants";
import { deriveRecommendation, type ToolForDerive } from "../lib/vital/derive";

function load<T>(file: string): T {
  return JSON.parse(
    readFileSync(join(process.cwd(), "prisma", "vital-data", file), "utf8")
  ) as T;
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`VITAL seed assertion failed: ${msg}`);
}

export async function seedVital(prisma: PrismaClient) {
  const tools = load<ParsedTool[]>("tools.json");
  const recommendations = load<ParsedRecommendation[]>("recommendations.json");
  const levelData = load<ParsedLevel[]>("levels.json");

  // ── Skills ──
  for (const s of SKILLS) {
    await prisma.vitalSkill.upsert({
      where: { name: s.name },
      update: { order: s.order },
      create: { name: s.name, order: s.order },
    });
  }
  const skillIdByName = new Map(
    (await prisma.vitalSkill.findMany()).map((s) => [s.name, s.id])
  );

  // ── Levels (22 canonical + assessment-only "A0 (Pre)") ──
  // LevelData fixture cross-checks score band / cefr status for the 22 canonical.
  const bandByCode = new Map(levelData.map((l) => [l.code, l]));
  for (const lvl of ALL_LEVELS) {
    const src = bandByCode.get(lvl.code);
    if (src) {
      assert(
        src.scoreBand === lvl.scoreBand && src.cefrStatus === lvl.cefrStatus,
        `level ${lvl.code} band/status mismatch vs LevelData sheet`
      );
    }
    await prisma.vitalLevel.upsert({
      where: { code: lvl.code },
      update: {
        label: lvl.label,
        order: lvl.order,
        scoreBand: lvl.scoreBand,
        cefrStatus: lvl.cefrStatus,
        bandGroup: lvl.bandGroup,
        isPreEmergent: lvl.isPreEmergent,
        assessmentOnly: lvl.assessmentOnly,
      },
      create: {
        code: lvl.code,
        label: lvl.label,
        order: lvl.order,
        scoreBand: lvl.scoreBand,
        cefrStatus: lvl.cefrStatus,
        bandGroup: lvl.bandGroup,
        isPreEmergent: lvl.isPreEmergent,
        assessmentOnly: lvl.assessmentOnly,
      },
    });
  }
  const levelIdByCode = new Map(
    (await prisma.vitalLevel.findMany()).map((l) => [l.code, l.id])
  );

  // ── Tools (+ nested pillar ratings, skill coverage, level mappings) ──
  for (const t of tools) {
    const tool = await prisma.vitalTool.upsert({
      where: { name: t.name },
      update: {
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
      },
      create: {
        name: t.name,
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
      },
    });
    // Replace children so re-seeding stays clean.
    await prisma.vitalToolPillarRating.deleteMany({ where: { toolId: tool.id } });
    await prisma.vitalToolSkillCoverage.deleteMany({ where: { toolId: tool.id } });
    await prisma.vitalToolLevelMapping.deleteMany({ where: { toolId: tool.id } });

    if (t.pillarRatings.length) {
      await prisma.vitalToolPillarRating.createMany({
        data: t.pillarRatings.map((p) => ({
          toolId: tool.id,
          pillar: p.pillar,
          rating: p.rating,
        })),
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
          .map((m) => ({
            toolId: tool.id,
            levelId: levelIdByCode.get(m.levelCode)!,
            coverage: m.coverage,
          })),
      });
    }
  }
  const toolIdByName = new Map(
    (await prisma.vitalTool.findMany()).map((t) => [t.name, t.id])
  );

  // ── Recommendations (132 = 6 skills × 22 levels) ──
  for (const r of recommendations) {
    const skillId = skillIdByName.get(r.skill);
    const levelId = levelIdByCode.get(r.levelCode);
    assert(!!skillId, `recommendation references unknown skill "${r.skill}"`);
    assert(!!levelId, `recommendation references unknown level "${r.levelCode}"`);
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
    await prisma.vitalRecommendation.upsert({
      where: { skillId_levelId: { skillId: skillId!, levelId: levelId! } },
      update: data,
      create: { skillId: skillId!, levelId: levelId!, ...data },
    });
  }

  // ── Reconcile derivation (preserve & lock mismatches) ──
  // The authored picks are the source of truth. Where the derivation engine
  // would pick a different tool, lock that slot so the authored choice is
  // preserved; everywhere else leave it auto. Downstream fields always cascade
  // from the effective pairing so they stay consistent with the tool data.
  const derivePool: ToolForDerive[] = (
    await prisma.vitalTool.findMany({
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
    })
  ).map((t) => ({ ...t }));

  for (const rec of await prisma.vitalRecommendation.findMany()) {
    const auto = deriveRecommendation({
      skillId: rec.skillId,
      levelId: rec.levelId,
      tools: derivePool,
    });
    const coreToolLocked = auto.coreToolId !== rec.coreToolId;
    const suppToolLocked = auto.suppToolId !== rec.suppToolId;
    const derived = deriveRecommendation({
      skillId: rec.skillId,
      levelId: rec.levelId,
      tools: derivePool,
      coreToolLocked,
      suppToolLocked,
      coreToolId: rec.coreToolId,
      suppToolId: rec.suppToolId,
    });
    await prisma.vitalRecommendation.update({
      where: { id: rec.id },
      data: { coreToolLocked, suppToolLocked, ...derived },
    });
  }

  // ── Count assertions ──
  const [skillCount, levelCount, toolCount, asmCount, recCount] = await Promise.all([
    prisma.vitalSkill.count(),
    prisma.vitalLevel.count(),
    prisma.vitalTool.count({ where: { isAssessmentTool: false } }),
    prisma.vitalTool.count({ where: { isAssessmentTool: true } }),
    prisma.vitalRecommendation.count(),
  ]);
  assert(skillCount === 6, `expected 6 skills, got ${skillCount}`);
  assert(levelCount === 23, `expected 23 levels (22 + A0 (Pre)), got ${levelCount}`);
  assert(toolCount === 28, `expected 28 teaching tools, got ${toolCount}`);
  assert(asmCount === 11, `expected 11 assessment tools, got ${asmCount}`);
  assert(recCount === 132, `expected 132 recommendations, got ${recCount}`);

  console.log(
    `VITAL seed complete: ${skillCount} skills, ${levelCount} levels, ${toolCount}+${asmCount} tools, ${recCount} recommendations.`
  );
}
