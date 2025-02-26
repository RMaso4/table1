// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';

export async function POST() {
  console.log('Logout API called');
  
  // Create a new response
  const response = NextResponse.json({ success: true });
  
  // Clear all auth-related cookies
  const cookiesToClear = [
    'token',
    'next-auth.session-token',
    'next-auth.csrf-token',
    'next-auth.callback-url',
    '__Secure-next-auth.session-token',
    '__Secure-next-auth.csrf-token'
  ];
  
  cookiesToClear.forEach(cookieName => {
    response.cookies.set(cookieName, '', {
      httpOnly: true,
      expires: new Date(0),
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
  });
  
  // Add the logout flow header to help the middleware
  response.headers.set('x-logout-flow', 'true');
  
  console.log('All auth cookies cleared');
  return response;
}