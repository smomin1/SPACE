import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { enqueueScan, DuplicateScanError } from '@/lib/tool-scanner-queue'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  let body: { platformName?: string; url?: string; requirementSetId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'BAD_REQUEST' }, { status: 400 })
  }

  const platformName = body.platformName?.trim()
  const url = body.url?.trim()
  const requirementSetId = body.requirementSetId?.trim()
  if (!platformName || !url || !requirementSetId) {
    return NextResponse.json(
      { error: 'platformName, url, and requirementSetId are required', code: 'BAD_REQUEST' },
      { status: 400 },
    )
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured on the server', code: 'NO_API_KEY' },
      { status: 500 },
    )
  }

  const requirementSet = await prisma.requirementSet.findUnique({ where: { id: requirementSetId } })
  if (!requirementSet || !requirementSet.isActive) {
    return NextResponse.json(
      { error: 'Unknown or inactive requirement set', code: 'BAD_REQUEST' },
      { status: 400 },
    )
  }

  // Fail fast with a clear message rather than queueing a scan that can't run.
  const questionCount = await prisma.screeningQuestion.count({ where: { requirementSetId } })
  if (questionCount === 0) {
    return NextResponse.json(
      {
        error: `No screening questions exist for ${requirementSet.name}. Seed or create screening questions first.`,
        code: 'NO_QUESTIONS',
      },
      { status: 400 },
    )
  }

  try {
    const { id } = await enqueueScan({
      platformName,
      url,
      userId: session.user.id as string,
      requirementSetId,
    })
    return NextResponse.json({ id, status: 'QUEUED' }, { status: 202 })
  } catch (err) {
    if (err instanceof DuplicateScanError) {
      return NextResponse.json({ error: err.message, code: 'DUPLICATE' }, { status: 409 })
    }
    const message = err instanceof Error ? err.message : 'Failed to queue scan'
    return NextResponse.json({ error: message, code: 'ENQUEUE_FAILED' }, { status: 500 })
  }
}
