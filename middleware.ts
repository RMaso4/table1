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

  // Simply redirect root to dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Let the app handle authentication internally
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};