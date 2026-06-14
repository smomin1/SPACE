import type { ScreeningAnswer, ScreeningHardFail } from '@prisma/client'

// ─── Tool Scanner screening: pure scoring/derivation helpers (no DB calls) ──────
//
// Answers are Yes / Partial / No / Unknown. Coverage treats them as points:
//   YES = 2, PARTIAL = 1, NO = 0, and UNKNOWN is excluded from the denominator
// entirely (we couldn't determine it, so it neither helps nor hurts the score).

export const ANSWER_POINTS: Record<ScreeningAnswer, number | null> = {
  YES: 2,
  PARTIAL: 1,
  NO: 0,
  UNKNOWN: null, // excluded from coverage
}

const MAX_POINTS = 2

export type AnswerLike = { answer: ScreeningAnswer }
export type QuestionLike = { id: string; category: string | null; hardFail: ScreeningHardFail | null }
export type ResponseLike = { questionId: string; answer: ScreeningAnswer }

/**
 * Coverage % across a set of responses: Σ points / (2 × answered) × 100, where
 * "answered" counts only YES/PARTIAL/NO. Returns 0 when nothing is determinable.
 */
export function coveragePercent(responses: AnswerLike[]): number {
  let total = 0
  let determined = 0
  for (const r of responses) {
    const pts = ANSWER_POINTS[r.answer]
    if (pts === null) continue // UNKNOWN excluded
    total += pts
    determined += 1
  }
  if (determined === 0) return 0
  return (total / (determined * MAX_POINTS)) * 100
}

/**
 * Per-category coverage %. Categories with no determinable answers map to 0.
 */
export function coverageByCategory(
  questions: QuestionLike[],
  responses: ResponseLike[],
): Record<string, number> {
  const categoryByQuestion = new Map(questions.map((q) => [q.id, q.category ?? 'General']))
  const grouped = new Map<string, AnswerLike[]>()
  for (const r of responses) {
    const cat = categoryByQuestion.get(r.questionId)
    if (!cat) continue
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(r)
  }
  const out: Record<string, number> = {}
  for (const [cat, rs] of grouped.entries()) {
    out[cat] = coveragePercent(rs)
  }
  return out
}

/**
 * Whether an answer trips a hard-fail safeguarding blocker on its question.
 * IF_YES questions fail on YES; IF_NO questions fail on NO.
 */
export function hardFailTriggered(
  hardFail: ScreeningHardFail | null,
  answer: ScreeningAnswer,
): boolean {
  if (hardFail === 'IF_YES') return answer === 'YES'
  if (hardFail === 'IF_NO') return answer === 'NO'
  return false
}
