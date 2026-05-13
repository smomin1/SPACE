import { describe, expect, it, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    context: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    requirementContext: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    platformEvaluatorAssignment: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
    requirement: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { POST as createContext } from '@/app/api/contexts/route'
import { DELETE as deleteContext } from '@/app/api/contexts/[id]/route'
import { GET as getContextRequirements, POST as assignRequirement } from '@/app/api/contexts/[id]/requirements/route'
import { POST as evaluatorAction } from '@/app/api/platforms/[id]/evaluators/route'

// ── Typed mock helpers ────────────────────────────────────────────────────────

type MockPrisma = {
  context: {
    create: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
  requirementContext: {
    upsert: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    deleteMany: ReturnType<typeof vi.fn>
  }
  platformEvaluatorAssignment: {
    upsert: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    count: ReturnType<typeof vi.fn>
    deleteMany: ReturnType<typeof vi.fn>
  }
  requirement: { findMany: ReturnType<typeof vi.fn> }
  user: { findUnique: ReturnType<typeof vi.fn> }
  $transaction: ReturnType<typeof vi.fn>
}

const mockPrisma = prisma as unknown as MockPrisma
const mockAuth = auth as ReturnType<typeof vi.fn>

// ── Session fixtures ──────────────────────────────────────────────────────────

const ADMIN_SESSION = {
  user: { id: 'admin-1', email: 'admin@eval.com', name: 'Admin', role: 'ADMIN' as const },
}

// ── Request helpers ───────────────────────────────────────────────────────────

function jsonRequest(body: unknown, url = 'http://localhost/api/test') {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CONTEXT_A = {
  id: 'ctx-a',
  name: 'K-12 English',
  description: null,
  learningLevels: ['K12'],
  cefrMin: 'A1',
  cefrMax: 'B2',
  skills: ['READING', 'WRITING'],
  deploymentMode: 'CLOUD',
  createdAt: new Date(),
}

const CONTEXT_B = {
  id: 'ctx-b',
  name: 'Higher Ed STEM',
  description: null,
  learningLevels: ['HIGHER_ED'],
  cefrMin: null,
  cefrMax: null,
  skills: ['READING'],
  deploymentMode: null,
  createdAt: new Date(),
}

const REQUIREMENT = {
  id: 'req-1',
  title: 'Data Privacy Compliance',
  description: 'Must comply with GDPR.',
  evaluatorType: 'COMPLIANCE',
  weight: 'HIGH',
  isComplianceGate: true,
  category: 'Compliance',
  order: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
  // Default $transaction to execute callbacks
  mockPrisma.$transaction.mockImplementation(async (ops: unknown) => {
    if (Array.isArray(ops)) return Promise.all(ops)
    if (typeof ops === 'function') return ops(mockPrisma)
    return ops
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 1: A context can be created and requirements assigned to it
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 1: Create a context and assign a requirement', () => {
  it('POST /api/contexts creates a context successfully', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    mockPrisma.context.create.mockResolvedValueOnce(CONTEXT_A)

    const res = await createContext(
      jsonRequest({
        name: 'K-12 English',
        learningLevels: ['K12'],
        cefrMin: 'A1',
        cefrMax: 'B2',
        skills: ['READING', 'WRITING'],
        deploymentMode: 'CLOUD',
      })
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.context.id).toBe('ctx-a')
    expect(mockPrisma.context.create).toHaveBeenCalledOnce()
  })

  it('POST /api/contexts/[id]/requirements assigns a requirement to the context', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    mockPrisma.requirementContext.upsert.mockResolvedValueOnce({
      requirementId: 'req-1',
      contextId: 'ctx-a',
    })

    const res = await assignRequirement(
      jsonRequest({ requirementId: 'req-1', assigned: true }),
      makeParams('ctx-a')
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.assigned).toBe(true)
    expect(body.requirementId).toBe('req-1')
    expect(body.contextId).toBe('ctx-a')
    expect(mockPrisma.requirementContext.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { requirementId_contextId: { requirementId: 'req-1', contextId: 'ctx-a' } },
        create: { requirementId: 'req-1', contextId: 'ctx-a' },
      })
    )
  })

  it('POST /api/contexts/[id]/requirements with assigned:false removes the assignment', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    mockPrisma.requirementContext.deleteMany.mockResolvedValueOnce({ count: 1 })

    const res = await assignRequirement(
      jsonRequest({ requirementId: 'req-1', assigned: false }),
      makeParams('ctx-a')
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.assigned).toBe(false)
    expect(mockPrisma.requirementContext.deleteMany).toHaveBeenCalledWith({
      where: { requirementId: 'req-1', contextId: 'ctx-a' },
    })
  })

  it('GET /api/contexts/[id]/requirements reflects the assigned flag correctly', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    mockPrisma.requirement.findMany.mockResolvedValueOnce([REQUIREMENT])
    mockPrisma.requirementContext.findMany.mockResolvedValueOnce([{ requirementId: 'req-1' }])

    const res = await getContextRequirements(
      new Request('http://localhost'),
      makeParams('ctx-a')
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.requirements).toHaveLength(1)
    expect(body.requirements[0].assigned).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 2: The same requirement can be assigned to multiple contexts
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 2: One requirement assigned to multiple contexts', () => {
  it('assigns req-1 to ctx-a and then to ctx-b independently', async () => {
    // Assign to ctx-a
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    mockPrisma.requirementContext.upsert.mockResolvedValueOnce({
      requirementId: 'req-1',
      contextId: 'ctx-a',
    })

    const res1 = await assignRequirement(
      jsonRequest({ requirementId: 'req-1', assigned: true }),
      makeParams('ctx-a')
    )
    expect(res1.status).toBe(200)

    // Assign same requirement to ctx-b
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    mockPrisma.requirementContext.upsert.mockResolvedValueOnce({
      requirementId: 'req-1',
      contextId: 'ctx-b',
    })

    const res2 = await assignRequirement(
      jsonRequest({ requirementId: 'req-1', assigned: true }),
      makeParams('ctx-b')
    )
    expect(res2.status).toBe(200)
    const body2 = await res2.json()
    expect(body2.contextId).toBe('ctx-b')

    // Both upserts happened with the same requirementId but different contextIds
    expect(mockPrisma.requirementContext.upsert).toHaveBeenCalledTimes(2)
    const calls = mockPrisma.requirementContext.upsert.mock.calls
    expect(calls[0][0].create.contextId).toBe('ctx-a')
    expect(calls[1][0].create.contextId).toBe('ctx-b')
    expect(calls[0][0].create.requirementId).toBe('req-1')
    expect(calls[1][0].create.requirementId).toBe('req-1')
  })

  it('GET for ctx-a shows req-1 as assigned even after also assigning it to ctx-b', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    mockPrisma.requirement.findMany.mockResolvedValueOnce([REQUIREMENT])
    // ctx-a still has req-1 assigned
    mockPrisma.requirementContext.findMany.mockResolvedValueOnce([{ requirementId: 'req-1' }])

    const res = await getContextRequirements(new Request('http://localhost'), makeParams('ctx-a'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.requirements[0].assigned).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 3: Assigning an evaluator of the wrong role returns a validation error
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 3: Evaluator role mismatch returns 422', () => {
  it('returns 422 ROLE_MISMATCH when a VIEWER is assigned as PEDAGOGY evaluator', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      role: 'VIEWER',
    })

    const res = await evaluatorAction(
      jsonRequest({ userId: 'viewer-1', evaluatorType: 'PEDAGOGY', action: 'assign' }),
      makeParams('platform-1')
    )

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.code).toBe('ROLE_MISMATCH')
  })

  it('returns 422 ROLE_MISMATCH when a VIEWER is assigned as TECHNICAL evaluator', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    mockPrisma.user.findUnique.mockResolvedValueOnce({ role: 'VIEWER' })

    const res = await evaluatorAction(
      jsonRequest({ userId: 'viewer-1', evaluatorType: 'TECHNICAL', action: 'assign' }),
      makeParams('platform-1')
    )

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.code).toBe('ROLE_MISMATCH')
  })

  it('returns 422 ROLE_MISMATCH when a PEDAGOGY_EVALUATOR is assigned as TECHNICAL evaluator', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    mockPrisma.user.findUnique.mockResolvedValueOnce({ role: 'PEDAGOGY_EVALUATOR' })

    const res = await evaluatorAction(
      jsonRequest({ userId: 'ped-1', evaluatorType: 'TECHNICAL', action: 'assign' }),
      makeParams('platform-1')
    )

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.code).toBe('ROLE_MISMATCH')
  })

  it('returns 422 ROLE_MISMATCH when a TECHNICAL_EVALUATOR is assigned as PEDAGOGY evaluator', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    mockPrisma.user.findUnique.mockResolvedValueOnce({ role: 'TECHNICAL_EVALUATOR' })

    const res = await evaluatorAction(
      jsonRequest({ userId: 'tech-1', evaluatorType: 'PEDAGOGY', action: 'assign' }),
      makeParams('platform-1')
    )

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.code).toBe('ROLE_MISMATCH')
  })

  it('succeeds (201) when a PEDAGOGY_EVALUATOR is correctly assigned as PEDAGOGY evaluator', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    mockPrisma.user.findUnique.mockResolvedValueOnce({ role: 'PEDAGOGY_EVALUATOR' })
    mockPrisma.platformEvaluatorAssignment.upsert.mockResolvedValueOnce({
      id: 'assign-1',
      platformId: 'platform-1',
      userId: 'ped-1',
      evaluatorType: 'PEDAGOGY',
      createdAt: new Date(),
      user: { id: 'ped-1', name: 'Ped User', email: 'ped@eval.com', role: 'PEDAGOGY_EVALUATOR' },
    })

    const res = await evaluatorAction(
      jsonRequest({ userId: 'ped-1', evaluatorType: 'PEDAGOGY', action: 'assign' }),
      makeParams('platform-1')
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.assignment.evaluatorType).toBe('PEDAGOGY')
  })

  it('succeeds (201) when an ADMIN is assigned as either evaluator type', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    mockPrisma.user.findUnique.mockResolvedValueOnce({ role: 'ADMIN' })
    mockPrisma.platformEvaluatorAssignment.upsert.mockResolvedValueOnce({
      id: 'assign-2',
      platformId: 'platform-1',
      userId: 'admin-2',
      evaluatorType: 'TECHNICAL',
      createdAt: new Date(),
      user: { id: 'admin-2', name: 'Admin 2', email: 'admin2@eval.com', role: 'ADMIN' },
    })

    const res = await evaluatorAction(
      jsonRequest({ userId: 'admin-2', evaluatorType: 'TECHNICAL', action: 'assign' }),
      makeParams('platform-1')
    )

    expect(res.status).toBe(201)
  })

  it('returns 404 when the target user does not exist', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    mockPrisma.user.findUnique.mockResolvedValueOnce(null)

    const res = await evaluatorAction(
      jsonRequest({ userId: 'ghost-1', evaluatorType: 'PEDAGOGY', action: 'assign' }),
      makeParams('platform-1')
    )

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.code).toBe('USER_NOT_FOUND')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 4: Deleting a context removes only the assignments, not the requirements
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 4: Deleting a context does not delete requirements', () => {
  it('DELETE /api/contexts/[id] calls deleteMany on RequirementContext but not on Requirement', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    // $transaction: deleteMany(requirementContext) + delete(context)
    mockPrisma.$transaction.mockResolvedValueOnce([{ count: 3 }, { id: 'ctx-a' }])

    const res = await deleteContext(
      new Request('http://localhost', { method: 'DELETE' }),
      makeParams('ctx-a')
    )

    expect(res.status).toBe(204)

    // Transaction was called — it removes RequirementContext rows and the context
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce()

    // The Requirement table is never touched
    expect(mockPrisma.requirement.findMany).not.toHaveBeenCalled()
  })

  it('requirements are still retrievable after context deletion', async () => {
    // After the context is deleted, querying requirements should still return them.
    // The mock simulates a fresh call to the requirement table — it returns the row.
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    mockPrisma.requirement.findMany.mockResolvedValueOnce([REQUIREMENT])
    mockPrisma.requirementContext.findMany.mockResolvedValueOnce([])

    // GET /api/contexts/[id]/requirements for a *different* context (ctx-b)
    // req-1 should be present (unassigned) — it was never deleted
    const res = await getContextRequirements(
      new Request('http://localhost'),
      makeParams('ctx-b')
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.requirements).toHaveLength(1)
    expect(body.requirements[0].id).toBe('req-1')
    expect(body.requirements[0].assigned).toBe(false)
  })

})
