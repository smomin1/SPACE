import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import { authorizeCredentials } from '@/lib/auth-utils'

// Activates module augmentation for next-auth Session/JWT types
import '@/lib/auth.types'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt', maxAge: 24 * 60 * 60 },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null
        return authorizeCredentials(parsed.data.email, parsed.data.password)
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.isAdmin = user.isAdmin
        token.mustChangePassword = user.mustChangePassword
      }
      return token
    },
    async session({ session, token }) {
      // An additive admin grant gives a non-admin base role full Admin powers.
      // Surface that as an elevated effective `role` so every canDo()/proxy
      // check honours it, while keeping the true role in `baseRole` for display.
      const baseRole = token.role
      const elevated =
        token.isAdmin && baseRole !== 'SUPER_ADMIN' && baseRole !== 'ADMIN'
          ? 'ADMIN'
          : baseRole

      session.user.id = token.sub!
      session.user.role = elevated
      session.user.baseRole = baseRole
      session.user.isAdmin = token.isAdmin
      session.user.mustChangePassword = token.mustChangePassword
      return session
    },
  },
})
