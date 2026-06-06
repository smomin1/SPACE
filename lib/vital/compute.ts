// Pure VITAL derivations (no DB). Mirrors the style of lib/scoring.ts.

import type {
  VitalAnswer,
  VitalCoverage,
  VitalComplianceStatus,
  VitalPillar,
  VitalRating,
  VitalVerdict,
} from "@prisma/client";

// ─── Question-driven scoring (VITAL Model 2.0) ──────────────────────────────────
// Each pillar has 5 questions. Points: YES=2, PARTIAL=1, NO=0; NA is excluded
// from both the score and the max (denominator), so it never penalises a tool.

export const ANSWER_POINTS: Record<Exclude<VitalAnswer, "NA">, number> = {
  YES: 2,
  PARTIAL: 1,
  NO: 0,
};

export const VITAL_PILLARS: VitalPillar[] = ["V", "I", "T", "A", "L"];

export interface PillarScore {
  score: number; // sum of points (0..10)
  max: number; // 2 × non-NA question count (0..10)
}

// One pillar's /10 score and its non-NA max from that pillar's answers.
export function pillarScore(answers: VitalAnswer[]): PillarScore {
  let score = 0;
  let max = 0;
  for (const a of answers) {
    if (a === "NA") continue;
    max += 2;
    score += ANSWER_POINTS[a];
  }
  return { score, max };
}

// Default pillar letter from the pillar's /10 score: ≥7 → Y, ≥5 → P, else N.
// (Best deterministic fit to the workbook's hand-assigned letters; ~80% match.
// Evaluators may override per VitalToolPillarRating.isOverride.)
export function derivePillarLetter(score: number): VitalRating {
  if (score >= 7) return "Y";
  if (score >= 5) return "P";
  return "N";
}

export interface VitalTotals {
  total: number; // sum of pillar scores (0..50)
  max: number; // sum of pillar maxes (≤50)
  percent: number; // round(total / max × 100), 0 when max is 0
  verdict: VitalVerdict;
}

// Total /50, %-score (N/A-excluded) and verdict from the five pillar scores.
export function vitalTotals(pillars: PillarScore[]): VitalTotals {
  const total = pillars.reduce((s, p) => s + p.score, 0);
  const max = pillars.reduce((s, p) => s + p.max, 0);
  const percent = max === 0 ? 0 : Math.round((total / max) * 100);
  return { total, max, percent, verdict: verdictFromTotal50(total) };
}

// Verdict from the raw total /50 (matches the V2 sheet's Verdict row):
// ≥35 STRONG · 25–34 GOOD · 15–24 PARTIAL · <15 POOR.
export function verdictFromTotal50(total: number): VitalVerdict {
  if (total >= 35) return "STRONG_FIT";
  if (total >= 25) return "GOOD_FIT";
  if (total >= 15) return "PARTIAL_FIT";
  return "POOR_FIT";
}

// Group a flat list of (pillar, answer) into the five PillarScores in V/I/T/A/L
// order, then derive everything. The single entry point for the API + seed.
export function deriveFromResponses(
  responses: { pillar: VitalPillar; answer: VitalAnswer }[],
): {
  pillarScores: Record<VitalPillar, PillarScore>;
  pillarLetters: Record<VitalPillar, VitalRating>;
  totals: VitalTotals;
} {
  const byPillar = {} as Record<VitalPillar, VitalAnswer[]>;
  for (const p of VITAL_PILLARS) byPillar[p] = [];
  for (const r of responses) byPillar[r.pillar]?.push(r.answer);

  const pillarScores = {} as Record<VitalPillar, PillarScore>;
  const pillarLetters = {} as Record<VitalPillar, VitalRating>;
  for (const p of VITAL_PILLARS) {
    pillarScores[p] = pillarScore(byPillar[p]);
    pillarLetters[p] = derivePillarLetter(pillarScores[p].score);
  }
  const totals = vitalTotals(VITAL_PILLARS.map((p) => pillarScores[p]));
  return { pillarScores, pillarLetters, totals };
}

// Combine a core tool's pillar rating with a supplementary tool's rating into
// the stack's combined coverage. The stack covers a pillar as well as its best
// contributor: any Y → FULL, else any P → PARTIAL, else NONE.
export function combinePillarCoverage(
  core: VitalRating | null,
  supp: VitalRating | null
): VitalCoverage {
  const ratings = [core, supp].filter((r): r is VitalRating => r != null);
  if (ratings.includes("Y")) return "FULL";
  if (ratings.includes("P")) return "PARTIAL";
  return "NONE";
}

// A pillar is a "gap" when the combined stack does not cover it at all (NONE).
// ✅ COMPLIANT = no gaps, ⚠ ONE_GAP = exactly one, ⛔ MULTI_GAP = two or more.
export function recommendationStatus(
  pillars: VitalCoverage[]
): VitalComplianceStatus {
  const gaps = pillars.filter((p) => p === "NONE").length;
  if (gaps === 0) return "COMPLIANT";
  if (gaps === 1) return "ONE_GAP";
  return "MULTI_GAP";
}

// VITAL /10 from the five pillar ratings (Y=2, P=1, N=0 → 0..10).
export function vitalScore10FromPillars(
  pillars: (VitalRating | null)[]
): number {
  return pillars.reduce<number>((sum, r) => {
    if (r === "Y") return sum + 2;
    if (r === "P") return sum + 1;
    return sum;
  }, 0);
}

// Verdict band from a VITAL /10 score, matching the sheet's thresholds.
export function verdictFromScore10(score10: number): VitalVerdict {
  if (score10 >= 8) return "STRONG_FIT";
  if (score10 >= 6) return "GOOD_FIT";
  if (score10 >= 4) return "PARTIAL_FIT";
  return "POOR_FIT";
}

export const COVERAGE_SYMBOL: Record<VitalCoverage, string> = {
  FULL: "✓",
  PARTIAL: "~",
  NONE: "gap",
  NA: "-",
};

export const STATUS_SYMBOL: Record<VitalComplianceStatus, string> = {
  COMPLIANT: "✅",
  ONE_GAP: "⚠",
  MULTI_GAP: "⛔",
};
