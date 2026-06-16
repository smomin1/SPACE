import type { CefrAnswer, CefrSkillGroup } from '@prisma/client'

// ─── CEFR alignment scoring (pure, no DB) ───────────────────────────────────────
//
// Mirrors the Tool Scanner screening model: YES=2, PARTIAL=1, NO=0, and NA is
// excluded from the denominator entirely (couldn't determine, so it neither helps
// nor hurts). Alignment % = Σ points / (2 × answered) × 100.

export const CEFR_POINTS: Record<CefrAnswer, number | null> = {
  YES: 2,
  PARTIAL: 1,
  NO: 0,
  NA: null, // excluded
}

const MAX_POINTS = 2

export type CefrAnswerLike = { answer: CefrAnswer }
export type CefrQuestionLike = {
  id: string
  levelId: string
  skillId: string
}
export type CefrResponseLike = { questionId: string; answer: CefrAnswer }

/** Alignment % across a set of responses (NA excluded). 0 when nothing determinable. */
export function alignmentPercent(responses: CefrAnswerLike[]): number {
  let total = 0
  let determined = 0
  for (const r of responses) {
    const pts = CEFR_POINTS[r.answer]
    if (pts === null) continue
    total += pts
    determined += 1
  }
  if (determined === 0) return 0
  return (total / (determined * MAX_POINTS)) * 100
}

/** Generic grouping helper: alignment % per key, given a question→key map. */
function alignmentByKey(
  keyByQuestion: Map<string, string>,
  responses: CefrResponseLike[],
): Record<string, number> {
  const grouped = new Map<string, CefrAnswerLike[]>()
  for (const r of responses) {
    const key = keyByQuestion.get(r.questionId)
    if (!key) continue
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(r)
  }
  const out: Record<string, number> = {}
  for (const [key, rs] of grouped.entries()) out[key] = alignmentPercent(rs)
  return out
}

/** Alignment % per CEFR level (keyed by levelId). */
export function alignmentByLevel(
  questions: CefrQuestionLike[],
  responses: CefrResponseLike[],
): Record<string, number> {
  return alignmentByKey(new Map(questions.map((q) => [q.id, q.levelId])), responses)
}

/** Alignment % per skill (keyed by skillId). */
export function alignmentBySkill(
  questions: CefrQuestionLike[],
  responses: CefrResponseLike[],
): Record<string, number> {
  return alignmentByKey(new Map(questions.map((q) => [q.id, q.skillId])), responses)
}

/**
 * Alignment % per CEFR level split by skill group (LS vs RWVG) — the basis for the
 * "2 tools per CEFR micro-level (L&S + RWV&G)" final output.
 */
export function alignmentByLevelAndGroup(
  questions: (CefrQuestionLike & { group: CefrSkillGroup })[],
  responses: CefrResponseLike[],
): Record<string, { LS: number; RWVG: number }> {
  const meta = new Map(questions.map((q) => [q.id, { levelId: q.levelId, group: q.group }]))
  const bucket = new Map<string, { LS: CefrAnswerLike[]; RWVG: CefrAnswerLike[] }>()
  for (const r of responses) {
    const m = meta.get(r.questionId)
    if (!m) continue
    if (!bucket.has(m.levelId)) bucket.set(m.levelId, { LS: [], RWVG: [] })
    bucket.get(m.levelId)![m.group].push(r)
  }
  const out: Record<string, { LS: number; RWVG: number }> = {}
  for (const [levelId, g] of bucket.entries()) {
    out[levelId] = { LS: alignmentPercent(g.LS), RWVG: alignmentPercent(g.RWVG) }
  }
  return out
}
