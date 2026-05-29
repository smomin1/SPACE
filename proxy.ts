import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { canAccess } from '@/lib/permissions'

// Routes accessible without authentication
const PUBLIC_PATHS = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/access-request',
  '/setup',
]

export const proxy = auth((request) => {
  const session = request.auth
  const { pathname } = request.nextUrl

  // Allow NextAuth's own API routes unconditionally
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Allow public API endpoints (password reset, access requests)
  if (
    pathname.startsWith('/api/setup') ||
    pathname.startsWith('/api/auth/forgot-password') ||
    pathname.startsWith('/api/auth/reset-password') ||
    pathname.startsWith('/api/access-requests')
  ) {
    return NextResponse.next()
  }

  // Public pages: redirect already-authenticated users to dashboard
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    if (session?.user && !session.user.mustChangePassword) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // All other routes require a valid session
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Force users with a temporary password to change it before doing anything else
  if (session.user.mustChangePassword && !pathname.startsWith('/change-password') && !pathname.startsWith('/api/auth/change-password')) {
    return NextResponse.redirect(new URL('/change-password', request.url))
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
