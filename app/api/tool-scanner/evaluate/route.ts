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

  let body: { platformName?: string; url?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'BAD_REQUEST' }, { status: 400 })
  }

  const platformName = body.platformName?.trim()
  const url = body.url?.trim()
  if (!platformName || !url) {
    return NextResponse.json(
      { error: 'platformName and url are required', code: 'BAD_REQUEST' },
      { status: 400 },
    )
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured on the server', code: 'NO_API_KEY' },
      { status: 500 },
    )
  }

  // Fail fast with a clear message rather than queueing a scan that can't run.
  const questionCount = await prisma.screeningQuestion.count()
  if (questionCount === 0) {
    return NextResponse.json(
      {
        error: 'No screening questions exist. Seed or create screening questions first.',
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
