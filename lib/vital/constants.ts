// Canonical VITAL reference data + normalisers.
// Used by both the seed generator and the live xlsx upload, so parsing stays
// consistent. The level codes use the U+2212 minus sign (−), NOT a hyphen.

import type {
  VitalAnswer,
  VitalCoverage,
  VitalDependency,
  VitalToolDependency,
  VitalRisk,
  VitalVerdict,
  VitalToolRole,
  VitalRating,
} from "@prisma/client";

// ─── Pillars ────────────────────────────────────────────────────────────────
export const PILLARS = ["V", "I", "T", "A", "L"] as const;
export type PillarKey = (typeof PILLARS)[number];

export const PILLAR_LABELS: Record<PillarKey, string> = {
  V: "Visible Learning",
  I: "Inclusive Pedagogy",
  T: "Technology & Tools",
  A: "Assessment & Data Use",
  L: "Learner Agency",
};

// ─── Stages (CEFR × Stage × Tools matrix rows) ──────────────────────────────────
// `pillars` = the stage's primary VITAL pillar(s). Order matches the workbook.
export const STAGES: { key: string; order: number; pillars: PillarKey[] }[] = [
  { key: "Entry & Warm-Up", order: 1, pillars: ["V"] },
  { key: "Core - Vocabulary", order: 2, pillars: ["T", "I"] },
  { key: "Core - Listening", order: 3, pillars: ["T", "I"] },
  { key: "Core - Speaking", order: 4, pillars: ["T", "L"] },
  { key: "Core - Reading", order: 5, pillars: ["T", "I"] },
  { key: "Core - Writing", order: 6, pillars: ["T", "L"] },
  { key: "Core - Grammar", order: 7, pillars: ["T", "A"] },
  { key: "Check for Understanding", order: 8, pillars: ["A"] },
  { key: "Exit & Reflection", order: 9, pillars: ["L"] },
];

// ─── Skills ───────────────────────────────────────────────────────────────────
// Canonical full names + the abbreviations used in the Tool Landscape headers.
export const SKILLS: { name: string; order: number; aliases: string[] }[] = [
  { name: "Vocabulary", order: 1, aliases: ["Vocab", "Vocabulary"] },
  { name: "Listening", order: 2, aliases: ["Listen", "Listening"] },
  { name: "Speaking", order: 3, aliases: ["Speak", "Speaking"] },
  { name: "Reading", order: 4, aliases: ["Read", "Reading"] },
  { name: "Writing", order: 5, aliases: ["Write", "Writing"] },
  { name: "Grammar", order: 6, aliases: ["Grammar"] },
];

const SKILL_BY_ALIAS = new Map<string, string>();
for (const s of SKILLS) {
  for (const a of s.aliases) SKILL_BY_ALIAS.set(a.toLowerCase(), s.name);
}
export function canonicalSkill(raw: string): string | null {
  return SKILL_BY_ALIAS.get(raw.trim().toLowerCase()) ?? null;
}

// ─── Levels (22 canonical + 1 assessment-only) ──────────────────────────────────
export interface CanonicalLevel {
  code: string;
  label: string;
  order: number;
  scoreBand: string;
  cefrStatus: string;
  bandGroup: string;
  isPreEmergent: boolean;
  assessmentOnly: boolean;
}

const STANDARD = "Standard CEFR";
const NONCEFR = "Non-CEFR (school-defined)";

