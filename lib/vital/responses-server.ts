// Server glue: turn a tool's 25 question answers (+ optional pillar overrides)
// into the derived pillar letters and scores, and persist them. Used by the
// VITAL evaluator submit, the admin tool create/edit routes, and the seed.

import type {
  Prisma,
  PrismaClient,
  VitalAnswer,
  VitalPillar,
  VitalRating,
  VitalVerdict,
} from "@prisma/client";
import { deriveFromResponses, vitalScore10FromPillars, VITAL_PILLARS } from "./compute";

type Tx = Prisma.TransactionClient | PrismaClient;

export interface QuestionResponseInput {
  questionId: string;
  answer: VitalAnswer;
}
export interface PillarOverrideInput {
  pillar: VitalPillar;
  rating: VitalRating;
  note: string | null;
}

export interface DerivedToolScores {
  vitalScore10: number;
  v2Score50: number;
  v2Percent: number;
  verdict: ReturnType<typeof deriveFromResponses>["totals"]["verdict"];
  pillarRatings: {
    pillar: VitalPillar;
    rating: VitalRating;
    isOverride: boolean;
    overrideNote: string | null;
  }[];
}

// Pure: resolve answers→pillars, derive default letters, apply overrides, and
// roll up the tool-level scores. `questionPillar` maps questionId → pillar.
export function deriveToolScores(
  responses: QuestionResponseInput[],
  questionPillar: Map<string, VitalPillar>,
  overrides: PillarOverrideInput[] = [],
): DerivedToolScores {
  const withPillar = responses
    .map((r) => ({ pillar: questionPillar.get(r.questionId), answer: r.answer }))
    .filter((r): r is { pillar: VitalPillar; answer: VitalAnswer } => r.pillar != null);

  const { pillarLetters, totals } = deriveFromResponses(withPillar);

  const overrideBy = new Map(overrides.map((o) => [o.pillar, o]));
  const pillarRatings = VITAL_PILLARS.map((p) => {
    const ov = overrideBy.get(p);
    return ov
      ? { pillar: p, rating: ov.rating, isOverride: true, overrideNote: ov.note }
      : { pillar: p, rating: pillarLetters[p], isOverride: false, overrideNote: null };
  });

  const vitalScore10 = vitalScore10FromPillars(pillarRatings.map((r) => r.rating));

  return {
    vitalScore10,
    v2Score50: totals.total,
    v2Percent: totals.percent,
    verdict: totals.verdict,
    pillarRatings,
  };
}

// The full editable profile a route accepts for one tool (subset of vitalToolSchema).
export interface ToolProfileInput {
  isAssessmentTool: boolean;
  questionResponses?: QuestionResponseInput[];
  pillarOverrides?: PillarOverrideInput[];
  pillarRatings?: { pillar: VitalPillar; rating: VitalRating }[]; // legacy manual path
  v2Score50?: number | null; // legacy / assessment passthrough
  verdict?: VitalVerdict | null;
}

export interface ToolWritePlan {
  // Scalar score columns to set on the VitalTool row.
  scalars: {
    vitalScore10: number | null;
    v2Score50: number | null;
    v2Percent: number | null;
    verdict: VitalVerdict | null;
  };
  // Pillar-rating rows to (re)create for the tool.
  pillarRatings: {
    pillar: VitalPillar;
    rating: VitalRating;
    isOverride: boolean;
    overrideNote: string | null;
  }[];
  // Question-response rows to (re)create (empty for the legacy/assessment path).
  responses: QuestionResponseInput[];
}

// Decide what to write for a tool. If the 25 question answers are present they
// drive every score (and pillar letters); otherwise fall back to the legacy
// manual pillar letters + passed-through v2Score50/verdict (assessment tools).
export function planToolWrite(
  input: ToolProfileInput,
  questionPillar: Map<string, VitalPillar>,
): ToolWritePlan {
  const responses = input.questionResponses ?? [];
  if (responses.length > 0) {
    const d = deriveToolScores(responses, questionPillar, input.pillarOverrides ?? []);
    return {
      scalars: {
        vitalScore10: d.vitalScore10,
        v2Score50: d.v2Score50,
        v2Percent: d.v2Percent,
        verdict: d.verdict,
      },
      pillarRatings: d.pillarRatings,
      responses,
    };
  }

  // Legacy / assessment path: no question profile.
  const pillarRatings = (input.pillarRatings ?? []).map((r) => ({
    pillar: r.pillar,
    rating: r.rating,
    isOverride: false,
    overrideNote: null,
  }));
  const vitalScore10 = input.isAssessmentTool
    ? null
    : vitalScore10FromPillars(pillarRatings.map((r) => r.rating));
  return {
    scalars: {
      vitalScore10,
      v2Score50: input.v2Score50 ?? null,
      v2Percent: null,
      verdict: input.verdict ?? null,
    },
    pillarRatings,
    responses: [],
  };
}

// Load the questionId → pillar map (used to resolve responses → pillars).
export async function loadQuestionPillarMap(tx: Tx): Promise<Map<string, VitalPillar>> {
  const questions = await tx.vitalQuestion.findMany({ select: { id: true, pillar: true } });
  return new Map(questions.map((q) => [q.id, q.pillar]));
}

// (Re)write a tool's question responses + pillar ratings inside a transaction.
// Returns the scalar scores the caller must set on the VitalTool row.
export async function writeToolProfile(
  tx: Tx,
  toolId: string,
  input: ToolProfileInput,
): Promise<ToolWritePlan["scalars"]> {
  const questionPillar = await loadQuestionPillarMap(tx);
  const plan = planToolWrite(input, questionPillar);

  await tx.vitalQuestionResponse.deleteMany({ where: { toolId } });
  if (plan.responses.length) {
    await tx.vitalQuestionResponse.createMany({
      data: plan.responses.map((r) => ({ toolId, questionId: r.questionId, answer: r.answer })),
    });
  }

  await tx.vitalToolPillarRating.deleteMany({ where: { toolId } });
  if (plan.pillarRatings.length) {
    await tx.vitalToolPillarRating.createMany({
      data: plan.pillarRatings.map((r) => ({ toolId, ...r })),
    });
  }

  return plan.scalars;
}
