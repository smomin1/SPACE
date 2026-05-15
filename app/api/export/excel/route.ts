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

  // Fetch all scores from finalised/merged evaluations
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
          state: true,
        },
      },
      requirement: {
        select: {
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

  // Group by platform
  const byPlatform = new Map<string, typeof scores>()
  for (const s of scores) {
    const name = s.evaluation.platform.name
    const existing = byPlatform.get(name) ?? []
    existing.push(s)
    byPlatform.set(name, existing)
  }

  const wb = XLSX.utils.book_new()

  for (const [platformName, platformScores] of byPlatform) {
    const rows = platformScores.map(s => ({
      'Requirement': s.requirement.title,
      'Description': s.requirement.description,
      'Category': s.requirement.category ?? '',
      'Weight': s.requirement.weight,
      'Evaluator Type': s.requirement.evaluatorType,
      'Evaluator': s.user.name,
      'Score': s.value ?? 'N/A',
      'Evidence Type': s.evidenceType ?? '',
      'Notes': s.comment ?? '',
      'Eval State': s.evaluation.state,
      'Last Updated': s.updatedAt.toISOString(),
    }))

    const ws = XLSX.utils.json_to_sheet(rows)

    // Auto-width columns
    const colWidths = Object.keys(rows[0] ?? {}).map(key => ({
      wch: Math.max(key.length, ...rows.map(r => String(r[key as keyof typeof r]).length)) + 2,
    }))
    ws['!cols'] = colWidths

    // Sheet name max 31 chars
    const sheetName = platformName.slice(0, 31)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  }

  if (wb.SheetNames.length === 0) {
    // Add empty sheet so file is valid
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['No data available']]), 'No Data')
  }

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="scores.xlsx"',
    },
  })
}
