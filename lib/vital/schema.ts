import { z } from "zod";

const coverage = z.enum(["FULL", "PARTIAL", "NONE", "NA"]);
const dependency = z.enum([
  "TEACHER_LED",
  "PARTIAL",
  "STUDENT",
  "NOT_APPLICABLE",
]);
const toolDependency = z.enum([
  "FULLY_TEACHER_LED",
  "MOSTLY_TEACHER_LED",
  "BLENDED",
  "MOSTLY_INDEPENDENT",
  "FULLY_INDEPENDENT",
]);
const risk = z.enum(["LOW", "MEDIUM", "HIGH"]);
const verdict = z.enum(["POOR_FIT", "PARTIAL_FIT", "GOOD_FIT", "STRONG_FIT"]);
const rating = z.enum(["Y", "P", "N"]);
const toolRole = z.enum([
  "CORE",
  "SUPPLEMENTARY",
  "RESOURCE_BANK",
  "TEACHER_TOOL",
  "ASSESSMENT",
]);
const status = z.enum(["COMPLIANT", "ONE_GAP", "MULTI_GAP"]);
const pillar = z.enum(["V", "I", "T", "A", "L"]);

const emptyToNull = (v: unknown) =>
  v === "" || v === undefined ? null : v;

export const vitalToolSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  role: toolRole,
  // vitalScore10 is always derived from pillarRatings server-side, never accepted
  // from the client. See vitalScore10FromPillars in lib/vital/compute.ts.
  v2Score50: z.preprocess(emptyToNull, z.coerce.number().int().min(0).max(50).nullable()),
  verdict: z.preprocess(emptyToNull, verdict.nullable()),
  deFactoRisk: z.preprocess(emptyToNull, risk.nullable()),
  overallDependency: z.preprocess(emptyToNull, toolDependency.nullable()),
  belowA0: z.boolean().default(false),
  cefrRangeLabel: z.preprocess(emptyToNull, z.string().nullable()),
  isAssessmentTool: z.boolean().default(false),
  adaptiveTesting: z.preprocess(emptyToNull, z.string().nullable()),
  notes: z.preprocess(emptyToNull, z.string().nullable()),
  platformId: z.preprocess(emptyToNull, z.string().nullable()),
  pillarRatings: z
    .array(z.object({ pillar, rating }))
    .optional(),
  skillCoverage: z
    .array(
      z.object({
        skillId: z.string(),
        coverage,
        dependency: z.preprocess(emptyToNull, dependency.nullable()),
      })
    )
    .optional(),
  levelMappings: z
    .array(z.object({ levelId: z.string(), coverage }))
    .optional(),
});

export type VitalToolInput = z.infer<typeof vitalToolSchema>;

// Only the editorial inputs are accepted from the client. The tool pairing is
// auto-derived unless a slot is locked; pillar coverage, status, risk and
// dependency are always recomputed server-side from the effective tools.
// See lib/vital/derive.ts.
export const vitalRecommendationSchema = z.object({
  skillId: z.string().min(1),
  levelId: z.string().min(1),
  coreToolId: z.preprocess(emptyToNull, z.string().nullable()),
  suppToolId: z.preprocess(emptyToNull, z.string().nullable()),
  coreToolLocked: z.boolean().default(false),
  suppToolLocked: z.boolean().default(false),
  deploymentNote: z.preprocess(emptyToNull, z.string().nullable()),
});

export type VitalRecommendationInput = z.infer<typeof vitalRecommendationSchema>;

export const vitalLevelSchema = z.object({
  code: z.string().trim().min(1),
  label: z.string().trim().min(1),
  order: z.coerce.number().int(),
  scoreBand: z.string().trim().min(1),
  cefrStatus: z.string().trim().min(1),
  bandGroup: z.string().trim().min(1),
  isPreEmergent: z.boolean().default(false),
  assessmentOnly: z.boolean().default(false),
});

export type VitalLevelInput = z.infer<typeof vitalLevelSchema>;

export const vitalSkillSchema = z.object({
  name: z.string().trim().min(1),
  order: z.coerce.number().int(),
});

export type VitalSkillInput = z.infer<typeof vitalSkillSchema>;
