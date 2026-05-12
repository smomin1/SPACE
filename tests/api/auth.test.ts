import { describe, expect, it, vi, beforeEach } from 'vitest'

// ── Login tests use authorizeCredentials directly (mocking prisma + bcrypt) ──

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}))

// ── Route handler tests mock auth() so NextAuth is never initialised ──

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { authorizeCredentials } from '@/lib/auth-utils'
import { GET as adminGET } from '@/app/api/admin/route'
import { GET as scoresGET } from '@/app/api/scores/route'

const mockPrismaUser = prisma.user as { findUnique: ReturnType<typeof vi.fn> }
const mockBcrypt = bcrypt as { compare: ReturnType<typeof vi.fn> }
const mockAuth = auth as ReturnType<typeof vi.fn>

const SEEDED_USER = {
  id: 'user-1',
  email: 'admin@eval.com',
  name: 'Admin',
  hashedPassword: '$2b$10$hashedpassword',
  role: 'ADMIN' as const,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Login', () => {
  it('returns a user object when credentials are correct', async () => {
    mockPrismaUser.findUnique.mockResolvedValueOnce(SEEDED_USER)
    mockBcrypt.compare.mockResolvedValueOnce(true)

    const result = await authorizeCredentials('admin@eval.com', 'correct-password')

    expect(result).toEqual({
      id: SEEDED_USER.id,
      email: SEEDED_USER.email,
      name: SEEDED_USER.name,
      role: SEEDED_USER.role,
    })
  })

  it('returns null when password is wrong', async () => {
    mockPrismaUser.findUnique.mockResolvedValueOnce(SEEDED_USER)
    mockBcrypt.compare.mockResolvedValueOnce(false)

    const result = await authorizeCredentials('admin@eval.com', 'wrong-password')

    expect(result).toBeNull()
  })

  it('returns null when email does not exist (no user enumeration)', async () => {
    mockPrismaUser.findUnique.mockResolvedValueOnce(null)

    const result = await authorizeCredentials('nobody@eval.com', 'any-password')

    expect(result).toBeNull()
    // bcrypt.compare must NOT be called — avoids timing oracle
    expect(mockBcrypt.compare).not.toHaveBeenCalled()
  })
})

describe('GET /api/admin', () => {
  it('returns 403 when the authenticated user has the VIEWER role', async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: 'user-2', email: 'viewer@eval.com', name: 'Viewer', role: 'VIEWER' },
    })

    const res = await adminGET()

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Forbidden')
  })

  it('returns 200 when the authenticated user has the ADMIN role', async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: 'user-1', email: 'admin@eval.com', name: 'Admin', role: 'ADMIN' },
    })

    const res = await adminGET()

    expect(res.status).toBe(200)
  })
})

describe('GET /api/scores', () => {
  it('returns 401 when the request is unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null)

    const res = await scoresGET()

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 200 when the request is authenticated', async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: 'user-1', email: 'admin@eval.com', name: 'Admin', role: 'ADMIN' },
    })

    const res = await scoresGET()

    expect(res.status).toBe(200)
  })
})
