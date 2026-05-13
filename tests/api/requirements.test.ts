import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    requirement: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      createMany: vi.fn(),
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

vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
  },
}))

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import * as XLSX from 'xlsx'
import { GET as listGET, POST as createPOST } from '@/app/api/requirements/route'
import {
  PUT as updateOne,
  DELETE as deleteOne,
} from '@/app/api/requirements/[id]/route'
import { POST as bulkPOST } from '@/app/api/admin/requirements/bulk/route'

const mockPrisma = prisma as {
  requirement: {
    findMany: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    createMany: ReturnType<typeof vi.fn>
  }
  score: { count: ReturnType<typeof vi.fn> }
}
const mockAuth = auth as ReturnType<typeof vi.fn>
const mockXLSX = XLSX as {
  read: ReturnType<typeof vi.fn>
  utils: { sheet_to_json: ReturnType<typeof vi.fn> }
}

const ADMIN_SESSION = {
  user: { id: 'user-1', email: 'admin@eval.com', name: 'Admin', role: 'ADMIN' as const },
}
const VIEWER_SESSION = {
  user: { id: 'user-2', email: 'viewer@eval.com', name: 'Viewer', role: 'VIEWER' as const },
}

const SAMPLE_REQ = {
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
}

function makeRequest(body?: unknown, url = 'http://localhost/api/admin/requirements') {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── GET /api/admin/requirements ──────────────────────────────────────────────

describe('GET /api/admin/requirements', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await listGET(new Request('http://localhost/api/admin/requirements'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.code).toBe('UNAUTHORIZED')
  })

  it('returns 200 when role is VIEWER (GET is open to all authenticated users)', async () => {
    mockAuth.mockResolvedValueOnce(VIEWER_SESSION)
    mockPrisma.requirement.findMany.mockResolvedValueOnce([])
    const res = await listGET(new Request('http://localhost/api/requirements'))
    expect(res.status).toBe(200)
  })

  it('returns 200 when role is PEDAGOGY_EVALUATOR', async () => {
    mockAuth.mockResolvedValueOnce({
      user: { ...ADMIN_SESSION.user, role: 'PEDAGOGY_EVALUATOR' },
    })
    mockPrisma.requirement.findMany.mockResolvedValueOnce([])
    const res = await listGET(new Request('http://localhost/api/requirements'))
    expect(res.status).toBe(200)
  })

  it('returns 200 with requirements array when ADMIN', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    mockPrisma.requirement.findMany.mockResolvedValueOnce([SAMPLE_REQ])
    const res = await listGET(new Request('http://localhost/api/admin/requirements'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.requirements).toHaveLength(1)
  })

  it('passes category filter to prisma when ?category= provided', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    mockPrisma.requirement.findMany.mockResolvedValueOnce([])
    await listGET(
      new Request('http://localhost/api/admin/requirements?category=Compliance')
    )
    expect(mockPrisma.requirement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ category: 'Compliance' }) })
    )
  })

  it('passes evaluatorType filter when ?evaluatorType= provided', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    mockPrisma.requirement.findMany.mockResolvedValueOnce([])
    await listGET(
      new Request('http://localhost/api/admin/requirements?evaluatorType=COMPLIANCE')
    )
    expect(mockPrisma.requirement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ evaluatorType: 'COMPLIANCE' }) })
    )
  })

  it('passes isComplianceGate filter when ?isComplianceGate=true provided', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    mockPrisma.requirement.findMany.mockResolvedValueOnce([])
    await listGET(
      new Request('http://localhost/api/admin/requirements?isComplianceGate=true')
    )
    expect(mockPrisma.requirement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isComplianceGate: true }) })
    )
  })
})

// ── POST /api/admin/requirements ─────────────────────────────────────────────

describe('POST /api/admin/requirements', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await createPOST(makeRequest(SAMPLE_REQ))
    expect(res.status).toBe(401)
  })

  it('returns 403 when role is not ADMIN', async () => {
    mockAuth.mockResolvedValueOnce(VIEWER_SESSION)
    const res = await createPOST(makeRequest(SAMPLE_REQ))
    expect(res.status).toBe(403)
  })

  it('returns 400 when body fails validation (empty title)', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    const res = await createPOST(makeRequest({ ...SAMPLE_REQ, title: '' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when evaluatorType is invalid', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    const res = await createPOST(makeRequest({ ...SAMPLE_REQ, evaluatorType: 'UNKNOWN' }))
    expect(res.status).toBe(400)
  })

  it('returns 201 with created requirement on valid body', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    mockPrisma.requirement.create.mockResolvedValueOnce(SAMPLE_REQ)
    const res = await createPOST(makeRequest(SAMPLE_REQ))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.requirement.id).toBe('req-1')
  })
})

// ── PUT /api/admin/requirements/[id] ─────────────────────────────────────────

describe('PUT /api/admin/requirements/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await updateOne(
      makeRequest({ title: 'Updated' }),
      makeParams('req-1')
    )
    expect(res.status).toBe(401)
  })

  it('returns 403 when role is not ADMIN', async () => {
    mockAuth.mockResolvedValueOnce(VIEWER_SESSION)
    const res = await updateOne(makeRequest({ title: 'Updated' }), makeParams('req-1'))
    expect(res.status).toBe(403)
  })

  it('returns 404 when requirement does not exist', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    const prismaError = Object.assign(new Error('Not found'), { code: 'P2025' })
    mockPrisma.requirement.update.mockRejectedValueOnce(prismaError)
    const res = await updateOne(makeRequest({ title: 'Updated' }), makeParams('nonexistent'))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.code).toBe('NOT_FOUND')
  })

  it('returns 200 with updated requirement on valid body', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    mockPrisma.requirement.update.mockResolvedValueOnce({ ...SAMPLE_REQ, title: 'Updated' })
    const res = await updateOne(makeRequest({ title: 'Updated' }), makeParams('req-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.requirement.title).toBe('Updated')
  })
})