// The 22 canonical sub-levels exactly as the LevelData sheet (U+2212 minus).
export const CANONICAL_LEVELS: CanonicalLevel[] = [
  { code: "A0", scoreBand: "Pre-emergent", cefrStatus: NONCEFR, bandGroup: "A0", isPreEmergent: true },
  { code: "A1−", scoreBand: "Up to 33%", cefrStatus: STANDARD, bandGroup: "A" },
  { code: "A1", scoreBand: "34%–66%", cefrStatus: STANDARD, bandGroup: "A" },
  { code: "A1+", scoreBand: "67%–100%", cefrStatus: STANDARD, bandGroup: "A" },
  { code: "A2−", scoreBand: "Up to 33%", cefrStatus: STANDARD, bandGroup: "A" },
  { code: "A2", scoreBand: "34%–66%", cefrStatus: STANDARD, bandGroup: "A" },
  { code: "A2+", scoreBand: "67%–100%", cefrStatus: STANDARD, bandGroup: "A" },
  { code: "B1−", scoreBand: "Up to 33%", cefrStatus: STANDARD, bandGroup: "B1" },
  { code: "B1", scoreBand: "34%–66%", cefrStatus: STANDARD, bandGroup: "B1" },
  { code: "B1+", scoreBand: "67%–100%", cefrStatus: STANDARD, bandGroup: "B1" },
  { code: "B1.5−", scoreBand: "Up to 33%", cefrStatus: NONCEFR, bandGroup: "B1.5" },
  { code: "B1.5", scoreBand: "34%–66%", cefrStatus: NONCEFR, bandGroup: "B1.5" },
  { code: "B1.5+", scoreBand: "67%–100%", cefrStatus: NONCEFR, bandGroup: "B1.5" },
  { code: "B2−", scoreBand: "Up to 33%", cefrStatus: STANDARD, bandGroup: "B2" },
  { code: "B2", scoreBand: "34%–66%", cefrStatus: STANDARD, bandGroup: "B2" },
  { code: "B2+", scoreBand: "67%–100%", cefrStatus: STANDARD, bandGroup: "B2" },
  { code: "B2.5−", scoreBand: "Up to 33%", cefrStatus: NONCEFR, bandGroup: "B2.5" },
  { code: "B2.5", scoreBand: "34%–66%", cefrStatus: NONCEFR, bandGroup: "B2.5" },
  { code: "B2.5+", scoreBand: "67%–100%", cefrStatus: NONCEFR, bandGroup: "B2.5" },
  { code: "C1−", scoreBand: "Up to 33%", cefrStatus: STANDARD, bandGroup: "C1" },
  { code: "C1", scoreBand: "34%–66%", cefrStatus: STANDARD, bandGroup: "C1" },
  { code: "C1+", scoreBand: "67%–100%", cefrStatus: STANDARD, bandGroup: "C1" },
].map((l, i) => ({
  ...l,
  label: l.code,
  order: i + 1,
  isPreEmergent: l.isPreEmergent ?? false,
  assessmentOnly: false,
}));

// The 23rd column the Assessment Landscape splits out before A0.
export const ASSESSMENT_ONLY_LEVEL: CanonicalLevel = {
  code: "A0 (Pre)",
  label: "A0 (Pre)",
  order: 0,
  scoreBand: "Pre-emergent",
  cefrStatus: NONCEFR,
  bandGroup: "A0",
  isPreEmergent: true,
  assessmentOnly: true,
};

export const ALL_LEVELS: CanonicalLevel[] = [ASSESSMENT_ONLY_LEVEL, ...CANONICAL_LEVELS];

// Header order used by the CEFR mapping matrix (22 canonical, no "A0 (Pre)").
export const CEFR_MAP_LEVEL_CODES = CANONICAL_LEVELS.map((l) => l.code);
// Header order used by the Assessment Landscape (23, including "A0 (Pre)").
export const ASSESSMENT_LEVEL_CODES = [ASSESSMENT_ONLY_LEVEL.code, ...CEFR_MAP_LEVEL_CODES];

// ─── Normalisers ─────────────────────────────────────────────────────────────
export function normCoverage(raw: unknown): VitalCoverage | null {
  if (raw == null) return null;
  const v = String(raw).trim().toLowerCase();
  if (v === "" || v === "-" || v === "n" || v === "no" || v === "none") return "NONE";
  if (v === "y" || v === "yes" || v === "✓" || v === "full") return "FULL";
  if (v === "p" || v === "partial") return "PARTIAL";
  if (v === "n/a" || v === "na") return "NA";
  return null;
}

