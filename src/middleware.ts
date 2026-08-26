import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/expenses',
  '/savings',
  '/calendar',
  '/simulator',
  '/import',
  '/goals',
  '/reports',
  '/ai',
  '/settings',
  '/calculator',
  '/commitments',
  '/onboarding',
  '/pricing',
]

// Auth routes that should redirect to dashboard if already logged in
const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Get the session token from cookies
  const sessionToken = request.cookies.get('lifeos-token')?.value
  
  // Check if the user is trying to access a protected route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  // Check if the user is trying to access an auth route
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
  
  // If accessing a protected route without a session token, redirect to login
  if (isProtectedRoute && !sessionToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  // If accessing an auth route with a session token, redirect to dashboard
  if (isAuthRoute && sessionToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except static files and api
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
