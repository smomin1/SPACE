import { z } from 'zod'
import { EvaluatorType, WeightLevel } from '@prisma/client'

export const requirementBaseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or fewer'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(2000, 'Description must be 2000 characters or fewer'),
  evaluatorType: z.nativeEnum(EvaluatorType, {
    message: 'Evaluator type must be COMPLIANCE, PEDAGOGY, TECHNICAL, or BOTH',
  }),
  weight: z.nativeEnum(WeightLevel, {
    message: 'Weight must be HIGH, MEDIUM, or LOW',
  }),
  isComplianceGate: z.boolean().default(false),
  category: z
    .string()
    .max(100, 'Category must be 100 characters or fewer')
    .nullish()
    .transform((v) => v ?? null),
  order: z.number().int('Order must be a whole number').min(0, 'Order must be 0 or greater').default(0),
})

// Used for XLSX bulk import; handles string/number/boolean cell values from sheet_to_json
export const requirementRowSchema = z.object({
  title: z.string().min(1, 'title is required'),
  description: z.string().min(1, 'description is required'),
  evaluatorType: z
    .string()
    .transform((v) => v.trim().toUpperCase())
    .pipe(
      z.nativeEnum(EvaluatorType, {
        message: 'evaluatorType must be COMPLIANCE, PEDAGOGY, TECHNICAL, or BOTH',
      })
    ),
  weight: z
    .string()
    .transform((v) => v.trim().toUpperCase())
    .pipe(
      z.nativeEnum(WeightLevel, {
        message: 'weight must be HIGH, MEDIUM, or LOW',
      })
    ),
  isComplianceGate: z.union([
    z.boolean(),
    z.string().transform((v) => v.toLowerCase() === 'true' || v === '1'),
    z.number().transform((v) => v === 1),
  ]),
  category: z.string().optional().nullable(),
  order: z
    .union([z.number().int(), z.string().transform((v) => parseInt(v, 10))])
    .default(0),
})

export type RequirementFormValues = z.infer<typeof requirementBaseSchema>
export type RequirementRowValues = z.infer<typeof requirementRowSchema>
