import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import { createElement, type ReactElement } from 'react'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import {
  calculateWeightedPercentage,
  getRecommendedAction,
} from '@/lib/scoring'
import type { Score, Requirement } from '@/lib/scoring'
import { EvaluationReportPDF } from '@/components/export/EvaluationReportPDF'
import type { ComparisonRow, BestFitContext } from '@/components/export/EvaluationReportPDF'

function toReq(r: { id: string; weight: string; category: string | null; isComplianceGate: boolean }): Requirement {
  return { ...r, weight: r.weight as Requirement['weight'], contextIds: [] }
}

function toScore(s: { requirementId: string; value: number | null; evidenceType: string | null }): Score {
  return {
    requirementId: s.requirementId,
    value: s.value,
    evidenceType: s.evidenceType as Score['evidenceType'],
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }
  if (!canDo(session.user.role, 'view:results')) {
    return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const [platforms, requirements, evaluations, contexts] = await Promise.all([
    prisma.platform.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, vendor: true, status: true },
    }),
    prisma.requirement.findMany({
      where: { evaluatorType: { not: 'COMPLIANCE' } },
      select: { id: true, weight: true, category: true, isComplianceGate: true, evaluatorType: true },
    }),
    prisma.evaluation.findMany({
      where: { state: { in: ['FINALISED', 'MERGED'] } },
      select: {
        id: true,
        platformId: true,
        state: true,
        scores: { select: { requirementId: true, value: true, evidenceType: true } },
      },
    }),
    prisma.context.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        requirements: { select: { requirementId: true } },
        platforms: { select: { platformId: true } },
      },
    }),
  ])

  // Best evaluation per platform
  const evalByPlatform = new Map<string, (typeof evaluations)[number]>()
  for (const ev of evaluations) {
    const cur = evalByPlatform.get(ev.platformId)
    if (!cur || (ev.state === 'FINALISED' && cur.state !== 'FINALISED')) {
      evalByPlatform.set(ev.platformId, ev)
    }
  }

  const complianceReqs = requirements.filter(r => r.isComplianceGate).map(toReq)
  const pedagogyReqs   = requirements.filter(r => r.evaluatorType === 'PEDAGOGY').map(toReq)
  const technicalReqs  = requirements.filter(r => r.evaluatorType === 'TECHNICAL').map(toReq)
  const combinedReqs   = [...pedagogyReqs, ...technicalReqs]

  // ── Comparison rows ──────────────────────────────────────────────────────────

  const comparison: ComparisonRow[] = platforms.map(p => {
    const ev = evalByPlatform.get(p.id) ?? null
    if (!ev) {
      return {
        name: p.name, vendor: p.vendor,
        compliancePass: null, pedagogyPct: null, technicalPct: null, combinedPct: null,
        recommendation: null, evalState: null,
      }
    }

    const allScores = ev.scores.map(toScore)
    const cgPass = complianceReqs.length === 0
      ? null
      : !complianceReqs.some(r => allScores.some(s => s.requirementId === r.id && s.value === 0))

    const pPct = pedagogyReqs.length  ? calculateWeightedPercentage(allScores, pedagogyReqs)  : null
    const tPct = technicalReqs.length ? calculateWeightedPercentage(allScores, technicalReqs) : null
    const cPct = combinedReqs.length  ? calculateWeightedPercentage(allScores, combinedReqs)  : null

    const rec = p.status === 'DISQUALIFIED'
      ? 'DISQUALIFIED'
      : cPct !== null ? getRecommendedAction(cPct) : null

    return {
      name: p.name, vendor: p.vendor,
      compliancePass: cgPass,
      pedagogyPct: pPct, technicalPct: tPct, combinedPct: cPct,
      recommendation: rec, evalState: ev.state,
    }
  })

  // ── Best fit by context ────────────────────────────────────────────────────────

  const bestFit: BestFitContext[] = contexts
    .map(ctx => {
      const ctxReqIds  = new Set(ctx.requirements.map(r => r.requirementId))
      const ctxPlatIds = new Set(ctx.platforms.map(p => p.platformId))
      const ctxReqs    = requirements.filter(r => ctxReqIds.has(r.id) && r.evaluatorType !== 'COMPLIANCE').map(toReq)
      const ctxPlats   = platforms.filter(p => ctxPlatIds.has(p.id) && p.status === 'ACTIVE')

      const ranked = ctxPlats
        .map(p => {
          const ev     = evalByPlatform.get(p.id)
          const scores = ev ? ev.scores.map(toScore) : []
          const pct    = ctxReqs.length ? calculateWeightedPercentage(scores, ctxReqs) : null
          return { name: p.name, vendor: p.vendor, pct }
        })
        .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1))
        .map((p, i) => ({ ...p, rank: i + 1 }))

      return { contextName: ctx.name, platforms: ranked }
    })
    .filter(c => c.platforms.length > 0)

  // ── Render PDF ────────────────────────────────────────────────────────────────

  const element = createElement(EvaluationReportPDF, {
    generatedAt: new Date().toLocaleDateString(undefined, { dateStyle: 'long' }),
    comparison,
    bestFit,
  }) as unknown as ReactElement<DocumentProps>

  const buffer = await renderToBuffer(element)
  const body = new Uint8Array(buffer)

  return new Response(body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="evaluation-report.pdf"',
    },
  })
}
