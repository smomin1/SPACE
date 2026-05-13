import { requirementBaseSchema, requirementRowSchema } from '@/lib/requirement-schema'

describe('requirementBaseSchema', () => {
  const valid = {
    title: 'Data Protection',
    description: 'Platform must be GDPR compliant.',
    evaluatorType: 'COMPLIANCE',
    weight: 'HIGH',
    isComplianceGate: true,
    category: 'Compliance',
    order: 1,
  }

  it('accepts a valid full requirement object', () => {
    const result = requirementBaseSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('rejects empty title', () => {
    const result = requirementBaseSchema.safeParse({ ...valid, title: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0])
      expect(paths).toContain('title')
    }
  })

  it('rejects title over 200 characters', () => {
    const result = requirementBaseSchema.safeParse({ ...valid, title: 'x'.repeat(201) })
    expect(result.success).toBe(false)
  })

  it('rejects empty description', () => {
    const result = requirementBaseSchema.safeParse({ ...valid, description: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0])
      expect(paths).toContain('description')
    }
  })

  it('rejects invalid evaluatorType value', () => {
    const result = requirementBaseSchema.safeParse({ ...valid, evaluatorType: 'INVALID' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid weight value', () => {
    const result = requirementBaseSchema.safeParse({ ...valid, weight: 'EXTREME' })
    expect(result.success).toBe(false)
  })

  it('defaults isComplianceGate to false when omitted', () => {
    const { isComplianceGate: _, ...rest } = valid
    const result = requirementBaseSchema.safeParse(rest)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.isComplianceGate).toBe(false)
    }
  })

  it('defaults order to 0 when omitted', () => {
    const { order: _, ...rest } = valid
    const result = requirementBaseSchema.safeParse(rest)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.order).toBe(0)
    }
  })

  it('accepts null category', () => {
    const result = requirementBaseSchema.safeParse({ ...valid, category: null })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.category).toBeNull()
    }
  })

  it('accepts missing category and transforms it to null', () => {
    const { category: _, ...rest } = valid
    const result = requirementBaseSchema.safeParse(rest)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.category).toBeNull()
    }
  })

  it('rejects negative order', () => {
    const result = requirementBaseSchema.safeParse({ ...valid, order: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer order', () => {
    const result = requirementBaseSchema.safeParse({ ...valid, order: 1.5 })
    expect(result.success).toBe(false)
  })
})

describe('requirementRowSchema — XLSX row parsing', () => {
  const valid = {
    title: 'LTI Integration',
    description: 'Supports LTI 1.3.',
    evaluatorType: 'TECHNICAL',
    weight: 'HIGH',
    isComplianceGate: false,
    category: 'Interoperability',
    order: 1,
  }

  it('accepts a valid row with string boolean (isComplianceGate="true")', () => {
    const result = requirementRowSchema.safeParse({ ...valid, isComplianceGate: 'true' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.isComplianceGate).toBe(true)
    }
  })

  it('accepts a valid row with numeric boolean (isComplianceGate=1)', () => {
    const result = requirementRowSchema.safeParse({ ...valid, isComplianceGate: 1 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.isComplianceGate).toBe(true)
    }
  })

  it('accepts a valid row with actual boolean (isComplianceGate=false)', () => {
    const result = requirementRowSchema.safeParse({ ...valid, isComplianceGate: false })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.isComplianceGate).toBe(false)
    }
  })

  it('coerces evaluatorType to uppercase', () => {
    const result = requirementRowSchema.safeParse({ ...valid, evaluatorType: 'technical' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.evaluatorType).toBe('TECHNICAL')
    }
  })

  it('rejects invalid evaluatorType', () => {
    const result = requirementRowSchema.safeParse({ ...valid, evaluatorType: 'UNKNOWN' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid weight', () => {
    const result = requirementRowSchema.safeParse({ ...valid, weight: 'EXTREME' })
    expect(result.success).toBe(false)
  })

  it('coerces string order to number', () => {
    const result = requirementRowSchema.safeParse({ ...valid, order: '3' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.order).toBe(3)
    }
  })

  it('defaults order to 0 when missing', () => {
    const { order: _, ...rest } = valid
    const result = requirementRowSchema.safeParse(rest)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.order).toBe(0)
    }
  })
})
