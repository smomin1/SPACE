import { z } from 'zod'

export const requirementSetBaseSchema = z.object({
  key: z
    .string()
    .min(1, 'Key is required')
    .max(50, 'Key must be 50 characters or fewer')
    .regex(/^[a-z0-9_]+$/, 'Key must be lowercase letters, numbers, and underscores only'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or fewer'),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or fewer')
    .nullish()
    .transform((v) => v ?? null),
  order: z.number().int().default(0),
  isActive: z.boolean().default(true),
})

export type RequirementSetFormValues = z.infer<typeof requirementSetBaseSchema>
