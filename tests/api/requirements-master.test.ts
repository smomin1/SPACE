import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    requirement: {
      findMany:   vi.fn(),
      findUnique: vi.fn(),
      create:     vi.fn(),
      createMany: vi.fn(),
      delete:     vi.fn(),
      update:     vi.fn(),
    },
    score: {
      count: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { GET as requirementsGET, POST as requirementsPOST } from '@/app/api/requirements/route'
import { DELETE as requirementsDELETE } from '@/app/api/requirements/[id]/route'

const mockPrisma = prisma as {
  requirement: {
    findMany:   ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    create:     ReturnType<typeof vi.fn>
    createMany: ReturnType<typeof vi.fn>
    delete:     ReturnType<typeof vi.fn>
    update:     ReturnType<typeof vi.fn>
  }
  score: { count: ReturnType<typeof vi.fn> }
}
const mockAuth = auth as ReturnType<typeof vi.fn>

// ── Session fixtures ─────────────────────────────────────────────────────────

const sessions = {
  admin: { user: { id: 'u1', email: 'admin@eval.com',     name: 'Admin',    role: 'ADMIN'                as const } },
  pedagogy:  { user: { id: 'u2', email: 'pedagogy@eval.com', name: 'Pedagogy', role: 'PEDAGOGY_EVALUATOR'  as const } },
  technical: { user: { id: 'u3', email: 'tech@eval.com',     name: 'Tech',     role: 'TECHNICAL_EVALUATOR' as const } },
  viewer:    { user: { id: 'u4', email: 'viewer@eval.com',   name: 'Viewer',   role: 'VIEWER'              as const } },
} as const

const SAMPLE_REQUIREMENTS = [
  {
    id: 'req-1',
    title: 'Data Protection',
    description: 'GDPR compliance.',
    evaluatorType: 'COMPLIANCE',
    weight: 'HIGH',
    isComplianceGate: true,
    category: 'Compliance',
    order: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'req-2',
    title: 'Curriculum Alignment',
    description: 'Maps to national curriculum.',
    evaluatorType: 'PEDAGOGY',
    weight: 'HIGH',
    isComplianceGate: false,
    category: 'Curriculum',
    order: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

function makeGET(url = 'http://localhost/api/requirements') {
  return new Request(url)
}

function makePOST(body: unknown) {
  return new Request('http://localhost/api/requirements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => vi.clearAllMocks())

// ── 1. GET /api/requirements — all authenticated roles ───────────────────────

describe('GET /api/requirements', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await requirementsGET(makeGET())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.code).toBe('UNAUTHORIZED')
  })

  it.each([
    ['ADMIN',                sessions.admin],
    ['PEDAGOGY_EVALUATOR',   sessions.pedagogy],
    ['TECHNICAL_EVALUATOR',  sessions.technical],
    ['VIEWER',               sessions.viewer],
  ])('returns 200 for %s role', async (_label, session) => {
    mockAuth.mockResolvedValueOnce(session)
    mockPrisma.requirement.findMany.mockResolvedValueOnce(SAMPLE_REQUIREMENTS)
    const res = await requirementsGET(makeGET())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.requirements).toHaveLength(2)
  })

  it('response contains requirement fields but no score data', async () => {
    mockAuth.mockResolvedValueOnce(sessions.pedagogy)
    mockPrisma.requirement.findMany.mockResolvedValueOnce(SAMPLE_REQUIREMENTS)
    const res = await requirementsGET(makeGET())
    const body = await res.json()
    const req = body.requirements[0]
    // Must have requirement fields
    expect(req).toHaveProperty('id')
    expect(req).toHaveProperty('title')
    expect(req).toHaveProperty('evaluatorType')
    expect(req).toHaveProperty('weight')
    expect(req).toHaveProperty('isComplianceGate')
    // Must NOT have score data embedded
    expect(req).not.toHaveProperty('scores')
    expect(req).not.toHaveProperty('value')
    expect(req).not.toHaveProperty('evidenceType')
  })

  it('passes category filter to the DB query', async () => {
    mockAuth.mockResolvedValueOnce(sessions.admin)
    mockPrisma.requirement.findMany.mockResolvedValueOnce([])
    await requirementsGET(makeGET('http://localhost/api/requirements?category=Compliance'))
    expect(mockPrisma.requirement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ category: 'Compliance' }) })
    )
  })

  it('passes evaluatorType filter to the DB query', async () => {
    mockAuth.mockResolvedValueOnce(sessions.technical)
    mockPrisma.requirement.findMany.mockResolvedValueOnce([])
    await requirementsGET(makeGET('http://localhost/api/requirements?evaluatorType=TECHNICAL'))
    expect(mockPrisma.requirement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ evaluatorType: 'TECHNICAL' }) })
    )
  })
})

