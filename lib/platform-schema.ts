import { z } from 'zod'
import { LicenceType } from '@prisma/client'

export const platformBaseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  vendor: z.string().min(1, 'Vendor is required'),
  licenceType: z.nativeEnum(LicenceType).optional(),
  trialAvailable: z.boolean(),
})

export type PlatformFormValues = z.infer<typeof platformBaseSchema>
