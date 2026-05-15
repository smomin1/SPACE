import * as XLSX from 'xlsx'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }
  if (!canDo(session.user.role, 'view:results')) {
    return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const scores = await prisma.score.findMany({
    where: {
      evaluation: { state: { in: ['FINALISED', 'MERGED'] } },
    },
    select: {
      value: true,
      evidenceType: true,
      comment: true,
      updatedAt: true,
      evaluation: {
        select: {
          platform: { select: { id: true, name: true } },
        },
      },
      requirement: {
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          weight: true,
          evaluatorType: true,
        },
      },
      user: { select: { name: true } },
    },
    orderBy: [
      { evaluation: { platform: { name: 'asc' } } },
      { requirement: { category: 'asc' } },
      { requirement: { order: 'asc' } },
    ],
  })

  const rows = scores.map(s => ({
    platformId: s.evaluation.platform.id,
    platformName: s.evaluation.platform.name,
    requirementId: s.requirement.id,
    requirementTitle: s.requirement.title,
    requirementDescription: s.requirement.description,
    category: s.requirement.category ?? '',
    weight: s.requirement.weight,
    evaluatorType: s.requirement.evaluatorType,
    score: s.value ?? 'N/A',
    evidenceType: s.evidenceType ?? '',
    notes: s.comment ?? '',
    evaluatorName: s.user.name,
    submittedAt: s.updatedAt.toISOString(),
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const csv = XLSX.utils.sheet_to_csv(ws)

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="scores.csv"',
    },
  })
}
