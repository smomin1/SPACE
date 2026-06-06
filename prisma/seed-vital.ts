// Seeds the VITAL module from the committed JSON fixtures (prisma/vital-data/*).
// Idempotent via upsert on natural keys. Asserts exact counts and fails loudly.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PrismaClient, VitalAnswer, VitalPillar } from "@prisma/client";
import type { ParsedTool, ParsedRecommendation, ParsedLevel } from "../lib/vital/parse";
import { SKILLS, ALL_LEVELS, STAGES } from "../lib/vital/constants";
import { deriveRecommendation, type ToolForDerive } from "../lib/vital/derive";
import { deriveFromResponses, vitalScore10FromPillars } from "../lib/vital/compute";

// ── Fixture shapes for the VITAL Model 2.0 data ──
interface QuestionsFile {
  questions: { key: string; pillar: VitalPillar; order: number; text: string }[];
  answers: Record<string, Record<string, VitalAnswer>>; // toolName → { questionKey → answer }
}
interface StagesFile {
  stages: { key: string; order: number; pillars: string[] }[];
  levels: string[];
  stageRecommendations: {
    stage: string;
    level: string;
    core: string | null;
    supp: string | null;
    note: string | null;
  }[];
}
type GradeBandsFile = { band: string; learnerLevel: string; cefrRange: string; order: number }[];

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
  const questionsFile = load<QuestionsFile>("questions.json");
  const stagesFile = load<StagesFile>("stages.json");
  const gradeBands = load<GradeBandsFile>("grade-bands.json");

  // ── VITAL questions (25) ──
  for (const q of questionsFile.questions) {
    await prisma.vitalQuestion.upsert({
      where: { key: q.key },
      update: { pillar: q.pillar, order: q.order, text: q.text },
      create: { key: q.key, pillar: q.pillar, order: q.order, text: q.text },
    });
  }
  // questionKey → { id, pillar } and the pillar of each key (for derivation).
  const questionByKey = new Map(
    (await prisma.vitalQuestion.findMany()).map((q) => [q.key, q]),
  );
  const pillarByKey = new Map(questionsFile.questions.map((q) => [q.key, q.pillar]));

  // Per-tool derived scores from the 25 answers (only the 16 V2-rated tools).
  // Returns the derived scalar scores + pillar letters, or null if no answers.
  function deriveToolFromAnswers(toolName: string) {
    const ans = questionsFile.answers[toolName];
    if (!ans) return null;
    const responses = Object.entries(ans)
      .filter(([key]) => pillarByKey.has(key))
      .map(([key, answer]) => ({ pillar: pillarByKey.get(key)!, answer }));
    const { pillarLetters, totals } = deriveFromResponses(responses);
    const letters = (["V", "I", "T", "A", "L"] as VitalPillar[]).map((p) => pillarLetters[p]);
    return {
      vitalScore10: vitalScore10FromPillars(letters),
      v2Score50: totals.total,
      v2Percent: totals.percent,
      verdict: totals.verdict,
      pillarLetters,
      answers: ans,
    };
  }

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

  // Remove the legacy duplicate "ELSA Speak" (kept as "Elsaspeak", the V2-rated
  // tool). Children cascade; it is not referenced by any recommendation.
  await prisma.vitalTool.deleteMany({ where: { name: "ELSA Speak" } });

  // ── Tools (+ nested pillar ratings, skill coverage, level mappings) ──
  for (const t of tools) {
    // V2-rated tools derive their scores + pillar letters from the 25 answers;
    // others keep the values imported in tools.json.
    const derived = deriveToolFromAnswers(t.name);
    const scores = {
      vitalScore10: derived ? derived.vitalScore10 : t.vitalScore10,
      v2Score50: derived ? derived.v2Score50 : t.v2Score50,
      v2Percent: derived ? derived.v2Percent : null,
      verdict: derived ? derived.verdict : t.verdict,
    };
    const tool = await prisma.vitalTool.upsert({
      where: { name: t.name },
      update: {
        role: t.role,
        ...scores,
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
        ...scores,
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
    await prisma.vitalQuestionResponse.deleteMany({ where: { toolId: tool.id } });

    if (derived) {
      // Seed the 25 responses + derived pillar letters (no overrides at seed time).
      await prisma.vitalQuestionResponse.createMany({
        data: Object.entries(derived.answers)
          .filter(([key]) => questionByKey.has(key))
          .map(([key, answer]) => ({
            toolId: tool.id,
            questionId: questionByKey.get(key)!.id,
            answer,
          })),
      });
      await prisma.vitalToolPillarRating.createMany({
        data: (["V", "I", "T", "A", "L"] as VitalPillar[]).map((p) => ({
          toolId: tool.id,
          pillar: p,
          rating: derived.pillarLetters[p],
        })),
      });
    } else if (t.pillarRatings.length) {
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

  // ── Stages (9) ──
  for (const s of STAGES) {
    await prisma.vitalStage.upsert({
      where: { key: s.key },
      update: { order: s.order, pillars: s.pillars },
      create: { key: s.key, order: s.order, pillars: s.pillars },
    });
  }
  const stageIdByKey = new Map(
    (await prisma.vitalStage.findMany()).map((s) => [s.key, s.id]),
  );

  // ── Stage recommendations (9 stages × 22 levels = 198 authored cells) ──
  for (const r of stagesFile.stageRecommendations) {
    const stageId = stageIdByKey.get(r.stage);
    const levelId = levelIdByCode.get(r.level);
    assert(!!stageId, `stage-rec references unknown stage "${r.stage}"`);
    assert(!!levelId, `stage-rec references unknown level "${r.level}"`);
    const data = { coreText: r.core, suppText: r.supp, vitalNote: r.note };
    await prisma.vitalStageRecommendation.upsert({
      where: { stageId_levelId: { stageId: stageId!, levelId: levelId! } },
      update: data,
      create: { stageId: stageId!, levelId: levelId!, ...data },
    });
  }

  // ── Grade bands (read-only reference) ──
  for (const b of gradeBands) {
    await prisma.vitalGradeBand.upsert({
      where: { band_learnerLevel: { band: b.band, learnerLevel: b.learnerLevel } },
      update: { cefrRange: b.cefrRange, order: b.order },
      create: { band: b.band, learnerLevel: b.learnerLevel, cefrRange: b.cefrRange, order: b.order },
    });
  }

  // ── Count assertions ──
  const [skillCount, levelCount, toolCount, asmCount, recCount, qCount, stageCount, stageRecCount, gbCount] =
    await Promise.all([
      prisma.vitalSkill.count(),
      prisma.vitalLevel.count(),
      prisma.vitalTool.count({ where: { isAssessmentTool: false } }),
      prisma.vitalTool.count({ where: { isAssessmentTool: true } }),
      prisma.vitalRecommendation.count(),
      prisma.vitalQuestion.count(),
      prisma.vitalStage.count(),
      prisma.vitalStageRecommendation.count(),
      prisma.vitalGradeBand.count(),
    ]);
  assert(skillCount === 6, `expected 6 skills, got ${skillCount}`);
  assert(levelCount === 23, `expected 23 levels (22 + A0 (Pre)), got ${levelCount}`);
  assert(toolCount === 27, `expected 27 teaching tools, got ${toolCount}`);
  assert(asmCount === 11, `expected 11 assessment tools, got ${asmCount}`);
  assert(recCount === 132, `expected 132 recommendations, got ${recCount}`);
  assert(qCount === 25, `expected 25 questions, got ${qCount}`);
  assert(stageCount === 9, `expected 9 stages, got ${stageCount}`);
  assert(stageRecCount === 198, `expected 198 stage recommendations, got ${stageRecCount}`);
  assert(gbCount === 10, `expected 10 grade bands, got ${gbCount}`);

  console.log(
    `VITAL seed complete: ${skillCount} skills, ${levelCount} levels, ${toolCount}+${asmCount} tools, ` +
      `${recCount} recommendations, ${qCount} questions, ${stageCount} stages, ${stageRecCount} stage-recs, ${gbCount} grade bands.`
  );
}
