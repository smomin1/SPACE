import { z } from 'zod'
import { CEFRLevel, LearningLevel, Skill, DeploymentMode } from '@prisma/client'

const CEFR_ORDER: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export const contextBaseSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    learningLevels: z
      .array(z.nativeEnum(LearningLevel))
      .min(1, 'Select at least one learning level'),
    cefrMin: z.nativeEnum(CEFRLevel).optional(),
    cefrMax: z.nativeEnum(CEFRLevel).optional(),
    skills: z.array(z.nativeEnum(Skill)).min(1, 'Select at least one skill'),
    deploymentMode: z.nativeEnum(DeploymentMode).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.cefrMin && data.cefrMax) {
      if (CEFR_ORDER.indexOf(data.cefrMin) > CEFR_ORDER.indexOf(data.cefrMax)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'CEFR min must be less than or equal to max',
          path: ['cefrMin'],
        })
      }
    }
  })

export type ContextFormValues = z.infer<typeof contextBaseSchema>
