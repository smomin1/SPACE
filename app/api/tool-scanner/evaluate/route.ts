import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { runToolScanEvaluation } from '@/lib/claude-tool-scanner'
import type {
  ScreeningQuestionInput,
  ToolScannerMetadata,
  ScreeningResult,
} from '@/lib/claude-tool-scanner'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: { platformName?: string; url?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON', code: 'BAD_REQUEST' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const platformName = body.platformName?.trim()
  const url = body.url?.trim()
  if (!platformName || !url) {
    return new Response(
      JSON.stringify({ error: 'platformName and url are required', code: 'BAD_REQUEST' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({
        error: 'ANTHROPIC_API_KEY is not configured on the server',
        code: 'NO_API_KEY',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const questions = await prisma.screeningQuestion.findMany({
    orderBy: { num: 'asc' },
    select: { id: true, num: true, category: true, question: true, whatToLookFor: true },
  })

  if (questions.length === 0) {
    return new Response(
      JSON.stringify({
        error: 'No screening questions exist. Seed or create screening questions first.',
        code: 'NO_QUESTIONS',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const screeningQuestions: ScreeningQuestionInput[] = questions
  const totalCategories = new Set(screeningQuestions.map((q) => q.category)).size
  const userId = session.user.id as string

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        send({ type: 'start', totalCategories })

        let metadata: ToolScannerMetadata | null = null
        const allResults: ScreeningResult[] = []
        let completedCategories = 0

        for await (const chunk of runToolScanEvaluation(platformName, url, screeningQuestions)) {
          if (chunk.type === 'metadata') {
            metadata = chunk.metadata
            send({ type: 'metadata', metadata: chunk.metadata })
          } else if (chunk.type === 'category') {
            completedCategories += 1
            allResults.push(...chunk.results)
            send({
              type: 'category',
              category: chunk.category,
              completed: completedCategories,
              total: totalCategories,
            })
          }
        }

        const saved = await prisma.searchEvaluation.create({
          data: {
            platformName,
            url,
            metadata: metadata
              ? (metadata as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            createdById: userId,
            responses: {
              create: allResults.map((r) => ({
                questionId: r.questionId,
                answer: r.answer,
                evidence: r.evidence,
                flag: r.flag,
                notes: r.notes,
              })),
            },
          },
        })

        send({ type: 'complete', evaluationId: saved.id })
        controller.close()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error during evaluation'
        send({ type: 'error', message })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
