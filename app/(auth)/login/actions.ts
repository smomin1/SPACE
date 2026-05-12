'use server'

import { signIn } from '@/lib/auth'
import { AuthError } from 'next-auth'
import { z } from 'zod'
import { headers } from 'next/headers'
import { checkRateLimit } from '@/lib/rate-limit'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export async function loginAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const headersList = await headers()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0].trim() ??
    headersList.get('x-real-ip') ??
    '127.0.0.1'

  const { allowed } = checkRateLimit(`login:${ip}`, 5, 60_000)
  if (!allowed) {
    return 'Too many login attempts. Please try again in a minute.'
  }

  const parsed = schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return parsed.error.issues[0].message
  }

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: '/dashboard',
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return 'Invalid email or password.'
    }
    // Re-throw redirect errors so Next.js can process them
    throw error
  }
}
