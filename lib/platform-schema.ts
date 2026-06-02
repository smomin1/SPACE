import { z } from 'zod'
import { LicenceType, EvaluationTrack } from '@prisma/client'

export const platformBaseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  vendor: z.string().min(1, 'Vendor is required'),
  track: z.nativeEnum(EvaluationTrack).default(EvaluationTrack.TOOL),
  licenceType: z.nativeEnum(LicenceType).optional(),
  trialAvailable: z.boolean(),
})

export type PlatformFormValues = z.infer<typeof platformBaseSchema>