// ── 2. POST /api/requirements — ADMIN only ───────────────────────────────────

describe('POST /api/requirements', () => {
  const validBody = {
    title: 'LTI Integration',
    description: 'Supports LTI 1.3 for VLE integration.',
    evaluatorType: 'TECHNICAL',
    weight: 'HIGH',
    isComplianceGate: false,
    category: 'Interoperability',
    order: 1,
  }

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await requirementsPOST(makePOST(validBody))
    expect(res.status).toBe(401)
  })

  it.each([
    ['PEDAGOGY_EVALUATOR',  sessions.pedagogy],
    ['TECHNICAL_EVALUATOR', sessions.technical],
    ['VIEWER',              sessions.viewer],
  ])('returns 403 for %s role', async (_label, session) => {
    mockAuth.mockResolvedValueOnce(session)
    const res = await requirementsPOST(makePOST(validBody))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe('FORBIDDEN')
  })

  it('returns 201 when ADMIN submits a valid body', async () => {
    mockAuth.mockResolvedValueOnce(sessions.admin)
    mockPrisma.requirement.create.mockResolvedValueOnce({ id: 'req-new', ...validBody })
    const res = await requirementsPOST(makePOST(validBody))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.requirement.title).toBe('LTI Integration')
  })

  it('returns 400 when body fails validation', async () => {
    mockAuth.mockResolvedValueOnce(sessions.admin)
    const res = await requirementsPOST(makePOST({ ...validBody, title: '' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('VALIDATION_ERROR')
  })
})

// ── 3. DELETE /api/requirements/[id] — ADMIN only ───────────────────────────

describe('DELETE /api/requirements/[id]', () => {
  const req = SAMPLE_REQUIREMENTS[1] // non-gate requirement, no scores

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await requirementsDELETE(new Request('http://localhost'), makeParams(req.id))
    expect(res.status).toBe(401)
  })

  it.each([
    ['PEDAGOGY_EVALUATOR',  sessions.pedagogy],
    ['TECHNICAL_EVALUATOR', sessions.technical],
    ['VIEWER',              sessions.viewer],
  ])('returns 403 for %s role', async (_label, session) => {
    mockAuth.mockResolvedValueOnce(session)
    const res = await requirementsDELETE(new Request('http://localhost'), makeParams(req.id))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe('FORBIDDEN')
  })

  it('returns 404 when the requirement does not exist', async () => {
    mockAuth.mockResolvedValueOnce(sessions.admin)
    mockPrisma.requirement.findUnique.mockResolvedValueOnce(null)
    const res = await requirementsDELETE(new Request('http://localhost'), makeParams('nonexistent'))
    expect(res.status).toBe(404)
  })

  it('returns 409 when the requirement has associated scores', async () => {
    mockAuth.mockResolvedValueOnce(sessions.admin)
    mockPrisma.requirement.findUnique.mockResolvedValueOnce(req)
    mockPrisma.score.count.mockResolvedValueOnce(5)
    const res = await requirementsDELETE(new Request('http://localhost'), makeParams(req.id))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('HAS_SCORES')
  })

  it('returns 204 when ADMIN deletes a requirement with no scores', async () => {
    mockAuth.mockResolvedValueOnce(sessions.admin)
    mockPrisma.requirement.findUnique.mockResolvedValueOnce(req)
    mockPrisma.score.count.mockResolvedValueOnce(0)
    const res = await requirementsDELETE(new Request('http://localhost'), makeParams(req.id))
    expect(res.status).toBe(204)
  })
})
