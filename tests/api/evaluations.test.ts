import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks must be declared before imports ────────────────────────────────────

// Transaction mock tx: used by scores POST (first-time creation path)
const mockTx = {
  score: { create: vi.fn() },
  scoreAuditLog: { create: vi.fn() },
}

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: typeof mockTx) => unknown) =>
      typeof fn === 'function' ? fn(mockTx) : fn,
    ),
    evaluation: {
      findUnique: vi.fn(),
    },
    evaluatorAssignment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    requirement: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    score: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    scoreAuditLog: {
      create: vi.fn(),
    },
    platform: {
      update: vi.fn(),
    },
    conflictThread: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

// Mock score-service so updateScore doesn't spin up a real transaction
vi.mock('@/lib/score-service', () => ({
  updateScore: vi.fn(),
}))

// Mock evaluation-state so transition logic is tested separately in unit tests
vi.mock('@/lib/evaluation-state', () => ({
  checkAllTeamsSubmitted: vi.fn(),
  transitionEvaluation: vi.fn(),
}))

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { updateScore } from '@/lib/score-service'
import { checkAllTeamsSubmitted, transitionEvaluation } from '@/lib/evaluation-state'

import {
  GET as scoresGET,
  POST as scoresPOST,
} from '@/app/api/evaluations/[id]/scores/route'
import { POST as submitPOST } from '@/app/api/evaluations/[id]/submit/route'
import { POST as mergePOST } from '@/app/api/evaluations/[id]/merge/route'
import { POST as finalisePOST } from '@/app/api/evaluations/[id]/finalise/route'

// ─── Typed mock helpers ───────────────────────────────────────────────────────

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockUpdateScore = updateScore as ReturnType<typeof vi.fn>
const mockCheckAllTeamsSubmitted = checkAllTeamsSubmitted as ReturnType<typeof vi.fn>
const mockTransitionEvaluation = transitionEvaluation as ReturnType<typeof vi.fn>

const db = prisma as {
  $transaction: ReturnType<typeof vi.fn>
  evaluation: { findUnique: ReturnType<typeof vi.fn> }
  evaluatorAssignment: {
    findUnique: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    count: ReturnType<typeof vi.fn>
  }
  requirement: {
    findMany: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
  }
  score: {
    findUnique: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
  }
  scoreAuditLog: { create: ReturnType<typeof vi.fn> }
  platform: { update: ReturnType<typeof vi.fn> }
  conflictThread: { findMany: ReturnType<typeof vi.fn> }
}

// ─── Session fixtures ─────────────────────────────────────────────────────────

const sessions = {
  admin: {
    user: { id: 'u-admin', name: 'Admin', role: 'ADMIN' as const },
  },
  pedagogy1: {
    user: { id: 'u-ped-1', name: 'Alice', role: 'PEDAGOGY_EVALUATOR' as const },
  },
  pedagogy2: {
    user: { id: 'u-ped-2', name: 'Bob', role: 'PEDAGOGY_EVALUATOR' as const },
  },
  technical1: {
    user: { id: 'u-tech-1', name: 'Charlie', role: 'TECHNICAL_EVALUATOR' as const },
  },
  viewer: {
    user: { id: 'u-viewer', name: 'Viewer', role: 'VIEWER' as const },
  },
}

// ─── Data fixtures ────────────────────────────────────────────────────────────

const EVAL_IN_PROGRESS = {
  id: 'eval-1',
  state: 'IN_PROGRESS' as const,
  lockedAt: null,
  platformId: 'plat-1',
}

const EVAL_MERGED = {
  id: 'eval-1',
  state: 'MERGED' as const,
  lockedAt: null,
  platformId: 'plat-1',
}

const EVAL_FINALISED = {
  id: 'eval-1',
  state: 'FINALISED' as const,
  lockedAt: new Date('2024-01-15'),
  platformId: 'plat-1',
}

