import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { runToolScanEvaluation } from '@/lib/claude-tool-scanner'
import { syncPlatformPipeline } from '@/lib/pipeline-server'
import { ESL_REQUIREMENT_SET_KEY } from '@/lib/requirement-sets'
import type {
  ScreeningQuestionInput,
  ScreeningResult,
  ToolScannerMetadata,
} from '@/lib/claude-tool-scanner'

// ─── Background scan queue ──────────────────────────────────────────────────────
//
// Scans no longer run inside the HTTP request. A SearchEvaluation row is created
// as QUEUED, and a single in-process worker drains the queue ONE AT A TIME. This
// relies on the production host being a long-lived Node process (PM2 fork): a
// detached task keeps running after the response is sent. It would NOT survive on
// serverless, where post-response work is killed.
//
// State below is module-level, so it is a true singleton within the one PM2 fork.

const MAX_ATTEMPTS = 2 // initial run + one auto-retry

let processing = false
let recovered = false

/** Thrown by enqueueScan when the same URL is already in the system. */
export class DuplicateScanError extends Error {
  constructor(public readonly platformName: string) {
    super(`A scan for this URL already exists (${platformName}). Delete it to re-scan.`)
    this.name = 'DuplicateScanError'
  }
}

/**
 * Create a QUEUED scan and start the worker. Rejects (DuplicateScanError) if the
 * URL already exists in any state: queued, scanning, completed, or failed.
 */
export async function enqueueScan(input: {
  platformName: string
  url: string
  userId: string
  requirementSetId: string
}): Promise<{ id: string }> {
  const existing = await prisma.searchEvaluation.findFirst({
    where: { url: input.url },
    select: { id: true, platformName: true },
  })
  if (existing) throw new DuplicateScanError(existing.platformName)

  const created = await prisma.searchEvaluation.create({
    data: {
      platformName: input.platformName,
      url: input.url,
      status: 'QUEUED',
      createdById: input.userId,
      requirementSetId: input.requirementSetId,
    },
    select: { id: true },
  })

  kickWorker()
  return created
}

/**
 * Start draining the queue if not already running. Idempotent and safe to call
 * from any request (e.g. on every list poll) so the worker self-heals after a
 * restart. The flag is set synchronously before any await, so concurrent callers
 * on Node's single thread cannot both enter the loop.
 */
export function kickWorker(): void {
  if (processing) return
  processing = true
  void processLoop().finally(() => {
    processing = false
  })
}

async function processLoop(): Promise<void> {
  if (!recovered) {
    await recoverOrphans()
    recovered = true
  }

  // Drain until no QUEUED rows remain. A failed-but-retryable item is reset to
  // QUEUED (still the oldest), so it is picked up again on the next iteration.
  for (;;) {
    const next = await prisma.searchEvaluation.findFirst({
      where: { status: 'QUEUED' },
      orderBy: { createdAt: 'asc' },
      select: { id: true, platformName: true, url: true, attempts: true, requirementSetId: true },
    })
    if (!next) break
    await runOne(next)
  }
}

async function runOne(ev: {
  id: string
  platformName: string
  url: string
  attempts: number
  requirementSetId: string
}): Promise<void> {
  const attempt = ev.attempts + 1

  await prisma.searchEvaluation.update({
    where: { id: ev.id },
    data: { status: 'SCANNING', startedAt: new Date(), attempts: { increment: 1 } },
  })

  try {
    const questions: ScreeningQuestionInput[] = await prisma.screeningQuestion.findMany({
      where: { requirementSetId: ev.requirementSetId },
      orderBy: { num: 'asc' },
      select: { id: true, num: true, category: true, question: true, whatToLookFor: true },
    })
    if (questions.length === 0) {
      throw new Error('No screening questions exist. Seed or create screening questions first.')
    }

    let metadata: ToolScannerMetadata | null = null
    const results: ScreeningResult[] = []
    for await (const chunk of runToolScanEvaluation(ev.platformName, ev.url, questions)) {
      if (chunk.type === 'metadata') metadata = chunk.metadata
      else if (chunk.type === 'category') results.push(...chunk.results)
    }

    await prisma.$transaction([
      prisma.screeningResponse.deleteMany({ where: { evaluationId: ev.id } }),
      prisma.searchEvaluation.update({
        where: { id: ev.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          error: null,
          metadata: metadata
            ? (metadata as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          responses: {
            create: results.map((r) => ({
              questionId: r.questionId,
              answer: r.answer,
              evidence: r.evidence,
              flag: r.flag,
              notes: r.notes,
            })),
          },
        },
      }),
    ])

    // Auto-link into the ESL AI_SCREENING → CEFR → VITAL → PRD pipeline. This is
    // ESL-pipeline-specific behavior with no equivalent stage for other domains
    // yet, so it must only fire for scans run under the "esl" RequirementSet.
    // Only do this if the scan isn't already linked.
    const requirementSet = await prisma.requirementSet.findUnique({
      where: { id: ev.requirementSetId },
      select: { key: true },
    })
    if (requirementSet?.key === ESL_REQUIREMENT_SET_KEY) {
      const fresh = await prisma.searchEvaluation.findUnique({ where: { id: ev.id }, select: { platformId: true } })
      if (!fresh?.platformId) {
        const domain = (() => { try { return new URL(ev.url).hostname.replace(/^www\./, '') } catch { return ev.platformName } })()
        let platform = await prisma.platform.findFirst({ where: { name: ev.platformName }, select: { id: true } })
        if (!platform) {
          platform = await prisma.platform.create({ data: { name: ev.platformName, vendor: domain, track: 'CEFR' } })
        }
        await prisma.searchEvaluation.update({ where: { id: ev.id }, data: { platformId: platform.id } })
        await syncPlatformPipeline(platform.id).catch((err) =>
          console.error('[tool-scanner] pipeline sync failed after auto-link:', err),
        )
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during scan'

    if (attempt < MAX_ATTEMPTS) {
      // Auto-retry once: reset to QUEUED (still the oldest row) so the loop picks
      // it up again on the next iteration. Record the error for visibility.
      console.error(`[tool-scanner] scan failed (attempt ${attempt}), retrying:`, message)
      await prisma.searchEvaluation.update({
        where: { id: ev.id },
        data: { status: 'QUEUED', error: message },
      })
    } else {
      console.error(`[tool-scanner] scan failed (attempt ${attempt}), giving up:`, message)
      await prisma.searchEvaluation.update({
        where: { id: ev.id },
        data: { status: 'FAILED', completedAt: new Date(), error: message },
      })
    }
  }
}

/**
 * Reset rows left in SCANNING by a process crash/restart back to QUEUED so the
 * work resumes. Bounded by MAX_ATTEMPTS in runOne, so it cannot loop forever.
 */
async function recoverOrphans(): Promise<void> {
  const { count } = await prisma.searchEvaluation.updateMany({
    where: { status: 'SCANNING' },
    data: { status: 'QUEUED' },
  })
  if (count > 0) console.error(`[tool-scanner] recovered ${count} interrupted scan(s)`)
}