export function normDependency(raw: unknown): VitalDependency | null {
  if (raw == null) return null;
  const v = String(raw).trim().toLowerCase();
  if (v === "tl") return "TEACHER_LED";
  if (v === "p") return "PARTIAL";
  if (v === "s") return "STUDENT";
  if (v === "n/a" || v === "na") return "NOT_APPLICABLE";
  return null;
}

export function normToolDependency(raw: unknown): VitalToolDependency | null {
  if (raw == null) return null;
  const v = String(raw).trim().toLowerCase();
  if (v === "fully teacher-led") return "FULLY_TEACHER_LED";
  if (v === "mostly teacher-led") return "MOSTLY_TEACHER_LED";
  if (v === "blended") return "BLENDED";
  if (v === "mostly independent") return "MOSTLY_INDEPENDENT";
  if (v === "fully independent") return "FULLY_INDEPENDENT";
  return null;
}

export function normRisk(raw: unknown): VitalRisk | null {
  if (raw == null) return null;
  const v = String(raw).trim().toLowerCase();
  if (v === "low") return "LOW";
  if (v === "medium") return "MEDIUM";
  if (v === "high") return "HIGH";
  return null;
}

export function normVerdict(raw: unknown): VitalVerdict | null {
  if (raw == null) return null;
  const v = String(raw).trim().toLowerCase();
  if (v === "poor fit") return "POOR_FIT";
  if (v === "partial fit") return "PARTIAL_FIT";
  if (v === "good fit") return "GOOD_FIT";
  if (v === "strong fit") return "STRONG_FIT";
  return null;
}

export function normRating(raw: unknown): VitalRating | null {
  if (raw == null) return null;
  const v = String(raw).trim().toUpperCase();
  if (v === "Y") return "Y";
  if (v === "P") return "P";
  if (v === "N") return "N";
  return null;
}

// VITAL question answer: "Yes"/"Partial"/"No"/"N/A" → enum.
export function normAnswer(raw: unknown): VitalAnswer | null {
  if (raw == null) return null;
  const v = String(raw).trim().toLowerCase();
  if (v === "yes" || v === "y") return "YES";
  if (v === "partial" || v === "p") return "PARTIAL";
  if (v === "no" || v === "n") return "NO";
  if (v === "n/a" || v === "na") return "NA";
  return null;
}

// Role text can carry a qualifier, e.g. "Core (Speaking)" or "Supplementary (self-study)".
export function normToolRole(raw: unknown): { role: VitalToolRole; qualifier: string | null } | null {
  if (raw == null) return null;
  const full = String(raw).trim();
  const base = full.replace(/\s*\(.*\)\s*$/, "").trim().toLowerCase();
  const m = full.match(/\(([^)]*)\)/);
  const qualifier = m ? m[1] : null;
  let role: VitalToolRole | null = null;
  if (base === "core") role = "CORE";
  else if (base === "supplementary") role = "SUPPLEMENTARY";
  else if (base === "resource bank") role = "RESOURCE_BANK";
  else if (base === "teacher tool only") role = "TEACHER_TOOL";
  else if (base === "assessment") role = "ASSESSMENT";
  if (!role) return null;
  return { role, qualifier };
}

// "8/10" → 8, "36/50" → 36.
export function parseScoreFraction(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return Math.round(raw);
  const m = String(raw).match(/(\d+)\s*\/\s*\d+/);
  if (m) return parseInt(m[1], 10);
  const n = Number(String(raw).trim());
  return Number.isFinite(n) ? Math.round(n) : null;
}

// "Yes"/"No" → boolean for the "Below A0?" column.
export function normYesNo(raw: unknown): boolean {
  if (raw == null) return false;
  return String(raw).trim().toLowerCase() === "yes";
}
