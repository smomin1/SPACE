// Pure VITAL derivations (no DB). Mirrors the style of lib/scoring.ts.

import type {
  VitalCoverage,
  VitalComplianceStatus,
  VitalRating,
  VitalVerdict,
} from "@prisma/client";

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
