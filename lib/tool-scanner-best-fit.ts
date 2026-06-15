import type { ScreeningAnswer } from '@prisma/client'
import { ANSWER_POINTS } from '@/lib/screening'

// ─── Tool Scanner "Best Fit": greedy set-cover over screening answers ───────────
//
// Goal: find the fewest tools that, combined, cover the most screening questions
// at the highest score. Adapts the weighted requirement set-cover from the Results
// Best Fit page to UNWEIGHTED screening answers (YES=2, PARTIAL=1, NO=0, UNKNOWN
// excluded — see ANSWER_POINTS in lib/screening.ts).
//
// A question is "satisfied" once some tool in the set answers YES (the max of 2,
// i.e. the same 75%-of-max bar the Results page uses). Pure functions, no DB.

const MAX_POINTS = 2 // a YES answer
const SATISFIED = MAX_POINTS // a question is satisfied at a YES
export const WEAK_CATEGORY_THRESHOLD = 75 // category coverage below this % is a gap
const MAX_SET_SIZE = 5 // cap on combination size

// ─── Inputs ──────────────────────────────────────────────────────────────────

export interface BestFitTool {
  id: string
  name: string
  url: string
  grades: string[]
  fluency: string[]
  audience: string
  answers: Record<string, ScreeningAnswer> // questionId → answer
}

export interface BestFitQuestion {
  id: string
  category: string
}

// ─── Outputs ───────────────────────────────────────────────────────────────────

export interface SetMember {
  id: string
  name: string
  url: string
  overallPct: number // this tool alone, over the active question set
  marginalGainPct: number // share of questions it newly satisfied for the set
  topCategories: { category: string; pct: number }[] // where it is the set's best
}

export interface GapItem {
  id: string
  category: string
  type: 'uncovered' | 'weak'
  bestPoints: number | null // best points any tool in the set has (null = none)
  helperTools: { name: string; points: number }[] // tools outside the set that do better
}

export interface CategorySatisfaction {
  category: string
  total: number
  satisfied: number
  partial: number
  uncovered: number
}

export interface CombinedAnalysis {
  members: SetMember[]
  combinedPct: number
  satisfiedCount: number
  partialCount: number
  uncoveredCount: number
  totalCount: number
  gaps: GapItem[]
  gapByCategory: { category: string; total: number; uncovered: number; weak: number }[]
  categorySatisfaction: CategorySatisfaction[]
}

