import type { Role } from '@prisma/client'

declare module 'next-auth' {
  interface User {
    role: Role
    mustChangePassword: boolean
  }
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: Role
      mustChangePassword: boolean
    }
  }
}

// JWT interface lives in @auth/core/jwt, which next-auth/jwt re-exports
declare module '@auth/core/jwt' {
  interface JWT {
    role: Role
    mustChangePassword: boolean
  }
}
