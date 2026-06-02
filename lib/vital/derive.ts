// Recommendation derivation (no DB). Given the tool catalogue, pick the best
// core + supplementary tool for a skill × level and cascade every downstream
// field (pillar coverage, status, risk, dependency) from that pairing.
//
// Editorial choices that are NOT derived: the deployment note (free text), and
// a locked tool slot (the admin pinned a specific tool, derivation keeps it
// but still cascades the downstream fields from it).
//
// Ranking policy (chosen with the user): Coverage → score → risk.
//   1. skill-coverage strength  (FULL beats PARTIAL)
//   2. highest VITAL/10
//   3. lowest de-facto risk     (LOW < MEDIUM < HIGH)
//   4. name (deterministic tiebreak)

import type {
  VitalCoverage,
  VitalComplianceStatus,
  VitalPillar,
  VitalRating,
  VitalRisk,
  VitalToolDependency,
  VitalToolRole,
} from "@prisma/client";
import { PILLARS } from "./constants";
import { combinePillarCoverage, recommendationStatus } from "./compute";

export interface ToolForDerive {
  id: string;
  name: string;
  role: VitalToolRole;
  vitalScore10: number | null;
  deFactoRisk: VitalRisk | null;
  overallDependency: VitalToolDependency | null;
  pillarRatings: { pillar: VitalPillar; rating: VitalRating }[];
  skillCoverage: { skillId: string; coverage: VitalCoverage }[];
  levelMappings: { levelId: string; coverage: VitalCoverage }[];
}

export interface DerivedRecommendation {
  coreToolId: string | null;
  suppToolId: string | null;
  coreDependency: VitalToolDependency | null;
  suppDependency: VitalToolDependency | null;
  coreRisk: VitalRisk | null;
  suppRisk: VitalRisk | null;
  pillarV: VitalCoverage;
  pillarI: VitalCoverage;
  pillarT: VitalCoverage;
  pillarA: VitalCoverage;
  pillarL: VitalCoverage;
  status: VitalComplianceStatus;
}

const COVERAGE_RANK: Record<VitalCoverage, number> = {
  FULL: 2,
  PARTIAL: 1,
  NONE: 0,
  NA: 0,
};
const RISK_RANK: Record<VitalRisk, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

function skillCov(tool: ToolForDerive, skillId: string): VitalCoverage | null {
  return tool.skillCoverage.find((c) => c.skillId === skillId)?.coverage ?? null;
}
function levelCov(tool: ToolForDerive, levelId: string): VitalCoverage | null {
  return tool.levelMappings.find((m) => m.levelId === levelId)?.coverage ?? null;
}

// A tool is eligible for a skill × level when it covers BOTH the skill and the
// level at least partially (NONE / NA / missing → not eligible).
function isEligible(tool: ToolForDerive, skillId: string, levelId: string): boolean {
  const sc = skillCov(tool, skillId);
  const lc = levelCov(tool, levelId);
  const ok = (c: VitalCoverage | null) => c === "FULL" || c === "PARTIAL";
  return ok(sc) && ok(lc);
}

// Lower comparator result = better. Coverage → score → risk → name.
function compareCandidates(a: ToolForDerive, b: ToolForDerive, skillId: string): number {
  const covA = COVERAGE_RANK[skillCov(a, skillId) ?? "NONE"];
  const covB = COVERAGE_RANK[skillCov(b, skillId) ?? "NONE"];
  if (covA !== covB) return covB - covA; // higher coverage first

  const scoreA = a.vitalScore10 ?? -1;
  const scoreB = b.vitalScore10 ?? -1;
  if (scoreA !== scoreB) return scoreB - scoreA; // higher score first

  // null risk treated as neutral (MEDIUM) so it neither wins nor loses outright.
  const riskA = a.deFactoRisk ? RISK_RANK[a.deFactoRisk] : 2;
  const riskB = b.deFactoRisk ? RISK_RANK[b.deFactoRisk] : 2;
  if (riskA !== riskB) return riskA - riskB; // lower risk first

  return a.name.localeCompare(b.name);
}

function bestOf(
  tools: ToolForDerive[],
  role: VitalToolRole,
  skillId: string,
  levelId: string,
  excludeId?: string | null
): ToolForDerive | null {
  const pool = tools
    .filter((t) => t.role === role && t.id !== excludeId && isEligible(t, skillId, levelId))
    .sort((a, b) => compareCandidates(a, b, skillId));
  return pool[0] ?? null;
}

function ratingOf(tool: ToolForDerive | null, pillar: VitalPillar): VitalRating | null {
  if (!tool) return null;
  return tool.pillarRatings.find((r) => r.pillar === pillar)?.rating ?? null;
}

export interface DeriveInput {
  skillId: string;
  levelId: string;
  tools: ToolForDerive[];
  // Locked slots keep their pinned tool id; unlocked slots are auto-picked.
  coreToolLocked?: boolean;
  suppToolLocked?: boolean;
  coreToolId?: string | null;
  suppToolId?: string | null;
}

export function deriveRecommendation(input: DeriveInput): DerivedRecommendation {
  const { skillId, levelId, tools } = input;
  const byId = new Map(tools.map((t) => [t.id, t]));

  const core = input.coreToolLocked
    ? input.coreToolId
      ? byId.get(input.coreToolId) ?? null
      : null
    : bestOf(tools, "CORE", skillId, levelId);

  const supp = input.suppToolLocked
    ? input.suppToolId
      ? byId.get(input.suppToolId) ?? null
      : null
    : bestOf(tools, "SUPPLEMENTARY", skillId, levelId, core?.id);

  const pillars = PILLARS.map((p) =>
    combinePillarCoverage(ratingOf(core, p), ratingOf(supp, p))
  ) as [VitalCoverage, VitalCoverage, VitalCoverage, VitalCoverage, VitalCoverage];

  return {
    coreToolId: core?.id ?? null,
    suppToolId: supp?.id ?? null,
    coreDependency: core?.overallDependency ?? null,
    suppDependency: supp?.overallDependency ?? null,
    coreRisk: core?.deFactoRisk ?? null,
    suppRisk: supp?.deFactoRisk ?? null,
    pillarV: pillars[0],
    pillarI: pillars[1],
    pillarT: pillars[2],
    pillarA: pillars[3],
    pillarL: pillars[4],
    status: recommendationStatus(pillars),
  };
}
