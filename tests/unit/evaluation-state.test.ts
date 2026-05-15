import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock prisma before importing the module under test ────────────────────────

const mockTx = {
  evaluation: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  evaluatorAssignment: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  score: {
    findMany: vi.fn(),
  },
  conflictThread: {
    createMany: vi.fn(),
  },
  platform: {
    update: vi.fn(),
  },
  scoreAuditLog: {
    createMany: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn((fn: (tx: typeof mockTx) => unknown) => fn(mockTx)),
    evaluatorAssignment: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    score: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import {
  isLocked,
  canTransitionTo,
  checkAllTeamsSubmitted,
  detectConflicts,
  transitionEvaluation,
  type EvaluationSnapshot,
  type Conflict,
} from '@/lib/evaluation-state'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSnapshot(overrides: Partial<EvaluationSnapshot> = {}): EvaluationSnapshot {
  return {
    state: 'IN_PROGRESS',
    lockedAt: null,
    platformId: 'plat-1',
    assignments: [],
    conflictThreads: [],
    ...overrides,
  }
}

// Cast so we can call .mockResolvedValue on vi.fn() properties
const mockPrisma = prisma as {
  $transaction: ReturnType<typeof vi.fn>
  evaluatorAssignment: { count: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> }
  score: { findMany: ReturnType<typeof vi.fn> }
}

beforeEach(() => {
  vi.clearAllMocks()
  // Default: $transaction calls the callback with mockTx
  mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockTx) => unknown) => fn(mockTx))
})

// ─────────────────────────────────────────────────────────────────────────────
// isLocked
// ─────────────────────────────────────────────────────────────────────────────

