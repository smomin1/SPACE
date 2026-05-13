import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { EvaluatorType, WeightLevel } from '@prisma/client'

const MAX_ROWS = 500

// Map common Priority/Weight strings to WeightLevel enum
function parseWeight(raw: unknown): WeightLevel {
  const s = String(raw ?? '').trim().toUpperCase()
  if (s === 'HIGH' || s === 'CRITICAL') return WeightLevel.HIGH
  if (s === 'LOW' || s === 'MINOR')     return WeightLevel.LOW
  return WeightLevel.MEDIUM
}

// Map common EvaluatorType strings to enum, default COMPLIANCE
function parseEvaluatorType(raw: unknown): EvaluatorType {
  const s = String(raw ?? '').trim().toUpperCase()
  if (s === 'PEDAGOGY')  return EvaluatorType.PEDAGOGY
  if (s === 'TECHNICAL') return EvaluatorType.TECHNICAL
  if (s === 'COMPLIANCE') return EvaluatorType.COMPLIANCE
  return EvaluatorType.COMPLIANCE
}

// Map common boolean-ish values, default false
function parseBoolean(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'number')  return raw === 1
  const s = String(raw ?? '').trim().toLowerCase()
  return s === 'true' || s === 'yes' || s === '1'
}

// Extract a string cell, return null if empty/missing
function str(raw: unknown): string | null {
  const s = String(raw ?? '').trim()
  return s === '' || s === 'undefined' || s === 'null' ? null : s
}

// Hardcoded column map — keys are the exact header strings from the Excel file
// Secondary keys handle future uploads that include evaluatorType / isComplianceGate
function mapRow(raw: Record<string, unknown>, index: number): {
  title: string | null
  description: string | null
  evaluatorType: EvaluatorType
  weight: WeightLevel
  isComplianceGate: boolean
  category: string | null
  order: number
} {
  return {
    title:            str(raw['Requirement Description'] ?? raw['title'] ?? raw['Title']),
    description:      str(raw['Justification'] ?? raw['description'] ?? raw['Description']),
    evaluatorType:    parseEvaluatorType(raw['Evaluator Type'] ?? raw['evaluatorType'] ?? raw['Type']),
    weight:           parseWeight(raw['Priority'] ?? raw['weight'] ?? raw['Weight']),
    isComplianceGate: parseBoolean(raw['Compliance Gate'] ?? raw['isComplianceGate'] ?? raw['Gate']),
    category:         str(raw['Category'] ?? raw['category']),
    order:            typeof raw['#'] === 'number' ? raw['#'] : index + 1,
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canDo(session.user.role, 'manage:requirements'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || typeof file === 'string')
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

  if (!file.name.endsWith('.xlsx'))
    return NextResponse.json({ error: 'Only .xlsx files are supported' }, { status: 400 })

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
      { status: 422 }
    )

  // Map every row — skip rows where title is blank (e.g. section header rows)
  const failures: { row: number; errors: string[] }[] = []
  const validRows: ReturnType<typeof mapRow>[] = []

  for (let i = 0; i < rawRows.length; i++) {
    const mapped = mapRow(rawRows[i], i)
    const errs: string[] = []

    if (!mapped.title) errs.push('Requirement Description is empty')

    if (errs.length > 0) {
      failures.push({ row: i + 2, errors: errs })
    } else {
      validRows.push(mapped)
    }
  }

  if (failures.length > 0) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', failures },
      { status: 422 }
    )
  }

  // Upsert: only create rows whose title doesn't already exist (case-insensitive)
  const incomingTitles = validRows.map((r) => r.title!)
  const existingTitles = new Set(
    (
      await prisma.requirement.findMany({
        where: { title: { in: incomingTitles, mode: 'insensitive' } },
        select: { title: true },
      })
    ).map((r) => r.title.toLowerCase())
  )

  const newRows = validRows.filter(
    (r) => !existingTitles.has(r.title!.toLowerCase())
  )

  if (newRows.length > 0) {
    await prisma.requirement.createMany({
      data: newRows.map((r) => ({
        title:            r.title!,
        description:      r.description ?? '',
        evaluatorType:    r.evaluatorType,
        weight:           r.weight,
        isComplianceGate: r.isComplianceGate,
        category:         r.category ?? null,
        order:            r.order,
      })),
    })
  }

  return NextResponse.json(
    { imported: newRows.length, skipped: validRows.length - newRows.length },
    { status: 201 }
  )
}
