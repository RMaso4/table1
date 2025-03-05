// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Skip middleware for these paths
const skipPaths = [
  '/_next',
  '/api',
  '/favicon.ico',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for special paths
  if (skipPaths.some(path => pathname.includes(path))) {
    return NextResponse.next();
  }

  // Skip RSC requests
  if (pathname.includes('?_rsc=') || pathname.includes('_rsc=')) {
    return NextResponse.next();
  }
  
  // Get auth tokens
  const customToken = request.cookies.get('token')?.value;
  const nextAuthToken = request.cookies.get('next-auth.session-token')?.value || 
                        request.cookies.get('__Secure-next-auth.session-token')?.value;
  
  // Check if authenticated with either method
  const isAuthenticated = !!customToken || !!nextAuthToken;
  const isGuestMode = request.cookies.get('guest_mode')?.value === 'true';
  
  // Direct to dashboard for root path
  if (pathname === '/') {
    const url = new URL('/dashboard', request.url);
    return NextResponse.redirect(url);
  }
  
  // Only apply middleware to main pages, not RSC requests
  if (pathname === '/login' && (isAuthenticated || isGuestMode)) {
    // If already authenticated or in guest mode, redirect to dashboard
    const url = new URL('/dashboard', request.url);
    return NextResponse.redirect(url);
  }

  if ((pathname === '/dashboard' || pathname === '/scan' || pathname.startsWith('/dashboard/') || pathname.startsWith('/scan/')) && !isAuthenticated && !isGuestMode) {
    // If not authenticated and not in guest mode, redirect to login
    const url = new URL('/login', request.url);
    return NextResponse.redirect(url);
  }
  
  // For other paths, continue
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all request paths except for the ones we want to exclude
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};