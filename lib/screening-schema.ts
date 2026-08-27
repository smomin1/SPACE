import { z } from 'zod'
import { ScreeningHardFail } from '@prisma/client'

export const screeningQuestionBaseSchema = z.object({
  requirementSetId: z.string().min(1, 'Requirement set is required'),
  num: z.number().int('Number must be a whole number').min(1, 'Number must be 1 or greater'),
  category: z
    .string()
    .min(1, 'Category is required')
    .max(100, 'Category must be 100 characters or fewer'),
  question: z
    .string()
    .min(1, 'Question is required')
    .max(1000, 'Question must be 1000 characters or fewer'),
  whatToLookFor: z
    .string()
    .max(1000, 'Guidance must be 1000 characters or fewer')
    .nullish()
    .transform((v) => v ?? null),
  hardFail: z
    .nativeEnum(ScreeningHardFail, { message: 'Invalid hard-fail rule' })
    .nullish()
    .transform((v) => v ?? null),
})

export type ScreeningQuestionFormValues = z.infer<typeof screeningQuestionBaseSchema>
