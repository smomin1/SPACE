// Classifies parsed records against current DB rows for the two-step xlsx import:
// new rows are auto-imported, changed rows are flagged for admin review, unchanged
// rows are skipped. Never writes; produces a preview only.

import type { ParsedTool, ParsedRecommendation, ParsedLevel } from "./parse";

export type DiffEntity = "tool" | "recommendation" | "level";

export interface FieldChange {
  field: string;
  before: string | null;
  after: string | null;
}
export interface ChangedRow<T> {
  key: string;
  record: T;
  changes: FieldChange[];
}
export interface EntityDiff<T> {
  entity: DiffEntity;
  newRows: T[];
  changedRows: ChangedRow<T>[];
  unchangedCount: number;
}

export type Flat = Record<string, string | null>;

function diffFlat<T>(
  entity: DiffEntity,
  parsed: { key: string; record: T; flat: Flat }[],
  existing: Map<string, Flat>
): EntityDiff<T> {
  const newRows: T[] = [];
  const changedRows: ChangedRow<T>[] = [];
  let unchangedCount = 0;
  for (const p of parsed) {
    const cur = existing.get(p.key.toLowerCase());
    if (!cur) {
      newRows.push(p.record);
      continue;
    }
    const changes: FieldChange[] = [];
    for (const field of Object.keys(p.flat)) {
      const after = p.flat[field] ?? null;
      const before = cur[field] ?? null;
      if (after !== before) changes.push({ field, before, after });
    }
    if (changes.length) changedRows.push({ key: p.key, record: p.record, changes });
    else unchangedCount++;
  }
  return { entity, newRows, changedRows, unchangedCount };
}

// ─── Flatteners ───────────────────────────────────────────────────────────────
export function flattenTool(t: {
  role: string;
  vitalScore10: number | null;
  v2Score50: number | null;
  verdict: string | null;
  deFactoRisk: string | null;
  overallDependency: string | null;
  belowA0: boolean;
  cefrRangeLabel: string | null;
  isAssessmentTool: boolean;
  adaptiveTesting: string | null;
  pillarRatings: { pillar: string; rating: string }[];
  skillCoverage: { skill: string; coverage: string; dependency: string | null }[];
  levelMappings: { levelCode?: string; level?: { code: string }; coverage: string }[];
}): Flat {
  const flat: Flat = {
    role: t.role,
    vitalScore10: t.vitalScore10 == null ? null : String(t.vitalScore10),
    v2Score50: t.v2Score50 == null ? null : String(t.v2Score50),
    verdict: t.verdict,
    deFactoRisk: t.deFactoRisk,
    overallDependency: t.overallDependency,
    belowA0: String(t.belowA0),
    cefrRangeLabel: t.cefrRangeLabel,
    isAssessmentTool: String(t.isAssessmentTool),
    adaptiveTesting: t.adaptiveTesting,
  };
  for (const p of t.pillarRatings) flat[`pillar.${p.pillar}`] = p.rating;
  for (const s of t.skillCoverage) {
    flat[`skill.${s.skill}.coverage`] = s.coverage;
    flat[`skill.${s.skill}.dependency`] = s.dependency;
  }
  for (const m of t.levelMappings) {
    const code = m.levelCode ?? m.level?.code;
    if (code) flat[`level.${code}`] = m.coverage;
  }
  return flat;
}

export function flattenRecommendation(r: {
  coreTool?: string | null;
  suppTool?: string | null;
  coreToolName?: string | null;
  suppToolName?: string | null;
  coreDependency: string | null;
  suppDependency: string | null;
  coreRisk: string | null;
  suppRisk: string | null;
  pillarV: string; pillarI: string; pillarT: string; pillarA: string; pillarL: string;
  status: string;
  deploymentNote: string | null;
}): Flat {
  return {
    coreTool: r.coreTool ?? r.coreToolName ?? null,
    suppTool: r.suppTool ?? r.suppToolName ?? null,
    coreDependency: r.coreDependency,
    suppDependency: r.suppDependency,
    coreRisk: r.coreRisk,
    suppRisk: r.suppRisk,
    pillarV: r.pillarV, pillarI: r.pillarI, pillarT: r.pillarT,
    pillarA: r.pillarA, pillarL: r.pillarL,
    status: r.status,
    deploymentNote: r.deploymentNote,
  };
}

export function flattenLevel(l: { scoreBand: string; cefrStatus: string }): Flat {
  return { scoreBand: l.scoreBand, cefrStatus: l.cefrStatus };
}

// ─── Entity diffs ───────────────────────────────────────────────────────────────
export function diffTools(
  parsed: ParsedTool[],
  existing: Map<string, Flat>
): EntityDiff<ParsedTool> {
  return diffFlat(
    "tool",
    parsed.map((t) => ({ key: t.name, record: t, flat: flattenTool(t) })),
    existing
  );
}

export function diffRecommendations(
  parsed: ParsedRecommendation[],
  existing: Map<string, Flat>
): EntityDiff<ParsedRecommendation> {
  return diffFlat(
    "recommendation",
    parsed.map((r) => ({
      key: `${r.skill}|${r.levelCode}`,
      record: r,
      flat: flattenRecommendation(r),
    })),
    existing
  );
}

export function diffLevels(
  parsed: ParsedLevel[],
  existing: Map<string, Flat>
): EntityDiff<ParsedLevel> {
  return diffFlat(
    "level",
    parsed.map((l) => ({ key: l.code, record: l, flat: flattenLevel(l) })),
    existing
  );
}
