import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { canAccess } from '@/lib/permissions'

export const proxy = auth((request) => {
  const session = request.auth
  const { pathname } = request.nextUrl

  // Allow NextAuth's own API routes unconditionally
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Redirect authenticated users away from the login page
  if (pathname.startsWith('/login')) {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // All other routes require a valid session
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { role } = session.user

  if (pathname.startsWith('/admin') && !canAccess(role, 'admin')) {
    return NextResponse.redirect(new URL('/forbidden', request.url))
  }

  if (pathname.startsWith('/evaluate') && !canAccess(role, 'evaluate')) {
    return NextResponse.redirect(new URL('/forbidden', request.url))
  }

  return NextResponse.next()
})

export const config = {
  // Run on all routes except static files and Next.js internals
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico)$).*)'],
}