const PEDAGOGY_REQUIREMENT = {
  id: 'req-ped-1',
  title: 'Curriculum Alignment',
  description: 'Maps to curriculum.',
  evaluatorType: 'PEDAGOGY' as const,
  weight: 'HIGH',
  isComplianceGate: false,
  category: 'Pedagogy',
  order: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const TECHNICAL_REQUIREMENT = {
  id: 'req-tech-1',
  title: 'API Security',
  description: 'Secure API endpoints.',
  evaluatorType: 'TECHNICAL' as const,
  weight: 'HIGH',
  isComplianceGate: false,
  category: 'Technical',
  order: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const GATE_REQUIREMENT = {
  id: 'req-gate-1',
  title: 'Data Protection',
  description: 'GDPR compliance.',
  evaluatorType: 'PEDAGOGY' as const,
  weight: 'HIGH',
  isComplianceGate: true,
  category: 'Compliance',
  order: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const PEDAGOGY_ASSIGNMENT = {
  id: 'assign-ped-1',
  evaluatorType: 'PEDAGOGY' as const,
  hasSubmitted: false,
  submittedAt: null,
}

const TECHNICAL_ASSIGNMENT = {
  id: 'assign-tech-1',
  evaluatorType: 'TECHNICAL' as const,
  hasSubmitted: false,
  submittedAt: null,
}

// ─── Route helpers ────────────────────────────────────────────────────────────

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

function makeRequest(method = 'GET', body?: unknown) {
  return new Request('http://localhost/test', {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  // Default: transaction calls the callback
  db.$transaction.mockImplementation(async (fn: (tx: typeof mockTx) => unknown) => {
    if (typeof fn === 'function') return fn(mockTx)
    return fn
  })
  // Default: transition returns ok
  mockTransitionEvaluation.mockResolvedValue({ ok: true, conflictCount: 0 })
  // Default: not all submitted
  mockCheckAllTeamsSubmitted.mockResolvedValue(false)
  // Default: mockTx score.create returns a new score
  mockTx.score.create.mockResolvedValue({
    id: 'score-new',
    evaluationId: 'eval-1',
    requirementId: 'req-ped-1',
    userId: 'u-ped-1',
    value: 2,
    evidenceType: null,
    comment: null,
  })
  mockTx.scoreAuditLog.create.mockResolvedValue({})
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/evaluations/[id]/scores: Score isolation
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/evaluations/[id]/scores', () => {
  describe('Score isolation during IN_PROGRESS', () => {
    // Sets up the IN_PROGRESS branch: evaluation + assignment + scoped data
    function setupBranchA(
      session: typeof sessions.pedagogy1,
      assignment: typeof PEDAGOGY_ASSIGNMENT,
      requirements: typeof PEDAGOGY_REQUIREMENT[],
      ownScores: object[],
    ) {
      mockAuth.mockResolvedValueOnce(session)
      db.evaluation.findUnique.mockResolvedValueOnce(EVAL_IN_PROGRESS)
      db.evaluatorAssignment.findUnique.mockResolvedValueOnce(assignment)
      db.requirement.findMany.mockResolvedValueOnce(requirements)
      db.score.findMany.mockResolvedValueOnce(ownScores)
    }

    // ── Test 1 ──────────────────────────────────────────────────────────────
    it('PEDAGOGY_EVALUATOR only receives PEDAGOGY requirements and own scores', async () => {
      const ownScore = {
        id: 'score-1',
        requirementId: 'req-ped-1',
        value: 2,
        evidenceType: null,
        comment: null,
      }
      setupBranchA(sessions.pedagogy1, PEDAGOGY_ASSIGNMENT, [PEDAGOGY_REQUIREMENT], [ownScore])

      const res = await scoresGET(makeRequest(), makeParams('eval-1'))
      const body = await res.json()

      expect(res.status).toBe(200)
      // Only PEDAGOGY requirements returned
      expect(body.requirements).toHaveLength(1)
      expect(body.requirements[0].evaluatorType).toBe('PEDAGOGY')
      // Own scores only (no other users)
      expect(body.ownScores).toHaveLength(1)
      expect(body.ownScores[0].requirementId).toBe('req-ped-1')

      // The requirement query must have been called with evaluatorType filter
      expect(db.requirement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { evaluatorType: 'PEDAGOGY' },
        }),
      )
      // The score query must include userId isolation
      expect(db.score.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'u-ped-1' }),
        }),
      )
    })

    // ── Test 2 ──────────────────────────────────────────────────────────────
    it('TECHNICAL_EVALUATOR only receives TECHNICAL requirements and own scores', async () => {
      const ownScore = {
        id: 'score-t1',
        requirementId: 'req-tech-1',
        value: 3,
        evidenceType: 'TRIAL',
        comment: null,
      }
      setupBranchA(sessions.technical1, TECHNICAL_ASSIGNMENT, [TECHNICAL_REQUIREMENT], [ownScore])

      const res = await scoresGET(makeRequest(), makeParams('eval-1'))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.requirements).toHaveLength(1)
      expect(body.requirements[0].evaluatorType).toBe('TECHNICAL')
      expect(body.ownScores).toHaveLength(1)

      expect(db.requirement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { evaluatorType: 'TECHNICAL' } }),
      )
      expect(db.score.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'u-tech-1' }),
        }),
      )
    })

    it('a PEDAGOGY_EVALUATOR score query never includes a TECHNICAL score row', async () => {
      // Even if the DB somehow returned a TECHNICAL score (it won't), we verify
      // the WHERE clause enforces userId isolation at the call level.
      setupBranchA(sessions.pedagogy1, PEDAGOGY_ASSIGNMENT, [PEDAGOGY_REQUIREMENT], [])

      await scoresGET(makeRequest(), makeParams('eval-1'))

      const scoreCall = db.score.findMany.mock.calls[0][0]
      // Must contain userId: current user only, no wildcard
      expect(scoreCall.where.userId).toBe('u-ped-1')
      // Must NOT omit userId (which would expose all rows)
      expect(Object.keys(scoreCall.where)).toContain('userId')
    })
  })

  // ── Test 3: Both teams' scores visible after MERGED ──────────────────────
  describe('Cross-team visibility after MERGED', () => {
    function setupBranchB(
      session: typeof sessions.admin,
      allScores: object[],
      threads: object[] = [],
    ) {
      mockAuth.mockResolvedValueOnce(session)
      db.evaluation.findUnique.mockResolvedValueOnce(EVAL_MERGED)
      db.requirement.findMany.mockResolvedValueOnce([PEDAGOGY_REQUIREMENT, TECHNICAL_REQUIREMENT])
      db.score.findMany.mockResolvedValueOnce(allScores)
      db.evaluatorAssignment.findMany.mockResolvedValueOnce([
        { userId: 'u-ped-1', evaluatorType: 'PEDAGOGY' },
        { userId: 'u-tech-1', evaluatorType: 'TECHNICAL' },
      ])
      db.conflictThread.findMany.mockResolvedValueOnce(threads)
    }

    it('admin sees all evaluator scores in MERGED state', async () => {
      const allScores = [
        {
          id: 'score-p1',
          requirementId: 'req-ped-1',
          value: 3,
          evidenceType: null,
          comment: null,
          userId: 'u-ped-1',
          user: { id: 'u-ped-1', name: 'Alice', role: 'PEDAGOGY_EVALUATOR' },
        },
        {
          id: 'score-t1',
          requirementId: 'req-tech-1',
          value: 1,
          evidenceType: 'DEMO',
          comment: 'Needs work',
          userId: 'u-tech-1',
          user: { id: 'u-tech-1', name: 'Charlie', role: 'TECHNICAL_EVALUATOR' },
        },
      ]
      setupBranchB(sessions.admin, allScores)

      const res = await scoresGET(makeRequest(), makeParams('eval-1'))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.state).toBe('MERGED')
      // Both requirements and all scores present
      expect(body.requirements).toHaveLength(2)
      expect(body.crossTeamScores).toHaveLength(2)
      // Score query must NOT have a userId filter
      const scoreCall = db.score.findMany.mock.calls[0][0]
      expect(scoreCall.where).not.toHaveProperty('userId')
    })

    it('PEDAGOGY_EVALUATOR can see all scores after MERGED (intra-team conflict resolution)', async () => {
      const allScores = [
        {
          id: 'score-p1',
          requirementId: 'req-ped-1',
          value: 3,
          evidenceType: null,
          comment: null,
          userId: 'u-ped-1',
          user: { id: 'u-ped-1', name: 'Alice', role: 'PEDAGOGY_EVALUATOR' },
        },
        {
          id: 'score-p2',
          requirementId: 'req-ped-1',
          value: 1,
          evidenceType: null,
          comment: null,
          userId: 'u-ped-2',
          user: { id: 'u-ped-2', name: 'Bob', role: 'PEDAGOGY_EVALUATOR' },
        },
      ]
      // PEDAGOGY evaluator accessing MERGED state
      mockAuth.mockResolvedValueOnce(sessions.pedagogy1)
      db.evaluation.findUnique.mockResolvedValueOnce(EVAL_MERGED)
      db.requirement.findMany.mockResolvedValueOnce([PEDAGOGY_REQUIREMENT])
      db.score.findMany.mockResolvedValueOnce(allScores)
      db.evaluatorAssignment.findMany.mockResolvedValueOnce([
        { userId: 'u-ped-1', evaluatorType: 'PEDAGOGY' },
        { userId: 'u-ped-2', evaluatorType: 'PEDAGOGY' },
      ])
      db.conflictThread.findMany.mockResolvedValueOnce([])

      const res = await scoresGET(makeRequest(), makeParams('eval-1'))
      const body = await res.json()

      expect(res.status).toBe(200)
      // Both PEDAGOGY scores are visible for conflict resolution
      const reqEntry = body.crossTeamScores.find(
        (r: { requirementId: string }) => r.requirementId === 'req-ped-1',
      )
      expect(reqEntry.scores).toHaveLength(2)
    })

    it('VIEWER is blocked from MERGED state with 403', async () => {
      mockAuth.mockResolvedValueOnce(sessions.viewer)
      db.evaluation.findUnique.mockResolvedValueOnce(EVAL_MERGED)

      const res = await scoresGET(makeRequest(), makeParams('eval-1'))

      expect(res.status).toBe(403)
    })
  })

  describe('Error cases', () => {
    it('returns 401 when unauthenticated', async () => {
      mockAuth.mockResolvedValueOnce(null)
      const res = await scoresGET(makeRequest(), makeParams('eval-1'))
      expect(res.status).toBe(401)
    })

    it('returns 404 when evaluation does not exist', async () => {
      mockAuth.mockResolvedValueOnce(sessions.admin)
      db.evaluation.findUnique.mockResolvedValueOnce(null)
      const res = await scoresGET(makeRequest(), makeParams('eval-1'))
      expect(res.status).toBe(404)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/evaluations/[id]/scores: Score submission
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/evaluations/[id]/scores', () => {
  // Sets up the happy-path guards for a PEDAGOGY evaluator submitting a new score
  function setupNewScore(overrides: {
    evaluation?: object
    assignment?: object
    requirement?: object
    existingScore?: object | null
  } = {}) {
    db.evaluation.findUnique.mockResolvedValueOnce(overrides.evaluation ?? EVAL_IN_PROGRESS)
    db.evaluatorAssignment.findUnique.mockResolvedValueOnce(
      overrides.assignment ?? PEDAGOGY_ASSIGNMENT,
    )
    db.requirement.findUnique.mockResolvedValueOnce(
      overrides.requirement ?? PEDAGOGY_REQUIREMENT,
    )
    db.score.findUnique.mockResolvedValueOnce(overrides.existingScore ?? null)
  }

  // ── Test 5: FINALISED evaluation locked ───────────────────────────────────
  it('returns 403 EVALUATION_LOCKED when evaluation is finalised (lockedAt set)', async () => {
    mockAuth.mockResolvedValueOnce(sessions.pedagogy1)
    db.evaluation.findUnique.mockResolvedValueOnce(EVAL_FINALISED)

    const res = await scoresPOST(
      makeRequest('POST', { requirementId: 'req-ped-1', value: 2 }),
      makeParams('eval-1'),
    )
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.code).toBe('EVALUATION_LOCKED')
    // No mutations must have occurred
    expect(db.$transaction).not.toHaveBeenCalled()
    expect(mockUpdateScore).not.toHaveBeenCalled()
  })

  it('returns 403 NOT_ASSIGNED when user has no assignment', async () => {
    mockAuth.mockResolvedValueOnce(sessions.pedagogy1)
    db.evaluation.findUnique.mockResolvedValueOnce(EVAL_IN_PROGRESS)
    db.evaluatorAssignment.findUnique.mockResolvedValueOnce(null)

    const res = await scoresPOST(
      makeRequest('POST', { requirementId: 'req-ped-1', value: 2 }),
      makeParams('eval-1'),
    )
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.code).toBe('NOT_ASSIGNED')
  })

  it('returns 403 WRONG_EVALUATOR_TYPE when requirement type does not match assignment', async () => {
    mockAuth.mockResolvedValueOnce(sessions.pedagogy1)
    db.evaluation.findUnique.mockResolvedValueOnce(EVAL_IN_PROGRESS)
    // PEDAGOGY evaluator is assigned
    db.evaluatorAssignment.findUnique.mockResolvedValueOnce(PEDAGOGY_ASSIGNMENT)
    // But tries to submit for a TECHNICAL requirement
    db.requirement.findUnique.mockResolvedValueOnce(TECHNICAL_REQUIREMENT)

    const res = await scoresPOST(
      makeRequest('POST', { requirementId: 'req-tech-1', value: 2 }),
      makeParams('eval-1'),
    )
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.code).toBe('WRONG_EVALUATOR_TYPE')
  })

  it('returns 400 for an out-of-range score value', async () => {
    mockAuth.mockResolvedValueOnce(sessions.pedagogy1)

    const res = await scoresPOST(
      makeRequest('POST', { requirementId: 'req-ped-1', value: 99 }),
      makeParams('eval-1'),
    )

    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  // ── Test 6: ScoreAuditLog on first-time creation ──────────────────────────
  it('creates score and ScoreAuditLog atomically in the same transaction (first submission)', async () => {
    mockAuth.mockResolvedValueOnce(sessions.pedagogy1)
    setupNewScore()  // existingScore = null → transaction branch

    const res = await scoresPOST(
      makeRequest('POST', { requirementId: 'req-ped-1', value: 2 }),
      makeParams('eval-1'),
    )

    expect(res.status).toBe(201)
    // Transaction must have been called
    expect(db.$transaction).toHaveBeenCalled()
    // Score creation inside transaction
    expect(mockTx.score.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          evaluationId: 'eval-1',
          requirementId: 'req-ped-1',
          userId: 'u-ped-1',
          value: 2,
        }),
      }),
    )
    // ScoreAuditLog must be created in the same transaction
    expect(mockTx.scoreAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          changedById: 'u-ped-1',
          previousValue: null,
          newValue: 2,
        }),
      }),
    )
  })

  // ── Test 6 continued: ScoreAuditLog on update ─────────────────────────────
  it('calls updateScore (which writes ScoreAuditLog) when a score already exists', async () => {
    mockAuth.mockResolvedValueOnce(sessions.pedagogy1)
    const existingScore = { id: 'score-existing' }
    setupNewScore({ existingScore })
    mockUpdateScore.mockResolvedValueOnce({
      id: 'score-existing',
      value: 3,
      evidenceType: null,
      comment: null,
    })

    const res = await scoresPOST(
      makeRequest('POST', { requirementId: 'req-ped-1', value: 3 }),
      makeParams('eval-1'),
    )

    expect(res.status).toBe(200)
    expect(mockUpdateScore).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        scoreId: 'score-existing',
        changedById: 'u-ped-1',
        newValue: 3,
      }),
    )
    // Direct $transaction path must NOT be taken (updateScore handles its own transaction)
    expect(mockTx.score.create).not.toHaveBeenCalled()
  })

  // ── Test 4: Compliance gate FAIL immediately disqualifies ─────────────────
  it('immediately sets platform to DISQUALIFIED when value=0 on a compliance gate requirement', async () => {
    mockAuth.mockResolvedValueOnce(sessions.pedagogy1)
    db.evaluation.findUnique.mockResolvedValueOnce(EVAL_IN_PROGRESS)
    db.evaluatorAssignment.findUnique.mockResolvedValueOnce(PEDAGOGY_ASSIGNMENT)
    db.requirement.findUnique.mockResolvedValueOnce(GATE_REQUIREMENT)  // isComplianceGate: true
    db.score.findUnique.mockResolvedValueOnce(null)  // first-time creation
    db.platform.update.mockResolvedValueOnce({ id: 'plat-1', status: 'DISQUALIFIED' })

    const res = await scoresPOST(
      makeRequest('POST', { requirementId: 'req-gate-1', value: 0 }),
      makeParams('eval-1'),
    )

    expect(res.status).toBe(201)
    // Platform must be disqualified immediately on this single score submission
    expect(db.platform.update).toHaveBeenCalledWith({
      where: { id: 'plat-1' },
      data: { status: 'DISQUALIFIED' },
    })
  })

  it('does NOT disqualify platform when value=0 on a non-gate requirement', async () => {
    mockAuth.mockResolvedValueOnce(sessions.pedagogy1)
    // Non-gate requirement with value 0 is a valid score (bottom of 0-3 scale)
    setupNewScore({ requirement: { ...PEDAGOGY_REQUIREMENT, isComplianceGate: false } })

    await scoresPOST(
      makeRequest('POST', { requirementId: 'req-ped-1', value: 0 }),
      makeParams('eval-1'),
    )

    expect(db.platform.update).not.toHaveBeenCalled()
  })

  it('does NOT disqualify platform when value=1 on a gate requirement', async () => {
    mockAuth.mockResolvedValueOnce(sessions.pedagogy1)
    setupNewScore({ requirement: GATE_REQUIREMENT })

    await scoresPOST(
      makeRequest('POST', { requirementId: 'req-gate-1', value: 1 }),
      makeParams('eval-1'),
    )

    expect(db.platform.update).not.toHaveBeenCalled()
  })

  // ── Auto-transition to MERGED ─────────────────────────────────────────────
  it('triggers MERGED transition when all evaluators have now submitted', async () => {
    mockAuth.mockResolvedValueOnce(sessions.pedagogy1)
    setupNewScore()
    mockCheckAllTeamsSubmitted.mockResolvedValueOnce(true)
    mockTransitionEvaluation.mockResolvedValueOnce({ ok: true, conflictCount: 0 })

    const res = await scoresPOST(
      makeRequest('POST', { requirementId: 'req-ped-1', value: 2 }),
      makeParams('eval-1'),
    )
    const body = await res.json()

    expect(mockTransitionEvaluation).toHaveBeenCalledWith('eval-1', 'MERGED', 'u-ped-1')
    expect(body.evaluationState).toBe('MERGED')
  })

  it('stays IN_PROGRESS when not all evaluators have submitted yet', async () => {
    mockAuth.mockResolvedValueOnce(sessions.pedagogy1)
    setupNewScore()
    mockCheckAllTeamsSubmitted.mockResolvedValueOnce(false)

    const res = await scoresPOST(
      makeRequest('POST', { requirementId: 'req-ped-1', value: 2 }),
      makeParams('eval-1'),
    )
    const body = await res.json()

    expect(mockTransitionEvaluation).not.toHaveBeenCalled()
    expect(body.evaluationState).toBe('IN_PROGRESS')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/evaluations/[id]/submit
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/evaluations/[id]/submit', () => {
  // Happy-path setup: evaluation in progress, user assigned, all reqs scored
  function setupSubmit(overrides: {
    evaluation?: object
    assignment?: object
    requirements?: object[]
    scores?: object[]
  } = {}) {
    mockAuth.mockResolvedValueOnce(sessions.pedagogy1)
    db.evaluation.findUnique.mockResolvedValueOnce(overrides.evaluation ?? EVAL_IN_PROGRESS)
    db.evaluatorAssignment.findUnique.mockResolvedValueOnce(
      overrides.assignment ?? PEDAGOGY_ASSIGNMENT,
    )
    db.requirement.findMany.mockResolvedValueOnce(
      overrides.requirements ?? [PEDAGOGY_REQUIREMENT],
    )
    // Scores with non-null values covering all requirements
    db.score.findMany.mockResolvedValueOnce(
      overrides.scores ?? [{ requirementId: 'req-ped-1', value: 2 }],
    )
    db.evaluatorAssignment.update.mockResolvedValueOnce({ ...PEDAGOGY_ASSIGNMENT, hasSubmitted: true })
  }

  it('returns 409 ALREADY_SUBMITTED when evaluator has already submitted', async () => {
    mockAuth.mockResolvedValueOnce(sessions.pedagogy1)
    db.evaluation.findUnique.mockResolvedValueOnce(EVAL_IN_PROGRESS)
    db.evaluatorAssignment.findUnique.mockResolvedValueOnce({
      ...PEDAGOGY_ASSIGNMENT,
      hasSubmitted: true,
    })

    const res = await submitPOST(makeRequest('POST'), makeParams('eval-1'))
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.code).toBe('ALREADY_SUBMITTED')
  })

  // ── Test 6 continued: ScoreAuditLog not required for submit, but mark submitted ──
  it('returns 422 INCOMPLETE_SCORES when not all requirements have been scored', async () => {
    mockAuth.mockResolvedValueOnce(sessions.pedagogy1)
    db.evaluation.findUnique.mockResolvedValueOnce(EVAL_IN_PROGRESS)
    db.evaluatorAssignment.findUnique.mockResolvedValueOnce(PEDAGOGY_ASSIGNMENT)
    // Two requirements, but only one scored
    db.requirement.findMany.mockResolvedValueOnce([PEDAGOGY_REQUIREMENT, GATE_REQUIREMENT])
    db.score.findMany.mockResolvedValueOnce([{ requirementId: 'req-ped-1', value: 2 }])

    const res = await submitPOST(makeRequest('POST'), makeParams('eval-1'))
    const body = await res.json()

    expect(res.status).toBe(422)
    expect(body.code).toBe('INCOMPLETE_SCORES')
    expect(body.unscoredCount).toBe(1)
    // Must not update hasSubmitted
    expect(db.evaluatorAssignment.update).not.toHaveBeenCalled()
  })

  it('marks hasSubmitted=true and submittedAt when all requirements are scored', async () => {
    setupSubmit()

    const res = await submitPOST(makeRequest('POST'), makeParams('eval-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.submitted).toBe(true)
    expect(db.evaluatorAssignment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ hasSubmitted: true }),
      }),
    )
  })

  // ── Test 8: MERGED only when ALL evaluators have submitted ─────────────────
  it('stays IN_PROGRESS when other evaluators have not yet submitted', async () => {
    setupSubmit()
    mockCheckAllTeamsSubmitted.mockResolvedValueOnce(false)

    const res = await submitPOST(makeRequest('POST'), makeParams('eval-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.evaluationState).toBe('IN_PROGRESS')
    expect(mockTransitionEvaluation).not.toHaveBeenCalled()
  })

  it('transitions to MERGED when all evaluators have submitted', async () => {
    setupSubmit()
    mockCheckAllTeamsSubmitted.mockResolvedValueOnce(true)
    mockTransitionEvaluation.mockResolvedValueOnce({ ok: true, conflictCount: 2 })

    const res = await submitPOST(makeRequest('POST'), makeParams('eval-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.evaluationState).toBe('MERGED')
    expect(mockTransitionEvaluation).toHaveBeenCalledWith('eval-1', 'MERGED', 'u-ped-1')
  })

  it('returns 422 WRONG_STATE when evaluation is not IN_PROGRESS (e.g. FINALISED)', async () => {
    mockAuth.mockResolvedValueOnce(sessions.pedagogy1)
    db.evaluation.findUnique.mockResolvedValueOnce(EVAL_FINALISED)

    const res = await submitPOST(makeRequest('POST'), makeParams('eval-1'))
    expect(res.status).toBe(422)
    expect((await res.json()).code).toBe('WRONG_STATE')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/evaluations/[id]/merge: Admin only
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/evaluations/[id]/merge', () => {
  it('returns 403 when a non-admin tries to merge', async () => {
    mockAuth.mockResolvedValueOnce(sessions.pedagogy1)

    const res = await mergePOST(makeRequest('POST'), makeParams('eval-1'))

    expect(res.status).toBe(403)
    expect(mockTransitionEvaluation).not.toHaveBeenCalled()
  })

  // ── Test 8: MERGED only when ALL evaluators submitted ────────────────────
  it('returns 422 NOT_ALL_SUBMITTED when transitionEvaluation reports missing submissions', async () => {
    mockAuth.mockResolvedValueOnce(sessions.admin)
    mockTransitionEvaluation.mockResolvedValueOnce({
      ok: false,
      error: 'NOT_ALL_SUBMITTED',
      message: '2 evaluator(s) have not submitted',
    })

    const res = await mergePOST(makeRequest('POST'), makeParams('eval-1'))
    const body = await res.json()

    expect(res.status).toBe(422)
    expect(body.code).toBe('NOT_ALL_SUBMITTED')
  })

  // ── Test 7: Conflict count returned from merge ────────────────────────────
  it('returns conflictCount when merge succeeds with intra-team conflicts detected', async () => {
    mockAuth.mockResolvedValueOnce(sessions.admin)
    mockTransitionEvaluation.mockResolvedValueOnce({
      ok: true,
      complianceResult: { passed: true, failedGates: [] },
      conflictCount: 3,
    })

    const res = await mergePOST(makeRequest('POST'), makeParams('eval-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.state).toBe('MERGED')
    expect(body.conflictCount).toBe(3)
    // 4th arg = true: admin force-merge bypasses the all-submitted guard
    expect(mockTransitionEvaluation).toHaveBeenCalledWith('eval-1', 'MERGED', 'u-admin', true)
  })

  it('returns conflictCount=0 when merge succeeds with no conflicts', async () => {
    mockAuth.mockResolvedValueOnce(sessions.admin)
    mockTransitionEvaluation.mockResolvedValueOnce({
      ok: true,
      complianceResult: { passed: true, failedGates: [] },
      conflictCount: 0,
    })

    const res = await mergePOST(makeRequest('POST'), makeParams('eval-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.conflictCount).toBe(0)
  })

  it('reports compliancePassed=false and failedGates when platform is disqualified', async () => {
    mockAuth.mockResolvedValueOnce(sessions.admin)
    mockTransitionEvaluation.mockResolvedValueOnce({
      ok: true,
      complianceResult: {
        passed: false,
        failedGates: [{ requirementId: 'req-gate-1', requirementTitle: 'Data Protection' }],
      },
      conflictCount: 0,
    })

    const res = await mergePOST(makeRequest('POST'), makeParams('eval-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.compliancePassed).toBe(false)
    expect(body.failedGates).toHaveLength(1)
    expect(body.failedGates[0].requirementTitle).toBe('Data Protection')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/evaluations/[id]/finalise: Admin only
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/evaluations/[id]/finalise', () => {
  it('returns 403 when a non-admin tries to finalise', async () => {
    mockAuth.mockResolvedValueOnce(sessions.technical1)

    const res = await finalisePOST(makeRequest('POST'), makeParams('eval-1'))

    expect(res.status).toBe(403)
    expect(mockTransitionEvaluation).not.toHaveBeenCalled()
  })

  // ── Test 9: FINALISED only when ALL conflicts resolved ────────────────────
  it('returns 422 OPEN_THREADS when unresolved conflicts remain', async () => {
    mockAuth.mockResolvedValueOnce(sessions.admin)
    mockTransitionEvaluation.mockResolvedValueOnce({
      ok: false,
      error: 'OPEN_THREADS',
      message: '2 conflict thread(s) must be resolved before finalising',
    })

    const res = await finalisePOST(makeRequest('POST'), makeParams('eval-1'))
    const body = await res.json()

    expect(res.status).toBe(422)
    expect(body.code).toBe('OPEN_THREADS')
  })

  it('returns 200 and FINALISED state when all conflicts are resolved', async () => {
    mockAuth.mockResolvedValueOnce(sessions.admin)
    mockTransitionEvaluation.mockResolvedValueOnce({ ok: true })

    const res = await finalisePOST(makeRequest('POST'), makeParams('eval-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.state).toBe('FINALISED')
    expect(mockTransitionEvaluation).toHaveBeenCalledWith('eval-1', 'FINALISED', 'u-admin')
  })

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null)

    const res = await finalisePOST(makeRequest('POST'), makeParams('eval-1'))

    expect(res.status).toBe(401)
  })
})
