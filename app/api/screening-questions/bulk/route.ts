import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { ScreeningHardFail } from '@prisma/client'

const MAX_ROWS = 500

function parseHardFail(raw: unknown): ScreeningHardFail | null {
  const s = String(raw ?? '').trim().toUpperCase()
  if (s === 'IF_YES' || s === 'YES') return ScreeningHardFail.IF_YES
  if (s === 'IF_NO' || s === 'NO') return ScreeningHardFail.IF_NO
  return null
}

function str(raw: unknown): string | null {
  const s = String(raw ?? '').trim()
  return s === '' || s === 'undefined' || s === 'null' ? null : s
}

function mapRow(raw: Record<string, unknown>, index: number): {
  num: number
  category: string | null
  question: string | null
  whatToLookFor: string | null
  hardFail: ScreeningHardFail | null
} {
  const numRaw = raw['num'] ?? raw['Number'] ?? raw['#']
  const num = typeof numRaw === 'number' ? numRaw : parseInt(String(numRaw ?? ''), 10)
  return {
    num: Number.isFinite(num) ? num : index + 1,
    category: str(raw['category'] ?? raw['Category']),
    question: str(raw['question'] ?? raw['Question']),
    whatToLookFor: str(raw['whatToLookFor'] ?? raw['What To Look For'] ?? raw['What to look for']),
    hardFail: parseHardFail(raw['hardFail'] ?? raw['Hard Fail'] ?? raw['Hard-fail rule']),
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canDo(session.user.role, 'manage:screening'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || typeof file === 'string')
    return NextResponse.json({ error: 'No file uploaded', code: 'NO_FILE' }, { status: 400 })

  if (!file.name.endsWith('.xlsx'))
    return NextResponse.json({ error: 'Only .xlsx files are supported', code: 'INVALID_FILE_TYPE' }, { status: 400 })

  const requirementSetId = formData.get('requirementSetId')
  if (!requirementSetId || typeof requirementSetId !== 'string')
    return NextResponse.json({ error: 'requirementSetId is required', code: 'BAD_REQUEST' }, { status: 400 })

  const requirementSet = await prisma.requirementSet.findUnique({ where: { id: requirementSetId } })
  if (!requirementSet)
    return NextResponse.json({ error: 'Unknown requirement set', code: 'BAD_REQUEST' }, { status: 400 })

  let workbook: XLSX.WorkBook
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    workbook = XLSX.read(buffer, { type: 'buffer' })
  } catch {
    return NextResponse.json({ error: 'Could not parse the uploaded file' }, { status: 400 })
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

  if (rawRows.length === 0)
    return NextResponse.json({ error: 'The file contains no data rows' }, { status: 422 })

  if (rawRows.length > MAX_ROWS)
    return NextResponse.json(
      { error: `File exceeds the ${MAX_ROWS}-row limit (found ${rawRows.length} rows)`, code: 'TOO_MANY_ROWS' },
      { status: 422 },
    )

  const failures: { row: number; errors: string[] }[] = []
  const validRows: ReturnType<typeof mapRow>[] = []

  for (let i = 0; i < rawRows.length; i++) {
    const mapped = mapRow(rawRows[i], i)
    const errs: string[] = []

    if (!mapped.category) errs.push('category is empty')
    if (!mapped.question) errs.push('question is empty')
    if (!Number.isFinite(mapped.num) || mapped.num < 1) errs.push('num must be a positive integer')

    if (errs.length > 0) {
      failures.push({ row: i + 2, errors: errs })
    } else {
      validRows.push(mapped)
    }
  }

  if (failures.length > 0) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', failures },
      { status: 422 },
    )
  }

  // Skip rows whose `num` already exists within this requirement set - never
  // silently overwrite an existing question via bulk import.
  const existingNums = new Set(
    (
      await prisma.screeningQuestion.findMany({
        where: { requirementSetId, num: { in: validRows.map((r) => r.num) } },
        select: { num: true },
      })
    ).map((r) => r.num),
  )

  const newRows = validRows.filter((r) => !existingNums.has(r.num))

  if (newRows.length > 0) {
    await prisma.screeningQuestion.createMany({
      data: newRows.map((r) => ({
        num: r.num,
        category: r.category!,
        question: r.question!,
        whatToLookFor: r.whatToLookFor,
        hardFail: r.hardFail,
        requirementSetId,
      })),
    })
  }

  return NextResponse.json(
    { imported: newRows.length, skipped: validRows.length - newRows.length },
    { status: 201 },
  )
}