// ── DELETE /api/admin/requirements/[id] ──────────────────────────────────────

describe('DELETE /api/admin/requirements/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await deleteOne(new Request('http://localhost'), makeParams('req-1'))
    expect(res.status).toBe(401)
  })

  it('returns 403 when role is not ADMIN', async () => {
    mockAuth.mockResolvedValueOnce(VIEWER_SESSION)
    const res = await deleteOne(new Request('http://localhost'), makeParams('req-1'))
    expect(res.status).toBe(403)
  })

  it('returns 404 when requirement does not exist', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    mockPrisma.requirement.findUnique.mockResolvedValueOnce(null)
    const res = await deleteOne(new Request('http://localhost'), makeParams('nonexistent'))
    expect(res.status).toBe(404)
  })

  it('returns 409 when requirement has associated scores', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    mockPrisma.requirement.findUnique.mockResolvedValueOnce(SAMPLE_REQ)
    mockPrisma.score.count.mockResolvedValueOnce(3)
    const res = await deleteOne(new Request('http://localhost'), makeParams('req-1'))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('HAS_SCORES')
  })

  it('returns 204 when requirement exists and has no scores', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    mockPrisma.requirement.findUnique.mockResolvedValueOnce(SAMPLE_REQ)
    mockPrisma.score.count.mockResolvedValueOnce(0)
    mockPrisma.requirement.delete.mockResolvedValueOnce(SAMPLE_REQ)
    const res = await deleteOne(new Request('http://localhost'), makeParams('req-1'))
    expect(res.status).toBe(204)
  })
})

// ── POST /api/admin/requirements/bulk ────────────────────────────────────────

describe('POST /api/admin/requirements/bulk', () => {
  function makeFormDataRequest(file?: File) {
    const fd = new FormData()
    if (file) fd.append('file', file)
    return new Request('http://localhost/api/admin/requirements/bulk', {
      method: 'POST',
      body: fd,
    })
  }

  function makeXlsxFile(name = 'reqs.xlsx') {
    return new File([new Uint8Array(8)], name, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  }

  const VALID_ROW = {
    title: 'Test',
    description: 'Desc',
    evaluatorType: 'COMPLIANCE',
    weight: 'HIGH',
    isComplianceGate: false,
    category: 'Cat',
    order: 1,
  }

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await bulkPOST(makeFormDataRequest())
    expect(res.status).toBe(401)
  })

  it('returns 403 when role is not ADMIN', async () => {
    mockAuth.mockResolvedValueOnce(VIEWER_SESSION)
    const res = await bulkPOST(makeFormDataRequest())
    expect(res.status).toBe(403)
  })

  it('returns 400 when no file is uploaded', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    const res = await bulkPOST(makeFormDataRequest())
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('NO_FILE')
  })

  it('returns 400 when uploaded file is not XLSX', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    const csvFile = new File(['a,b'], 'data.csv', { type: 'text/csv' })
    const res = await bulkPOST(makeFormDataRequest(csvFile))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('INVALID_FILE_TYPE')
  })

  it('returns 201 with imported count when all rows are valid', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    mockXLSX.read.mockReturnValueOnce({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } })
    mockXLSX.utils.sheet_to_json.mockReturnValueOnce([VALID_ROW])
    mockPrisma.requirement.findMany.mockResolvedValueOnce([]) // no existing titles
    mockPrisma.requirement.createMany.mockResolvedValueOnce({ count: 1 })
    const res = await bulkPOST(makeFormDataRequest(makeXlsxFile()))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.imported).toBe(1)
  })

  it('returns 422 with failures when XLSX rows fail validation', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    mockXLSX.read.mockReturnValueOnce({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } })
    mockXLSX.utils.sheet_to_json.mockReturnValueOnce([{ ...VALID_ROW, title: '' }])
    const res = await bulkPOST(makeFormDataRequest(makeXlsxFile()))
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.code).toBe('VALIDATION_ERROR')
    expect(body.failures).toHaveLength(1)
  })

  it('does not create any rows when even one row fails validation', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    mockXLSX.read.mockReturnValueOnce({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } })
    mockXLSX.utils.sheet_to_json.mockReturnValueOnce([
      VALID_ROW,
      { ...VALID_ROW, title: '' },
    ])
    const res = await bulkPOST(makeFormDataRequest(makeXlsxFile()))
    expect(res.status).toBe(422)
    expect(mockPrisma.requirement.createMany).not.toHaveBeenCalled()
  })

  it('returns 422 when row count exceeds 500', async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION)
    mockXLSX.read.mockReturnValueOnce({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } })
    mockXLSX.utils.sheet_to_json.mockReturnValueOnce(Array(501).fill(VALID_ROW))
    const res = await bulkPOST(makeFormDataRequest(makeXlsxFile()))
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.code).toBe('TOO_MANY_ROWS')
  })
})
