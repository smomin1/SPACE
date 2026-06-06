import type { Role } from '@prisma/client'

declare module 'next-auth' {
  interface User {
    role: Role
    isAdmin: boolean
    mustChangePassword: boolean
  }
  interface Session {
    user: {
      id: string
      email: string
      name: string
      // Effective role used for ALL permission/nav gating. Elevated to 'ADMIN'
      // when the user has an additive admin grant (isAdmin) on top of a non-admin
      // base role, so every canDo() check honours the grant without change.
      role: Role
      // The user's true stored role (e.g. 'PEDAGOGY_EVALUATOR'), for display only.
      baseRole: Role
      // Whether an additive admin grant is in effect.
      isAdmin: boolean
      mustChangePassword: boolean
    }
  }
}

// JWT interface lives in @auth/core/jwt, which next-auth/jwt re-exports
declare module '@auth/core/jwt' {
  interface JWT {
    role: Role
    isAdmin: boolean
    mustChangePassword: boolean
  }
}