describe('isLocked()', () => {
  it('returns false when lockedAt is null', () => {
    expect(isLocked({ lockedAt: null })).toBe(false)
  })

  it('returns true when lockedAt is a Date', () => {
    expect(isLocked({ lockedAt: new Date() })).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// canTransitionTo
// ─────────────────────────────────────────────────────────────────────────────

describe('canTransitionTo()', () => {
  describe('valid state machine paths', () => {
    it('allows IN_PROGRESS → MERGED', () => {
      expect(canTransitionTo('IN_PROGRESS', 'MERGED', makeSnapshot())).toBe(true)
    })

    it('allows MERGED → FINALISED when all threads are closed', () => {
      const snap = makeSnapshot({
        state: 'MERGED',
        conflictThreads: [{ isClosed: true }, { isClosed: true }],
      })
      expect(canTransitionTo('MERGED', 'FINALISED', snap)).toBe(true)
    })

    it('allows MERGED → FINALISED when there are no conflict threads', () => {
      const snap = makeSnapshot({ state: 'MERGED', conflictThreads: [] })
      expect(canTransitionTo('MERGED', 'FINALISED', snap)).toBe(true)
    })

    it('allows MERGED → IN_PROGRESS (reopen from MERGED)', () => {
      const snap = makeSnapshot({ state: 'MERGED' })
      expect(canTransitionTo('MERGED', 'IN_PROGRESS', snap)).toBe(true)
    })

    it('allows FINALISED → IN_PROGRESS (admin reopen)', () => {
      const snap = makeSnapshot({ state: 'FINALISED', lockedAt: new Date() })
      expect(canTransitionTo('FINALISED', 'IN_PROGRESS', snap)).toBe(true)
    })
  })

  describe('invalid state machine paths', () => {
    it('rejects IN_PROGRESS → FINALISED (must go through MERGED first)', () => {
      expect(canTransitionTo('IN_PROGRESS', 'FINALISED', makeSnapshot())).toBe(false)
    })

    it('rejects IN_PROGRESS → IN_PROGRESS (no self-loop)', () => {
      expect(canTransitionTo('IN_PROGRESS', 'IN_PROGRESS', makeSnapshot())).toBe(false)
    })

    it('rejects FINALISED → MERGED', () => {
      const snap = makeSnapshot({ state: 'FINALISED', lockedAt: new Date() })
      expect(canTransitionTo('FINALISED', 'MERGED', snap)).toBe(false)
    })

    it('rejects FINALISED → FINALISED', () => {
      const snap = makeSnapshot({ state: 'FINALISED', lockedAt: new Date() })
      expect(canTransitionTo('FINALISED', 'FINALISED', snap)).toBe(false)
    })
  })

  describe('MERGED → FINALISED thread guard', () => {
    it('rejects when any thread is still open', () => {
      const snap = makeSnapshot({
        state: 'MERGED',
        conflictThreads: [{ isClosed: true }, { isClosed: false }],
      })
      expect(canTransitionTo('MERGED', 'FINALISED', snap)).toBe(false)
    })

    it('rejects when all threads are open', () => {
      const snap = makeSnapshot({
        state: 'MERGED',
        conflictThreads: [{ isClosed: false }, { isClosed: false }],
      })
      expect(canTransitionTo('MERGED', 'FINALISED', snap)).toBe(false)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// checkAllTeamsSubmitted
// ─────────────────────────────────────────────────────────────────────────────

describe('checkAllTeamsSubmitted()', () => {
  it('returns true when all evaluators have submitted (count = 0)', async () => {
    mockPrisma.evaluatorAssignment.count.mockResolvedValue(0)
    const result = await checkAllTeamsSubmitted('eval-1')
    expect(result).toBe(true)
    expect(mockPrisma.evaluatorAssignment.count).toHaveBeenCalledWith({
      where: { evaluationId: 'eval-1', hasSubmitted: false },
    })
  })

  it('returns false when one or more evaluators have not submitted', async () => {
    mockPrisma.evaluatorAssignment.count.mockResolvedValue(2)
    expect(await checkAllTeamsSubmitted('eval-1')).toBe(false)
  })

  it('returns false when exactly one evaluator has not submitted', async () => {
    mockPrisma.evaluatorAssignment.count.mockResolvedValue(1)
    expect(await checkAllTeamsSubmitted('eval-1')).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// detectConflicts
// ─────────────────────────────────────────────────────────────────────────────

// Each requirement is owned exclusively by one evaluatorType.
// Conflicts arise when ≥2 evaluators on the same team disagree by more than 1 point
// (intra-team bias detection). Cross-team comparison is irrelevant because teams score
// different requirements.
describe('detectConflicts()', () => {
  function makeScore(
    requirementId: string,
    userId: string,
    value: number | null,
    title = 'Req Title',
  ) {
    return { requirementId, userId, value, requirement: { title } }
  }

  function makeAssignment(userId: string, evaluatorType: 'PEDAGOGY' | 'TECHNICAL' | 'COMPLIANCE') {
    return { userId, evaluatorType }
  }

  beforeEach(() => {
    mockPrisma.score.findMany.mockResolvedValue([])
    mockPrisma.evaluatorAssignment.findMany.mockResolvedValue([])
  })

  it('returns empty array when there are no scores', async () => {
    expect(await detectConflicts('eval-1')).toEqual([])
  })

  it('returns empty array when only one evaluator has scored (no disagreement possible)', async () => {
    mockPrisma.score.findMany.mockResolvedValue([
      makeScore('req-1', 'u-ped-1', 3),
    ])
    mockPrisma.evaluatorAssignment.findMany.mockResolvedValue([
      makeAssignment('u-ped-1', 'PEDAGOGY'),
    ])
    expect(await detectConflicts('eval-1')).toEqual([])
  })

  it('detects a conflict when diff is exactly 1', async () => {
    mockPrisma.score.findMany.mockResolvedValue([
      makeScore('req-1', 'u-ped-1', 3),
      makeScore('req-1', 'u-ped-2', 2),
    ])
    mockPrisma.evaluatorAssignment.findMany.mockResolvedValue([
      makeAssignment('u-ped-1', 'PEDAGOGY'),
      makeAssignment('u-ped-2', 'PEDAGOGY'),
    ])
    const conflicts = await detectConflicts('eval-1')
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].maxDiff).toBe(1)
  })

  it('detects an intra-team conflict when two PEDAGOGY evaluators differ by 2', async () => {
    mockPrisma.score.findMany.mockResolvedValue([
      makeScore('req-1', 'u-ped-1', 3, 'Curriculum Alignment'),
      makeScore('req-1', 'u-ped-2', 1, 'Curriculum Alignment'),
    ])
    mockPrisma.evaluatorAssignment.findMany.mockResolvedValue([
      makeAssignment('u-ped-1', 'PEDAGOGY'),
      makeAssignment('u-ped-2', 'PEDAGOGY'),
    ])
    const conflicts = await detectConflicts('eval-1')
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]).toMatchObject<Partial<Conflict>>({
      requirementId: 'req-1',
      requirementTitle: 'Curriculum Alignment',
      evaluatorType: 'PEDAGOGY',
      maxDiff: 2,
    })
    expect(conflicts[0].scores).toEqual(expect.arrayContaining([3, 1]))
  })

  it('detects an intra-team conflict when two TECHNICAL evaluators differ by 3', async () => {
    mockPrisma.score.findMany.mockResolvedValue([
      makeScore('req-1', 'u-tech-1', 3),
      makeScore('req-1', 'u-tech-2', 0),
    ])
    mockPrisma.evaluatorAssignment.findMany.mockResolvedValue([
      makeAssignment('u-tech-1', 'TECHNICAL'),
      makeAssignment('u-tech-2', 'TECHNICAL'),
    ])
    const conflicts = await detectConflicts('eval-1')
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].evaluatorType).toBe('TECHNICAL')
    expect(conflicts[0].maxDiff).toBe(3)
  })

  it('skips N/A (null) scores — they have no numeric position', async () => {
    mockPrisma.score.findMany.mockResolvedValue([
      makeScore('req-1', 'u-ped-1', null),
      makeScore('req-1', 'u-ped-2', 3),
    ])
    mockPrisma.evaluatorAssignment.findMany.mockResolvedValue([
      makeAssignment('u-ped-1', 'PEDAGOGY'),
      makeAssignment('u-ped-2', 'PEDAGOGY'),
    ])
    // Only one non-null score — no disagreement possible
    expect(await detectConflicts('eval-1')).toEqual([])
  })

  it('handles multiple requirements and returns all with any score difference', async () => {
    mockPrisma.score.findMany.mockResolvedValue([
      makeScore('req-1', 'u-ped-1', 3, 'A'), // diff 2 → conflict
      makeScore('req-1', 'u-ped-2', 1, 'A'),
      makeScore('req-2', 'u-tech-1', 2, 'B'), // diff 1 → conflict
      makeScore('req-2', 'u-tech-2', 1, 'B'),
      makeScore('req-3', 'u-ped-1', 2, 'A'), // diff 0 → no conflict
      makeScore('req-3', 'u-ped-2', 2, 'A'),
    ])
    mockPrisma.evaluatorAssignment.findMany.mockResolvedValue([
      makeAssignment('u-ped-1', 'PEDAGOGY'),
      makeAssignment('u-ped-2', 'PEDAGOGY'),
      makeAssignment('u-tech-1', 'TECHNICAL'),
      makeAssignment('u-tech-2', 'TECHNICAL'),
    ])
    const conflicts = await detectConflicts('eval-1')
    expect(conflicts).toHaveLength(2)
    expect(conflicts.map(c => c.requirementId)).toEqual(expect.arrayContaining(['req-1', 'req-2']))
  })

  it('takes the worst-case diff across three evaluators on the same team', async () => {
    mockPrisma.score.findMany.mockResolvedValue([
      makeScore('req-1', 'u-ped-1', 3),
      makeScore('req-1', 'u-ped-2', 2),
      makeScore('req-1', 'u-ped-3', 0),
    ])
    mockPrisma.evaluatorAssignment.findMany.mockResolvedValue([
      makeAssignment('u-ped-1', 'PEDAGOGY'),
      makeAssignment('u-ped-2', 'PEDAGOGY'),
      makeAssignment('u-ped-3', 'PEDAGOGY'),
    ])
    const conflicts = await detectConflicts('eval-1')
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].maxDiff).toBe(3) // max(3,2,0) - min(3,2,0) = 3
    expect(conflicts[0].scores).toEqual(expect.arrayContaining([3, 2, 0]))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// transitionEvaluation
// ─────────────────────────────────────────────────────────────────────────────

describe('transitionEvaluation()', () => {
  function makeDbEvaluation(overrides: object = {}) {
    return {
      id: 'eval-1',
      platformId: 'plat-1',
      state: 'IN_PROGRESS' as const,
      lockedAt: null,
      assignments: [],
      conflictThreads: [],
      ...overrides,
    }
  }

  describe('NOT_FOUND', () => {
    it('returns NOT_FOUND when evaluation does not exist', async () => {
      mockTx.evaluation.findUnique.mockResolvedValue(null)
      const result = await transitionEvaluation('missing', 'MERGED', 'admin-1')
      expect(result).toMatchObject({ ok: false, error: 'NOT_FOUND' })
    })
  })

  describe('WRONG_STATE', () => {
    it('returns WRONG_STATE for invalid transitions (IN_PROGRESS → FINALISED)', async () => {
      mockTx.evaluation.findUnique.mockResolvedValue(makeDbEvaluation())
      const result = await transitionEvaluation('eval-1', 'FINALISED', 'admin-1')
      expect(result).toMatchObject({ ok: false, error: 'WRONG_STATE' })
    })

    it('returns WRONG_STATE when trying to re-merge an already MERGED evaluation', async () => {
      mockTx.evaluation.findUnique.mockResolvedValue(
        makeDbEvaluation({ state: 'MERGED', conflictThreads: [] }),
      )
      const result = await transitionEvaluation('eval-1', 'MERGED', 'admin-1')
      expect(result).toMatchObject({ ok: false, error: 'WRONG_STATE' })
    })
  })

  describe('IN_PROGRESS → MERGED', () => {
    it('returns NOT_ALL_SUBMITTED when some evaluators have not submitted', async () => {
      mockTx.evaluation.findUnique.mockResolvedValue(
        makeDbEvaluation({
          assignments: [{ userId: 'u-1', hasSubmitted: false, evaluatorType: 'PEDAGOGY' }],
        }),
      )
      const result = await transitionEvaluation('eval-1', 'MERGED', 'admin-1')
      expect(result).toMatchObject({ ok: false, error: 'NOT_ALL_SUBMITTED' })
    })

    it('succeeds when all evaluators have submitted and there are no conflicts', async () => {
      mockTx.evaluation.findUnique.mockResolvedValue(
        makeDbEvaluation({
          assignments: [
            { userId: 'u-ped', hasSubmitted: true, evaluatorType: 'PEDAGOGY' },
            { userId: 'u-tech', hasSubmitted: true, evaluatorType: 'TECHNICAL' },
          ],
        }),
      )
      // Compliance: no FAIL scores on gate items
      mockTx.evaluatorAssignment.findMany.mockResolvedValue([
        { userId: 'u-ped' },
        { userId: 'u-tech' },
      ])
      mockTx.score.findMany
        // First call: compliance gate check (scores with value=0)
        .mockResolvedValueOnce([])
        // Second call: detectConflictsWithTx (all scores)
        .mockResolvedValueOnce([])

      mockTx.evaluation.update.mockResolvedValue({})
      mockTx.conflictThread.createMany.mockResolvedValue({ count: 0 })

      const result = await transitionEvaluation('eval-1', 'MERGED', 'admin-1')
      expect(result).toMatchObject({ ok: true, conflictCount: 0 })
      expect(mockTx.evaluation.update).toHaveBeenCalledWith({
        where: { id: 'eval-1' },
        data: { state: 'MERGED' },
      })
    })

    it('creates ConflictThread rows when two evaluators on the same team differ by more than 1', async () => {
      mockTx.evaluation.findUnique.mockResolvedValue(
        makeDbEvaluation({
          assignments: [
            { userId: 'u-ped-1', hasSubmitted: true, evaluatorType: 'PEDAGOGY' },
            { userId: 'u-ped-2', hasSubmitted: true, evaluatorType: 'PEDAGOGY' },
          ],
        }),
      )
      mockTx.evaluatorAssignment.findMany
        // compliance gate check
        .mockResolvedValueOnce([{ userId: 'u-ped-1' }, { userId: 'u-ped-2' }])
        // detectConflictsWithTx assignments
        .mockResolvedValueOnce([
          { userId: 'u-ped-1', evaluatorType: 'PEDAGOGY' },
          { userId: 'u-ped-2', evaluatorType: 'PEDAGOGY' },
        ])

      mockTx.score.findMany
        // compliance gate FAIL scores (none)
        .mockResolvedValueOnce([])
        // all scores for conflict detection — two PEDAGOGY evaluators disagree by 2
        .mockResolvedValueOnce([
          { requirementId: 'req-1', userId: 'u-ped-1', value: 3, requirement: { title: 'Curriculum' } },
          { requirementId: 'req-1', userId: 'u-ped-2', value: 1, requirement: { title: 'Curriculum' } },
        ])

      mockTx.conflictThread.createMany.mockResolvedValue({ count: 1 })
      mockTx.evaluation.update.mockResolvedValue({})

      const result = await transitionEvaluation('eval-1', 'MERGED', 'admin-1')
      expect(result).toMatchObject({ ok: true, conflictCount: 1 })
      expect(mockTx.conflictThread.createMany).toHaveBeenCalledWith({
        data: [{ evaluationId: 'eval-1', requirementId: 'req-1', isClosed: false }],
        skipDuplicates: true,
      })
    })

    it('disqualifies the platform when a compliance gate requirement has a FAIL score', async () => {
      mockTx.evaluation.findUnique.mockResolvedValue(
        makeDbEvaluation({
          assignments: [{ userId: 'u-ped', hasSubmitted: true, evaluatorType: 'PEDAGOGY' }],
        }),
      )
      // Submitted users for compliance check
      mockTx.evaluatorAssignment.findMany.mockResolvedValueOnce([{ userId: 'u-ped' }])
      // FAIL score on a gate requirement
      mockTx.score.findMany.mockResolvedValueOnce([
        {
          requirementId: 'req-gate',
          requirement: { title: 'Mandatory Compliance Item' },
        },
      ])
      mockTx.platform.update.mockResolvedValue({})
      mockTx.evaluation.update.mockResolvedValue({})

      const result = await transitionEvaluation('eval-1', 'MERGED', 'admin-1')

      expect(result).toMatchObject({ ok: true })
      expect((result as { ok: true; complianceResult: { passed: boolean } }).complianceResult.passed).toBe(false)
      expect(mockTx.platform.update).toHaveBeenCalledWith({
        where: { id: 'plat-1' },
        data: { status: 'DISQUALIFIED' },
      })
    })
  })

  describe('MERGED → FINALISED', () => {
    it('succeeds when all threads are closed', async () => {
      mockTx.evaluation.findUnique.mockResolvedValue(
        makeDbEvaluation({
          state: 'MERGED',
          conflictThreads: [{ isClosed: true }, { isClosed: true }],
        }),
      )
      mockTx.evaluation.update.mockResolvedValue({})

      const result = await transitionEvaluation('eval-1', 'FINALISED', 'admin-1')
      expect(result).toMatchObject({ ok: true })
      expect(mockTx.evaluation.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ state: 'FINALISED' }) }),
      )
      // lockedAt must be set
      const call = mockTx.evaluation.update.mock.calls[0][0]
      expect(call.data.lockedAt).toBeInstanceOf(Date)
    })

    it('returns OPEN_THREADS when one thread is still open', async () => {
      mockTx.evaluation.findUnique.mockResolvedValue(
        makeDbEvaluation({
          state: 'MERGED',
          conflictThreads: [{ isClosed: true }, { isClosed: false }],
        }),
      )
      const result = await transitionEvaluation('eval-1', 'FINALISED', 'admin-1')
      expect(result).toMatchObject({ ok: false, error: 'OPEN_THREADS' })
      expect((result as { ok: false; message: string }).message).toMatch('1 conflict thread(s)')
    })

    it('returns OPEN_THREADS with correct count when multiple threads are open', async () => {
      mockTx.evaluation.findUnique.mockResolvedValue(
        makeDbEvaluation({
          state: 'MERGED',
          conflictThreads: [{ isClosed: false }, { isClosed: false }, { isClosed: false }],
        }),
      )
      const result = await transitionEvaluation('eval-1', 'FINALISED', 'admin-1')
      expect(result).toMatchObject({ ok: false, error: 'OPEN_THREADS' })
      expect((result as { ok: false; message: string }).message).toMatch('3 conflict thread(s)')
    })
  })

  describe('FINALISED → IN_PROGRESS (admin reopen)', () => {
    it('clears lockedAt and resets state to IN_PROGRESS', async () => {
      mockTx.evaluation.findUnique.mockResolvedValue(
        makeDbEvaluation({ state: 'FINALISED', lockedAt: new Date() }),
      )
      mockTx.score.findMany.mockResolvedValue([])
      mockTx.evaluation.update.mockResolvedValue({})

      const result = await transitionEvaluation('eval-1', 'IN_PROGRESS', 'admin-1')
      expect(result).toMatchObject({ ok: true })
      expect(mockTx.evaluation.update).toHaveBeenCalledWith({
        where: { id: 'eval-1' },
        data: { state: 'IN_PROGRESS', lockedAt: null },
      })
    })

    it('creates a ScoreAuditLog entry for every existing score', async () => {
      mockTx.evaluation.findUnique.mockResolvedValue(
        makeDbEvaluation({ state: 'FINALISED', lockedAt: new Date() }),
      )
      mockTx.score.findMany.mockResolvedValue([
        { id: 'score-1', value: 4, evidenceType: 'TRIAL', comment: 'Good' },
        { id: 'score-2', value: 3, evidenceType: 'DEMO', comment: null },
      ])
      mockTx.scoreAuditLog.createMany.mockResolvedValue({ count: 2 })
      mockTx.evaluation.update.mockResolvedValue({})

      await transitionEvaluation('eval-1', 'IN_PROGRESS', 'admin-1')

      expect(mockTx.scoreAuditLog.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            scoreId: 'score-1',
            changedById: 'admin-1',
            reason: 'EVALUATION_REOPENED',
          }),
          expect.objectContaining({
            scoreId: 'score-2',
            changedById: 'admin-1',
            reason: 'EVALUATION_REOPENED',
          }),
        ]),
      })
    })

    it('skips scoreAuditLog creation when there are no existing scores', async () => {
      mockTx.evaluation.findUnique.mockResolvedValue(
        makeDbEvaluation({ state: 'FINALISED', lockedAt: new Date() }),
      )
      mockTx.score.findMany.mockResolvedValue([])
      mockTx.evaluation.update.mockResolvedValue({})

      await transitionEvaluation('eval-1', 'IN_PROGRESS', 'admin-1')
      expect(mockTx.scoreAuditLog.createMany).not.toHaveBeenCalled()
    })
  })
})