export interface TopPickProfile {
  id: string
  name: string
  url: string
  overallPct: number
  categoryBreakdown: { category: string; pct: number }[]
  gapSuggestions: {
    category: string
    toolPct: number
    alternatives: { id: string; name: string; pct: number }[]
  }[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Points a tool scores on a question (0 for NO / UNKNOWN / unanswered). */
function points(tool: BestFitTool, questionId: string): number {
  const pts = ANSWER_POINTS[tool.answers[questionId]]
  return pts == null ? 0 : pts
}

/** Whether a tool gives a determinable answer (YES/PARTIAL/NO, not UNKNOWN). */
function isDetermined(tool: BestFitTool, questionId: string): boolean {
  const ans = tool.answers[questionId]
  return ans != null && ANSWER_POINTS[ans] != null
}

/** Overall coverage % of one tool over a question set (UNKNOWN excluded). */
function toolOverallPct(tool: BestFitTool, questions: BestFitQuestion[]): number {
  let total = 0
  let determined = 0
  for (const q of questions) {
    if (!isDetermined(tool, q.id)) continue
    total += points(tool, q.id)
    determined += 1
  }
  return determined === 0 ? 0 : (total / (determined * MAX_POINTS)) * 100
}

/** Per-category coverage % of one tool. */
function toolCategoryPct(
  tool: BestFitTool,
  questions: BestFitQuestion[],
): { category: string; pct: number }[] {
  const byCat = new Map<string, { total: number; determined: number }>()
  for (const q of questions) {
    if (!isDetermined(tool, q.id)) continue
    const e = byCat.get(q.category) ?? { total: 0, determined: 0 }
    e.total += points(tool, q.id)
    e.determined += 1
    byCat.set(q.category, e)
  }
  return [...byCat.entries()].map(([category, v]) => ({
    category,
    pct: v.determined === 0 ? 0 : (v.total / (v.determined * MAX_POINTS)) * 100,
  }))
}

// ─── Greedy set cover ──────────────────────────────────────────────────────────

export function greedyToolSetCover(
  tools: BestFitTool[],
  questions: BestFitQuestion[],
  maxSize = MAX_SET_SIZE,
): {
  selectedIds: string[]
  bestPerQuestion: Map<string, { points: number; toolId: string }>
  marginalGains: Map<string, number>
} {
  // Questions any tool can determine — the denominator for marginal coverage.
  const determinableIds = new Set<string>()
  for (const q of questions) {
    if (tools.some((t) => isDetermined(t, q.id))) determinableIds.add(q.id)
  }
  const totalDeterminable = determinableIds.size

  const selectedIds: string[] = []
  const bestPerQuestion = new Map<string, { points: number; toolId: string }>()
  const marginalGains = new Map<string, number>()

  for (let i = 0; i < maxSize; i++) {
    let bestId: string | null = null
    let bestNewlySatisfied = 0 // questions this tool newly brings to YES
    let bestPointsGain = 0 // tiebreak: raw points improvement

    for (const t of tools) {
      if (selectedIds.includes(t.id)) continue

      let newlySatisfied = 0
      let pointsGain = 0
      for (const q of questions) {
        const newPts = points(t, q.id)
        const curBest = bestPerQuestion.get(q.id)?.points ?? 0
        if (newPts > curBest) pointsGain += newPts - curBest
        if (curBest < SATISFIED && newPts >= SATISFIED) newlySatisfied += 1
      }

      if (
        newlySatisfied > bestNewlySatisfied ||
        (newlySatisfied === bestNewlySatisfied && pointsGain > bestPointsGain)
      ) {
        bestNewlySatisfied = newlySatisfied
        bestPointsGain = pointsGain
        bestId = t.id
      }
    }

    if (!bestId) break
    // The first pick always seeds the set; later picks must add real coverage.
    if (i > 0 && bestNewlySatisfied === 0 && bestPointsGain === 0) break

    selectedIds.push(bestId)
    marginalGains.set(
      bestId,
      totalDeterminable > 0 ? (bestNewlySatisfied / totalDeterminable) * 100 : 0,
    )

    const chosen = tools.find((t) => t.id === bestId)!
    for (const q of questions) {
      const newPts = points(chosen, q.id)
      const cur = bestPerQuestion.get(q.id)
      if (newPts > 0 && (!cur || newPts > cur.points)) {
        bestPerQuestion.set(q.id, { points: newPts, toolId: bestId })
      }
    }
  }

  return { selectedIds, bestPerQuestion, marginalGains }
}

// ─── Combined analysis ───────────────────────────────────────────────────────

export function buildCombinedAnalysis(
  selectedIds: string[],
  bestPerQuestion: Map<string, { points: number; toolId: string }>,
  marginalGains: Map<string, number>,
  tools: BestFitTool[],
  questions: BestFitQuestion[],
): CombinedAnalysis {
  const toolById = new Map(tools.map((t) => [t.id, t]))

  // Set members
  const members: SetMember[] = selectedIds.map((id) => {
    const t = toolById.get(id)!

    // Categories where this tool is the set's best contributor
    const catBest = new Map<string, { total: number; determined: number }>()
    for (const q of questions) {
      const best = bestPerQuestion.get(q.id)
      if (!best || best.toolId !== id) continue
      const e = catBest.get(q.category) ?? { total: 0, determined: 0 }
      e.total += best.points
      e.determined += 1
      catBest.set(q.category, e)
    }
    const topCategories = [...catBest.entries()]
      .map(([category, v]) => ({ category, pct: (v.total / (v.determined * MAX_POINTS)) * 100 }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3)

    return {
      id,
      name: t.name,
      url: t.url,
      overallPct: toolOverallPct(t, questions),
      marginalGainPct: marginalGains.get(id) ?? 0,
      topCategories,
    }
  })

  // Combined coverage using the best points per question
  let comboTotal = 0
  let comboDetermined = 0
  for (const q of questions) {
    const best = bestPerQuestion.get(q.id)
    const determinable = tools.some((t) => isDetermined(t, q.id))
    if (!determinable) continue
    comboTotal += best?.points ?? 0
    comboDetermined += 1
  }
  const combinedPct = comboDetermined === 0 ? 0 : (comboTotal / (comboDetermined * MAX_POINTS)) * 100

  // Satisfaction counts + gaps
  let satisfiedCount = 0
  let partialCount = 0
  let uncoveredCount = 0
  const gaps: GapItem[] = []

  for (const q of questions) {
    const best = bestPerQuestion.get(q.id)
    const pts = best?.points ?? 0
    const determinable = tools.some((t) => isDetermined(t, q.id))

    if (!determinable || pts === 0) {
      uncoveredCount += 1
    } else if (pts >= SATISFIED) {
      satisfiedCount += 1
    } else {
      partialCount += 1
    }

    if (pts >= SATISFIED) continue // satisfied — not a gap

    // Tools outside the set that score better on this question
    const helperTools = tools
      .filter((t) => !selectedIds.includes(t.id))
      .map((t) => ({ name: t.name, points: points(t, q.id) }))
      .filter((h) => h.points > pts)
      .sort((a, b) => b.points - a.points)
      .slice(0, 2)

    gaps.push({
      id: q.id,
      category: q.category,
      type: !determinable || pts === 0 ? 'uncovered' : 'weak',
      bestPoints: pts > 0 ? pts : null,
      helperTools,
    })
  }

  // Gap counts by category
  const gapCatMap = new Map<string, { total: number; uncovered: number; weak: number }>()
  for (const q of questions) {
    const e = gapCatMap.get(q.category) ?? { total: 0, uncovered: 0, weak: 0 }
    e.total += 1
    const gap = gaps.find((g) => g.id === q.id)
    if (gap?.type === 'uncovered') e.uncovered += 1
    else if (gap?.type === 'weak') e.weak += 1
    gapCatMap.set(q.category, e)
  }
  const gapByCategory = [...gapCatMap.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .filter((c) => c.uncovered + c.weak > 0)
    .sort((a, b) => b.uncovered + b.weak - (a.uncovered + a.weak))

  // Per-category satisfaction
  const satCatMap = new Map<string, { total: number; satisfied: number; partial: number; uncovered: number }>()
  for (const q of questions) {
    const e = satCatMap.get(q.category) ?? { total: 0, satisfied: 0, partial: 0, uncovered: 0 }
    e.total += 1
    const best = bestPerQuestion.get(q.id)
    const pts = best?.points ?? 0
    const determinable = tools.some((t) => isDetermined(t, q.id))
    if (!determinable || pts === 0) e.uncovered += 1
    else if (pts >= SATISFIED) e.satisfied += 1
    else e.partial += 1
    satCatMap.set(q.category, e)
  }
  const categorySatisfaction = [...satCatMap.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => a.category.localeCompare(b.category))

  return {
    members,
    combinedPct,
    satisfiedCount,
    partialCount,
    uncoveredCount,
    totalCount: questions.length,
    gaps,
    gapByCategory,
    categorySatisfaction,
  }
}

// ─── Top pick profile ──────────────────────────────────────────────────────────

export function buildTopPickProfile(
  topToolId: string,
  tools: BestFitTool[],
  questions: BestFitQuestion[],
): TopPickProfile | null {
  const top = tools.find((t) => t.id === topToolId)
  if (!top) return null

  const categoryBreakdown = toolCategoryPct(top, questions).sort((a, b) =>
    a.category.localeCompare(b.category),
  )

  const others = tools.filter((t) => t.id !== topToolId)
  const gapCats = categoryBreakdown.filter((c) => c.pct < WEAK_CATEGORY_THRESHOLD)

  const gapSuggestions = gapCats.map((gap) => {
    const catQuestions = questions.filter((q) => q.category === gap.category)
    const alternatives = others
      .map((t) => ({ id: t.id, name: t.name, pct: toolOverallPct(t, catQuestions) }))
      .filter((a) => a.pct > gap.pct)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 2)
    return { category: gap.category, toolPct: gap.pct, alternatives }
  })

  return {
    id: top.id,
    name: top.name,
    url: top.url,
    overallPct: toolOverallPct(top, questions),
    categoryBreakdown,
    gapSuggestions,
  }
}
